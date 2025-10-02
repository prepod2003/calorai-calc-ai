import { useState, useMemo } from 'react';
import { TrashIcon } from './ui/Icons';
import { History } from '../types';
import { exportToCSV, exportToJSON } from '../utils/exportHistory';
import { formatDate, getMealTypeLabel } from '../utils/calculations';

const NutritionLabel = ({ 
    label, 
    value, 
    unit, 
    color, 
    precision = 1 
}: { 
    label: string; 
    value: number; 
    unit: string; 
    color: string; 
    precision?: number;
}) => (
    <div className={`p-1.5 sm:p-2 lg:p-3 rounded-md text-center w-full ${color}`}>
        <p className="text-xs sm:text-sm font-medium opacity-80 break-words">{label}</p>
        <p className="text-sm sm:text-base font-bold break-words">
            {value.toFixed(precision)} <span className="text-xs font-normal">{unit}</span>
        </p>
    </div>
);

interface HistoryViewProps {
    history: History;
    onRemoveMeal: (date: string, mealId: string) => void;
    onClearDay: (date: string) => void;
}

const HistoryView = ({ history, onRemoveMeal, onClearDay }: HistoryViewProps) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const filteredDates = useMemo(() => {
        let dates = Object.keys(history);
        
        if (startDate) {
            dates = dates.filter(date => date >= startDate);
        }
        if (endDate) {
            dates = dates.filter(date => date <= endDate);
        }
        
        return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [history, startDate, endDate]);

    const handleExportCSV = () => {
        exportToCSV(history, startDate, endDate);
    };

    const handleExportJSON = () => {
        exportToJSON(history, startDate, endDate);
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    if (Object.keys(history).length === 0) {
        return (
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-md w-full text-center">
                <h2 className="text-lg font-semibold text-slate-700">История пуста</h2>
                <p className="text-slate-500 mt-2 text-sm">Сохраненные блюда появятся здесь.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full">
            {/* Панель фильтров и экспорта */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold">Фильтры и экспорт</h2>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                        {showFilters ? 'Скрыть' : 'Показать'}
                    </button>
                </div>

                {showFilters && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Дата начала
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Дата окончания
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {(startDate || endDate) && (
                            <button
                                onClick={handleClearFilters}
                                className="text-sm text-slate-600 hover:text-slate-800 font-semibold"
                            >
                                Сбросить фильтры
                            </button>
                        )}

                        <div className="border-t pt-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                                Экспорт данных
                                {(startDate || endDate) && ' (за выбранный период)'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition text-sm"
                                >
                                    Экспорт в CSV
                                </button>
                                <button
                                    onClick={handleExportJSON}
                                    className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm"
                                >
                                    Экспорт в JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Список дней */}
            {filteredDates.length === 0 ? (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md text-center">
                    <p className="text-slate-500">Нет данных за выбранный период</p>
                </div>
            ) : (
                filteredDates.map(date => {
                    const dayData = history[date];
                    const totals = dayData.dailyTotals;
                    
                    return (
                        <div key={date} className="bg-white p-3 sm:p-4 rounded-lg shadow-md animate-fade-in">
                            <div className="flex justify-between items-center mb-3 border-b pb-3">
                                <h2 className="text-lg sm:text-xl font-bold">
                                    {formatDate(date)}
                                </h2>
                                <button 
                                    onClick={() => onClearDay(date)} 
                                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                >
                                    Очистить день
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <NutritionLabel 
                                    label="Калории" 
                                    value={totals.calories} 
                                    unit="ккал" 
                                    color="bg-blue-100 text-blue-800" 
                                    precision={0} 
                                />
                                <NutritionLabel 
                                    label="Белки" 
                                    value={totals.protein} 
                                    unit="г" 
                                    color="bg-green-100 text-green-800" 
                                />
                                <NutritionLabel 
                                    label="Жиры" 
                                    value={totals.fat} 
                                    unit="г" 
                                    color="bg-orange-100 text-orange-800" 
                                />
                                <NutritionLabel 
                                    label="Углеводы" 
                                    value={totals.carbohydrate} 
                                    unit="г" 
                                    color="bg-purple-100 text-purple-800" 
                                />
                                <NutritionLabel 
                                    label="Клетчатка" 
                                    value={totals.fiber} 
                                    unit="г" 
                                    color="bg-cyan-100 text-cyan-800" 
                                />
                                <NutritionLabel 
                                    label="Общий вес" 
                                    value={totals.weight} 
                                    unit="г" 
                                    color="bg-slate-100 text-slate-800" 
                                    precision={0} 
                                />
                            </div>
                            
                            <div className="space-y-3">
                                {Object.entries(dayData.meals).map(([mealId, meal]: [string, any]) => (
                                    <div key={mealId} className="bg-slate-50 p-2 sm:p-3 rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-base capitalize">
                                                {getMealTypeLabel(meal.type)}
                                            </h3>
                                            <button 
                                                onClick={() => onRemoveMeal(date, mealId)} 
                                                className="p-1 text-slate-400 hover:text-red-600"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <ul className="text-sm space-y-2">
                                            {meal.ingredients.map((ing: any) => (
                                                <li 
                                                    key={ing.id} 
                                                    className="border-t border-slate-200 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold capitalize break-words">
                                                            {ing.name}
                                                        </span>
                                                        <span className="font-semibold flex-shrink-0 ml-2">
                                                            {ing.weight}г
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                        <span>К: {(ing.baseCPFC.calories * ing.weight / 100).toFixed(0)}</span>
                                                        <span>Б: {(ing.baseCPFC.protein * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Ж: {(ing.baseCPFC.fat * ing.weight / 100).toFixed(1)}</span>
                                                        <span>У: {(ing.baseCPFC.carbohydrate * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Кл: {(ing.baseCPFC.fiber * ing.weight / 100).toFixed(1)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default HistoryView;