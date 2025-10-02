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