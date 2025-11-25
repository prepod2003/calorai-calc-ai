import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ingredient, SavedDish } from '../types';
import { SaveIcon, TrashIcon, BookmarkIcon } from './ui/Icons';
import { calculatePer100g } from '../utils/calculations';
import { saveDishToLibrary } from '../utils/savedDishes';

interface DishBuilderProps {
    ingredients: Ingredient[];
    totals: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrate: number;
        fiber: number;
        weight: number;
    };
    onUpdateWeight: (id: string, weight: number) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onSave: (mealType: string, ingredients: Ingredient[]) => void;
    onRefreshSavedDishes?: () => void;
}

type Accent = 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'slate';

const accentMap: Record<Accent, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    slate: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const NutritionLabel = ({ label, value, unit, color, precision = 1 }: { label: string, value: number, unit: string, color: Accent, precision?: number }) => {
    const accent = accentMap[color];
    return (
        <div className={`rounded-lg border ${accent.border} p-3 ${accent.bg}`}>
            <p className="text-xs text-gray-600 mb-1">{label}</p>
            <p className={`text-lg font-semibold ${accent.text}`}>
                {value.toFixed(precision)} <span className="text-sm text-gray-500">{unit}</span>
            </p>
        </div>
    );
};

const DishBuilder = ({ ingredients, totals, onUpdateWeight, onRemove, onClear, onSave, onRefreshSavedDishes }: DishBuilderProps) => {
    const [mealType, setMealType] = useState('lunch');
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [dishName, setDishName] = useState('');
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSave = () => {
        onSave(mealType, ingredients);
    };

    const handleSaveToLibrary = () => {
        if (ingredients.length === 0) return;
        
        if (ingredients.length === 1) {
            const per100g = calculatePer100g(ingredients);
            const newDish: SavedDish = {
                id: crypto.randomUUID(),
                name: ingredients[0].name,
                per100g,
            };
            try {
                saveDishToLibrary(newDish);
                onRefreshSavedDishes?.();
                setSaveError(null);
            } catch (error) {
                setSaveError((error as Error).message);
            }
        } else {
            setIsNamingModalOpen(true);
            setDishName('');
            setSaveError(null);
        }
    };

    const handleConfirmSaveToLibrary = () => {
        if (!dishName.trim()) {
            setSaveError('Введите название блюда');
            return;
        }
        
        const per100g = calculatePer100g(ingredients);
        const newDish: SavedDish = {
            id: crypto.randomUUID(),
            name: dishName.trim(),
            per100g,
        };
        
        try {
            saveDishToLibrary(newDish);
            onRefreshSavedDishes?.();
            setIsNamingModalOpen(false);
            setDishName('');
            setSaveError(null);
        } catch (error) {
            setSaveError((error as Error).message);
        }
    };

    return (
        <div className="glass-panel p-3 sm:p-4 space-y-3 w-full animate-fade-up">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900">🍳 Текущее блюдо</h2>
                    <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                        {ingredients.length > 0 ? `${ingredients.length} ингредиент(ов)` : 'Добавьте ингредиенты'}
                    </p>
                </div>
                {ingredients.length > 0 && (
                    <button 
                        onClick={onClear} 
                        className="mono-button text-xs px-3 py-1.5"
                    >
                        🗑️ Очистить
                    </button>
                )}
            </div>

            <div className="space-y-1.5 sm:space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto scrollbar-sleek">
                {ingredients.length === 0 ? (
                    <div className="glass-panel p-4 sm:p-6 text-center bg-gray-50">
                        <p className="text-sm text-gray-600">Добавьте ингредиенты из AI-анализатора или справочника.</p>
                    </div>
                ) : (
                    ingredients.map(item => (
                        <div key={item.id} className="rounded border border-gray-200 bg-white p-2 sm:p-3 flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs sm:text-sm capitalize break-words text-gray-900">{item.name}</p>
                                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-gray-600 mt-0.5">
                                        <span>К:{(item.baseCPFC.calories * item.weight / 100).toFixed(0)}</span>
                                        <span>Б:{(item.baseCPFC.protein * item.weight / 100).toFixed(1)}</span>
                                        <span>Ж:{(item.baseCPFC.fat * item.weight / 100).toFixed(1)}</span>
                                        <span>У:{(item.baseCPFC.carbohydrate * item.weight / 100).toFixed(1)}</span>
                                        <span>Кл:{(item.baseCPFC.fiber * item.weight / 100).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1 border border-gray-200">
                                        <input 
                                            type="number" 
                                            value={item.weight} 
                                            onChange={(e) => onUpdateWeight(item.id, parseInt(e.target.value, 10))} 
                                            className="bg-transparent text-center w-12 sm:w-16 focus:outline-none text-sm sm:text-base text-gray-900"
                                            min="0" 
                                        />
                                        <span className="text-gray-600 text-xs">г</span>
                                    </div>
                                    <button 
                                        onClick={() => onRemove(item.id)} 
                                        className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                                        aria-label="Удалить ингредиент"
                                    >
                                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {ingredients.length > 0 && (
                <div className="space-y-3 border-t border-gray-200 pt-3">
                    <div>
                        <h3 className="text-sm sm:text-base font-semibold mb-2 text-gray-900">Итого на блюдо</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                            <NutritionLabel label="Калории" value={totals.calories} unit="ккал" color="blue" precision={0} />
                            <NutritionLabel label="Белки" value={totals.protein} unit="г" color="green" />
                            <NutritionLabel label="Жиры" value={totals.fat} unit="г" color="orange" />
                            <NutritionLabel label="Углеводы" value={totals.carbohydrate} unit="г" color="purple" />
                            <NutritionLabel label="Клетчатка" value={totals.fiber} unit="г" color="cyan" />
                            <NutritionLabel label="Вес" value={totals.weight} unit="г" color="slate" precision={0} />
                        </div>
                    </div>

                    <div className="glass-panel p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Сохранить как</h3>
                        <div className="flex flex-col lg:flex-row gap-2">
                            <select 
                                value={mealType} 
                                onChange={e => setMealType(e.target.value)} 
                                className="glow-input flex-1"
                            >
                                <option value="breakfast">🌅 Завтрак</option>
                                <option value="lunch">☀️ Обед</option>
                                <option value="dinner">🌙 Ужин</option>
                                <option value="snack">🍎 Перекус</option>
                            </select>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                <button 
                                    onClick={handleSaveToLibrary} 
                                    className="mono-button flex-1 flex items-center justify-center gap-2 text-sm py-2.5"
                                    title="Сохранить в справочник"
                                >
                                    <BookmarkIcon /> 📚 В справочник
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    className="mono-button primary-cta flex-1 flex items-center justify-center gap-2 text-sm py-2.5"
                                >
                                    <SaveIcon /> ✅ Внести в день
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isNamingModalOpen && createPortal(
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6"
                    onClick={() => {
                        setIsNamingModalOpen(false);
                        setDishName('');
                        setSaveError(null);
                    }}
                >
                    <div 
                        className="bg-white p-6 sm:p-8 w-full max-w-md space-y-5 rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        style={{ margin: 'auto' }}
                    >
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">📝 Название блюда</h3>
                        <input
                            type="text"
                            value={dishName}
                            onChange={(e) => setDishName(e.target.value)}
                            placeholder="Например, Овощной салат"
                            className="glow-input w-full bg-white text-base py-3"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveToLibrary()}
                        />
                        {saveError && (
                            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{saveError}</p>
                        )}
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => {
                                    setIsNamingModalOpen(false);
                                    setDishName('');
                                    setSaveError(null);
                                }}
                                className="mono-button px-5 py-2.5"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleConfirmSaveToLibrary}
                                className="mono-button primary-cta px-5 py-2.5"
                            >
                                💾 Сохранить
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DishBuilder;