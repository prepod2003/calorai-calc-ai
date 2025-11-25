import { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Gender, ActivityLevel, Goal, ApiConfig } from '../types';
import { CloseIcon, SpinnerIcon } from './ui/Icons';
import { getActivityLevelLabel, getGoalLabel } from '../utils/userProfile';
import { calculateDailyGoals } from '../services/aiService';

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfileType | null;
    onSave: (profile: UserProfileType) => void;
    config: ApiConfig;
}

const UserProfile = ({ isOpen, onClose, profile, onSave, config }: UserProfileProps) => {
    const [formData, setFormData] = useState<UserProfileType>({
        name: '',
        gender: 'male',
        age: 25,
        weight: 70,
        height: 170,
        activityLevel: 'moderate',
        goal: 'maintain',
    });
    
    const [dailyGoalsForm, setDailyGoalsForm] = useState({
        bmr: '',
        tdee: '',
        targetCalories: '',
        protein: '',
        fat: '',
        carbohydrate: '',
        fiber: '',
    });
    
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (profile) {
            setFormData(profile);
            if (profile.dailyGoals) {
                setDailyGoalsForm({
                    bmr: profile.dailyGoals.bmr.toString(),
                    tdee: profile.dailyGoals.tdee.toString(),
                    targetCalories: profile.dailyGoals.targetCalories.toString(),
                    protein: profile.dailyGoals.protein.toString(),
                    fat: profile.dailyGoals.fat.toString(),
                    carbohydrate: profile.dailyGoals.carbohydrate.toString(),
                    fiber: profile.dailyGoals.fiber.toString(),
                });
            }
        }
    }, [profile]);

    const handleCalculateGoals = async () => {
        setIsCalculating(true);
        setError(null);
        
        console.log('[UserProfile] Starting calculation with formData:', formData);
        console.log('[UserProfile] Config:', { 
            providerId: config.currentProviderId, 
            hasToken: !!config.providers[config.currentProviderId]?.token,
            model: config.providers[config.currentProviderId]?.model 
        });
        
        try {
            const goals = await calculateDailyGoals(formData, config);
            console.log('[UserProfile] Received goals from AI:', goals);
            
            const newGoalsForm = {
                bmr: goals.bmr.toString(),
                tdee: goals.tdee.toString(),
                targetCalories: goals.targetCalories.toString(),
                protein: goals.protein.toString(),
                fat: goals.fat.toString(),
                carbohydrate: goals.carbohydrate.toString(),
                fiber: goals.fiber.toString(),
            };
            
            console.log('[UserProfile] Setting new goals form:', newGoalsForm);
            setDailyGoalsForm(newGoalsForm);
        } catch (err) {
            console.error('[UserProfile] Error during calculation:', err);
            setError((err as Error).message);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSave = () => {
        const updatedProfile: UserProfileType = {
            ...formData,
            dailyGoals: dailyGoalsForm.targetCalories ? {
                bmr: parseFloat(dailyGoalsForm.bmr) || 0,
                tdee: parseFloat(dailyGoalsForm.tdee) || 0,
                targetCalories: parseFloat(dailyGoalsForm.targetCalories) || 0,
                protein: parseFloat(dailyGoalsForm.protein) || 0,
                fat: parseFloat(dailyGoalsForm.fat) || 0,
                carbohydrate: parseFloat(dailyGoalsForm.carbohydrate) || 0,
                fiber: parseFloat(dailyGoalsForm.fiber) || 0,
            } : undefined,
        };
        onSave(updatedProfile);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto overscroll-contain"
            onClick={onClose}
        >
            <div 
                className="glass-panel allow-scroll w-full max-w-4xl max-h-[95vh] bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Мой профиль и цели</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Блок 1: Ваши данные */}
                    <div>
                        <h3 className="text-base sm:text-lg font-bold mb-3 text-gray-900">Ваши данные</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Имя</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Например, Иван"
                                    className="glow-input w-full"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Пол</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                                    className="glow-input w-full"
                                >
                                    <option value="male">Мужской</option>
                                    <option value="female">Женский</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Возраст (лет)</label>
                                <input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                    className="glow-input w-full"
                                    min="1"
                                    max="120"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Вес (кг)</label>
                                <input
                                    type="number"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                    className="glow-input w-full"
                                    min="1"
                                    step="0.1"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Рост (см)</label>
                                <input
                                    type="number"
                                    value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                                    className="glow-input w-full"
                                    min="1"
                                    max="250"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Уровень активности</label>
                                <select
                                    value={formData.activityLevel}
                                    onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
                                    className="glow-input w-full"
                                >
                                    <option value="minimal">{getActivityLevelLabel('minimal')}</option>
                                    <option value="light">{getActivityLevelLabel('light')}</option>
                                    <option value="moderate">{getActivityLevelLabel('moderate')}</option>
                                    <option value="high">{getActivityLevelLabel('high')}</option>
                                    <option value="extreme">{getActivityLevelLabel('extreme')}</option>
                                </select>
                            </div>
                            
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1 text-gray-700">Ваша цель</label>
                                <select
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: e.target.value as Goal })}
                                    className="glow-input w-full"
                                >
                                    <option value="lose">{getGoalLabel('lose')}</option>
                                    <option value="maintain">{getGoalLabel('maintain')}</option>
                                    <option value="gain">{getGoalLabel('gain')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Кнопка расчета */}
                    <div>
                        <button
                            onClick={handleCalculateGoals}
                            disabled={isCalculating}
                            className="mono-button primary-cta w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCalculating ? <SpinnerIcon /> : null}
                            {isCalculating ? 'Расчет...' : 'Рассчитать с помощью AI'}
                        </button>
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
                                <p className="text-red-600 text-sm font-semibold mb-1">Ошибка расчета</p>
                                <p className="text-red-700 text-sm">{error}</p>
                                <p className="text-red-600 text-xs mt-2">
                                    💡 Откройте консоль браузера (F12) для диагностики. 
                                    Проверьте файл ДИАГНОСТИКА_ПРОФИЛЯ.md для инструкций.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Блок 2: Ваши дневные нормы */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Ваши дневные нормы</h3>
                            {!dailyGoalsForm.targetCalories && (
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                    Используйте AI или введите вручную
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Основной обмен (BMR), ккал</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.bmr}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, bmr: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Активный расход (TDEE), ккал</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.tdee}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, tdee: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Цель по калориям, ккал</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.targetCalories}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, targetCalories: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Белки, г</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.protein}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, protein: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Жиры, г</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.fat}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, fat: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Углеводы, г</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.carbohydrate}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, carbohydrate: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Клетчатка, г</label>
                                    <input
                                        type="number"
                                        value={dailyGoalsForm.fiber}
                                        onChange={(e) => setDailyGoalsForm({ ...dailyGoalsForm, fiber: e.target.value })}
                                        className="glow-input w-full"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                            </div>
                    </div>

                    {/* Кнопка сохранения */}
                    <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="mono-button"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            className="mono-button primary-cta"
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
