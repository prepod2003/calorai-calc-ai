import { History, Ingredient } from '../types';
import { getMealTypeLabel } from './calculations';

interface ExportRow {
    date: string;
    mealType: string;
    ingredientName: string;
    weight: number;
    calories: number;
    protein: number;
    fat: number;
    carbohydrate: number;
    fiber: number;
}

const prepareExportData = (history: History, startDate?: string, endDate?: string): ExportRow[] => {
    const rows: ExportRow[] = [];
    
    Object.entries(history).forEach(([date, dayData]) => {
        // Фильтрация по датам
        if (startDate && date < startDate) return;
        if (endDate && date > endDate) return;
        
        Object.entries(dayData.meals).forEach(([_, meal]) => {
            meal.ingredients.forEach((ing: Ingredient) => {
                const ratio = ing.weight / 100;
                rows.push({
                    date,
                    mealType: getMealTypeLabel(meal.type),
                    ingredientName: ing.name,
                    weight: ing.weight,
                    calories: Math.round(ing.baseCPFC.calories * ratio),
                    protein: Number((ing.baseCPFC.protein * ratio).toFixed(1)),
                    fat: Number((ing.baseCPFC.fat * ratio).toFixed(1)),
                    carbohydrate: Number((ing.baseCPFC.carbohydrate * ratio).toFixed(1)),
                    fiber: Number((ing.baseCPFC.fiber * ratio).toFixed(1)),
                });
            });
        });
    });
    
    return rows.sort((a, b) => b.date.localeCompare(a.date));
};

export const exportToCSV = (history: History, startDate?: string, endDate?: string): void => {
    const rows = prepareExportData(history, startDate, endDate);
    
    if (rows.length === 0) {
        alert('Нет данных для экспорта в выбранном периоде');
        return;
    }
    
    const headers = [
        'Дата',
        'Прием пищи',
        'Ингредиент',
        'Вес (г)',
        'Калории',
        'Белки (г)',
        'Жиры (г)',
        'Углеводы (г)',
        'Клетчатка (г)',
    ];
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => [
            row.date,
            `"${row.mealType}"`,
            `"${row.ingredientName}"`,
            row.weight,
            row.calories,
            row.protein,
            row.fat,
            row.carbohydrate,
            row.fiber,
        ].join(','))
    ].join('\n');
    
    // Добавляем BOM для корректного отображения кириллицы в Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateRange = startDate && endDate 
        ? `_${startDate}_${endDate}` 
        : startDate 
            ? `_from_${startDate}` 
            : endDate 
                ? `_to_${endDate}` 
                : '';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `история_КБЖУ${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToJSON = (history: History, startDate?: string, endDate?: string): void => {
    const filteredHistory: History = {};
    
    Object.entries(history).forEach(([date, dayData]) => {
        if (startDate && date < startDate) return;
        if (endDate && date > endDate) return;
        filteredHistory[date] = dayData;
    });
    
    if (Object.keys(filteredHistory).length === 0) {
        alert('Нет данных для экспорта в выбранном периоде');
        return;
    }
    
    const jsonContent = JSON.stringify(filteredHistory, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateRange = startDate && endDate 
        ? `_${startDate}_${endDate}` 
        : startDate 
            ? `_from_${startDate}` 
            : endDate 
                ? `_to_${endDate}` 
                : '';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `история_КБЖУ${dateRange}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};