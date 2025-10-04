import { UserProfile } from '../types';

const STORAGE_KEY = 'user-profile';

export const loadUserProfile = (): UserProfile | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
};

export const saveUserProfile = (profile: UserProfile): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('Error saving user profile:', error);
        throw new Error('Не удалось сохранить профиль');
    }
};

export const getActivityLevelLabel = (level: string): string => {
    const labels: { [key: string]: string } = {
        minimal: 'Минимальная (сидячая работа, нет тренировок)',
        light: 'Легкая (тренировки 1-3 раза в неделю)',
        moderate: 'Средняя (тренировки 3-5 раз в неделю)',
        high: 'Высокая (интенсивные тренировки 6-7 раз в неделю)',
        extreme: 'Очень высокая (физическая работа + интенсивные тренировки)',
    };
    return labels[level] || level;
};

export const getGoalLabel = (goal: string): string => {
    const labels: { [key: string]: string } = {
        lose: 'Снизить вес',
        maintain: 'Поддерживать вес',
        gain: 'Набрать вес',
    };
    return labels[goal] || goal;
};
