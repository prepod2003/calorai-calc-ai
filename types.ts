export interface Ingredient {
    id: string;
    name: string;
    weight: number;
    baseCPFC: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
    };
}

export interface ApiProvider {
    id: string;
    name: string;
    baseUrl: string;
    requiresAuth: boolean;
}

export interface ApiConfig {
    currentProviderId: string;
    providers: {
        [providerId: string]: {
            token: string;
            model: string;
            models?: Array<{ id: string; name: string }>;
        };
    };
}

export interface HistoryEntry {
    meals: {
        [mealId: string]: {
            type: string;
            ingredients: Ingredient[];
        };
    };
    dailyTotals: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
        weight: number;
    };
}

export interface History {
    [date: string]: HistoryEntry;
}

export interface SavedDish {
    id: string;
    name: string;
    per100g: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
    };
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'minimal' | 'light' | 'moderate' | 'high' | 'extreme';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
    name: string;
    gender: Gender;
    age: number;
    weight: number;
    height: number;
    activityLevel: ActivityLevel;
    goal: Goal;
    dailyGoals?: {
        bmr: number;
        tdee: number;
        targetCalories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
    };
}