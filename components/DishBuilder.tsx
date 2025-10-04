import { useState } from 'react';
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

const NutritionLabel = ({ label, value, unit, color, precision = 1 }: { label: string, value: number, unit: string, color: string, precision?: number }) => (
    <div className={`p-1.5 sm:p-2 lg:p-3 rounded-md text-center w-full ${color}`}>
        <p className="text-xs sm:text-sm font-medium opacity-80 break-words">{label}</p>
        <p className="text-sm sm:text-base font-bold break-words">{value.toFixed(precision)} <span className="text-xs font-normal">{unit}</span></p>
    </div>
);

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
        <div className="bg-white p-2 sm:p-3 lg:p-4 rounded-lg shadow-md w-full">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold break-words flex-1 min-w-0">Текущее блюдо</h2>
                {ingredients.length > 0 && <button onClick={onClear} className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-semibold transition-colors flex-shrink-0 ml-2">Очистить</button>}
            </div>
            <div className="space-y-2 mb-2 sm:mb-3 max-h-96 overflow-y-auto">
                {ingredients.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 text-slate-500 bg-slate-50 rounded-lg text-sm w-full"><p>Добавьте ингредиенты</p></div>
                ) : (
                    ingredients.map(item => (
                        <div key={item.id} className="p-2 sm:p-3 bg-slate-50 rounded-md animate-fade-in w-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                                <div className="flex-1 min-w-0 w-full sm:w-auto">
                                    <p className="font-semibold text-sm capitalize break-words">{item.name}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                                        <span>К:{(item.baseCPFC.calories * item.weight / 100).toFixed(0)}</span>
                                        <span>Б:{(item.baseCPFC.protein * item.weight / 100).toFixed(1)}</span>
                                        <span>Ж:{(item.baseCPFC.fat * item.weight / 100).toFixed(1)}</span>
                                        <span>У:{(item.baseCPFC.carbohydrate * item.weight / 100).toFixed(1)}</span>
                                        <span>Кл:{(item.baseCPFC.fiber * item.weight / 100).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <input type="number" value={item.weight} onChange={(e) => onUpdateWeight(item.id, parseInt(e.target.value, 10))} className="w-20 p-1 sm:p-2 border border-slate-300 rounded text-center text-base" min="0" />
                                    <span className="text-slate-500 text-sm">г</span>
                                    <button onClick={() => onRemove(item.id)} className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors ml-1"><TrashIcon /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {ingredients.length > 0 && <div className="border-t pt-2 sm:pt-3 w-full">
                <h3 className="text-lg font-bold mb-2 break-words">Итого на блюдо:</h3>
                <div className="grid grid-cols-3 gap-2 w-full">
                    <NutritionLabel label="Калории" value={totals.calories} unit="ккал" color="bg-blue-100 text-blue-800" precision={0} />
                    <NutritionLabel label="Белки" value={totals.protein} unit="г" color="bg-green-100 text-green-800" />
                    <NutritionLabel label="Жиры" value={totals.fat} unit="г" color="bg-orange-100 text-orange-800" />
                    <NutritionLabel label="Углеводы" value={totals.carbohydrate} unit="г" color="bg-purple-100 text-purple-800" />
                    <NutritionLabel label="Клетчатка" value={totals.fiber} unit="г" color="bg-cyan-100 text-cyan-800" />
                    <NutritionLabel label="Общий вес" value={totals.weight} unit="г" color="bg-slate-100 text-slate-800" precision={0} />
                </div>
                 <div className="mt-4">
                    <h3 className="text-base font-bold mb-2">Сохранить как:</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select value={mealType} onChange={e => setMealType(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-md bg-white text-base">
                            <option value="breakfast">Завтрак</option>
                            <option value="lunch">Обед</option>
                            <option value="dinner">Ужин</option>
                            <option value="snack">Перекус</option>
                        </select>
                        <button onClick={handleSaveToLibrary} className="flex items-center justify-center gap-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition text-base" title="Сохранить в справочник">
                            <BookmarkIcon /> В справочник
                        </button>
                        <button onClick={handleSave} className="flex items-center justify-center gap-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition text-base">
                            <SaveIcon /> Сохранить
                        </button>
                    </div>
                </div>
            </div>}
            
            {isNamingModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Название блюда</h3>
                        <input
                            type="text"
                            value={dishName}
                            onChange={(e) => setDishName(e.target.value)}
                            placeholder="Например, Овощной салат"
                            className="w-full p-2 border border-slate-300 rounded-md mb-4"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveToLibrary()}
                        />
                        {saveError && (
                            <p className="text-red-600 text-sm mb-4">{saveError}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setIsNamingModalOpen(false);
                                    setDishName('');
                                    setSaveError(null);
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleConfirmSaveToLibrary}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DishBuilder;