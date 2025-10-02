import { Ingredient } from '../types';

/**
 * Рассчитывает общие значения КБЖУ для списка ингредиентов
 */
export const calculateTotals = (ingredientsList: Ingredient[]) => {
    return ingredientsList.reduce((totals, item) => {
        const ratio = (item.weight || 0) / 100;
        totals.calories += Math.round((item.baseCPFC.calories || 0) * ratio);
        totals.protein += (item.baseCPFC.protein || 0) * ratio;
        totals.fat += (item.baseCPFC.fat || 0) * ratio;
        totals.carbohydrate += (item.baseCPFC.carbohydrate || 0) * ratio;
        totals.fiber += (item.baseCPFC.fiber || 0) * ratio;
        totals.weight += (item.weight || 0);
        return totals;
    }, { 
        calories: 0, 
        protein: 0, 
        fat: 0, 
        carbohydrate: 0, 
        fiber: 0, 
        weight: 0 
    });
};

/**
 * Рассчитывает КБЖУ для одного ингредиента с учётом веса
 */
export const calculateIngredientNutrition = (ingredient: Ingredient) => {
    const ratio = ingredient.weight / 100;
    return {
        calories: Math.round(ingredient.baseCPFC.calories * ratio),
        protein: Number((ingredient.baseCPFC.protein * ratio).toFixed(1)),
        fat: Number((ingredient.baseCPFC.fat * ratio).toFixed(1)),
        carbohydrate: Number((ingredient.baseCPFC.carbohydrate * ratio).toFixed(1)),
        fiber: Number((ingredient.baseCPFC.fiber * ratio).toFixed(1)),
    };
};

/**
 * Форматирует дату в читаемый формат
 */
export const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
};

/**
 * Получает метку типа приёма пищи на русском
 */
export const getMealTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
        breakfast: 'Завтрак',
        lunch: 'Обед',
        dinner: 'Ужин',
        snack: 'Перекус',
    };
    return labels[type] || type;
};