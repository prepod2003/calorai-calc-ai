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

/**
 * Рассчитывает пищевую ценность на 100г из списка ингредиентов
 */
export const calculatePer100g = (ingredientsList: Ingredient[]) => {
    const totals = calculateTotals(ingredientsList);
    if (totals.weight === 0) {
        return {
            calories: 0,
            protein: 0,
            fat: 0,
            carbohydrate: 0,
            fiber: 0,
        };
    }
    
    const ratio = 100 / totals.weight;
    return {
        calories: Math.round(totals.calories * ratio),
        protein: Number((totals.protein * ratio).toFixed(1)),
        fat: Number((totals.fat * ratio).toFixed(1)),
        carbohydrate: Number((totals.carbohydrate * ratio).toFixed(1)),
        fiber: Number((totals.fiber * ratio).toFixed(1)),
    };
};

/**
 * Рассчитывает проценты выполнения дневных целей
 */
export const calculateProgressPercentages = (
    dailyTotals: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
    },
    dailyGoals: {
        targetCalories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
    } | null
) => {
    if (!dailyGoals) {
        return null;
    }

    return {
        calories: dailyGoals.targetCalories > 0 
            ? Math.round((dailyTotals.calories / dailyGoals.targetCalories) * 100) 
            : 0,
        protein: dailyGoals.protein > 0 
            ? Math.round((dailyTotals.protein / dailyGoals.protein) * 100) 
            : 0,
        fat: dailyGoals.fat > 0 
            ? Math.round((dailyTotals.fat / dailyGoals.fat) * 100) 
            : 0,
        carbohydrate: dailyGoals.carbohydrate > 0 
            ? Math.round((dailyTotals.carbohydrate / dailyGoals.carbohydrate) * 100) 
            : 0,
        fiber: dailyGoals.fiber > 0 
            ? Math.round((dailyTotals.fiber / dailyGoals.fiber) * 100) 
            : 0,
    };
};