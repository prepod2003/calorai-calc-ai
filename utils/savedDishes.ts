import { SavedDish } from '../types';

const STORAGE_KEY = 'saved-dishes';

export const loadSavedDishes = (): SavedDish[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading saved dishes:', error);
        return [];
    }
};

export const saveDishToLibrary = (dish: SavedDish): void => {
    try {
        const dishes = loadSavedDishes();
        dishes.push(dish);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
    } catch (error) {
        console.error('Error saving dish:', error);
        throw new Error('Не удалось сохранить блюдо');
    }
};

export const updateDishInLibrary = (id: string, updatedDish: SavedDish): void => {
    try {
        const dishes = loadSavedDishes();
        const index = dishes.findIndex(d => d.id === id);
        if (index === -1) throw new Error('Блюдо не найдено');
        dishes[index] = updatedDish;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
    } catch (error) {
        console.error('Error updating dish:', error);
        throw new Error('Не удалось обновить блюдо');
    }
};

export const deleteDishFromLibrary = (id: string): void => {
    try {
        const dishes = loadSavedDishes();
        const filtered = dishes.filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error deleting dish:', error);
        throw new Error('Не удалось удалить блюдо');
    }
};

export const searchDishes = (query: string): SavedDish[] => {
    const dishes = loadSavedDishes();
    if (!query.trim()) return dishes;
    
    const lowerQuery = query.toLowerCase();
    return dishes.filter(dish => 
        dish.name.toLowerCase().includes(lowerQuery)
    );
};
