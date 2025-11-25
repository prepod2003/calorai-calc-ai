import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircleIcon, SearchIcon } from './ui/Icons';
import { Ingredient, SavedDish } from '../types';
import { searchDishes } from '../utils/savedDishes';

interface IngredientSearchProps {
    onAddIngredient: (ingredient: Omit<Ingredient, 'weight'>, weight?: number) => void;
    savedDishes: SavedDish[];
}

const IngredientSearch = ({ onAddIngredient, savedDishes }: IngredientSearchProps) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SavedDish[]>([]);
    const [selectedDish, setSelectedDish] = useState<SavedDish | null>(null);
    const [portionWeight, setPortionWeight] = useState('');
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

    useEffect(() => {
        if (query.trim()) {
            const results = searchDishes(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [query, savedDishes]);

    const handleSelectDish = (dish: SavedDish) => {
        setSelectedDish(dish);
        setPortionWeight('100');
        setIsWeightModalOpen(true);
    };

    const handleAddWithWeight = () => {
        if (!selectedDish || !portionWeight) return;

        const weight = parseFloat(portionWeight);
        if (isNaN(weight) || weight <= 0) return;

        onAddIngredient({
            id: crypto.randomUUID(),
            name: selectedDish.name,
            baseCPFC: selectedDish.per100g,
        }, weight);

        setQuery('');
        setSearchResults([]);
        setSelectedDish(null);
        setPortionWeight('');
        setIsWeightModalOpen(false);
    };

    return (
        <div className="glass-panel p-3 sm:p-4 space-y-3 w-full animate-fade-up">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">📖 Поиск по справочнику</h2>
                <span className="chip text-[10px]">Мои блюда</span>
            </div>
            <div className="relative w-full">
                <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    placeholder="Начните вводить «Смузи», «Лосось» или любое блюдо..." 
                    className="glow-input w-full min-w-0 pr-10"
                />
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                
                {searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 glass-panel max-h-60 overflow-y-auto scrollbar-sleek p-1 shadow-lg border border-gray-200">
                        {searchResults.map(dish => (
                            <button
                                key={dish.id}
                                onClick={() => handleSelectDish(dish)}
                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                                <h3 className="font-semibold text-sm capitalize text-gray-900">{dish.name}</h3>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                                    <span>К:{dish.per100g.calories}</span>
                                    <span>Б:{dish.per100g.protein}</span>
                                    <span>Ж:{dish.per100g.fat}</span>
                                    <span>У:{dish.per100g.carbohydrate}</span>
                                    <span>Кл:{dish.per100g.fiber}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {query && searchResults.length === 0 && (
                <p className="text-sm text-gray-600">
                    Блюд не найдено. Сохраните блюдо в конструкторе или уточните поисковый запрос.
                </p>
            )}

            {isWeightModalOpen && selectedDish && createPortal(
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6"
                    onClick={() => {
                        setIsWeightModalOpen(false);
                        setSelectedDish(null);
                        setPortionWeight('');
                    }}
                >
                    <div 
                        className="bg-white w-full max-w-md space-y-4 p-5 sm:p-6 rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        style={{ margin: 'auto' }}
                    >
                        <h3 className="text-xl font-bold text-gray-900 text-center">{selectedDish.name}</h3>
                        <p className="text-sm text-gray-600 text-center">Укажите вес порции:</p>
                        
                        <div className="flex items-center gap-3 justify-center">
                            <input
                                type="number"
                                value={portionWeight}
                                onChange={(e) => setPortionWeight(e.target.value)}
                                placeholder="Вес"
                                className="glow-input w-32 text-center text-lg bg-white"
                                autoFocus
                                min="1"
                                step="1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddWithWeight()}
                            />
                            <span className="text-gray-600 font-medium">грамм</span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">КБЖУК для {portionWeight || 0} г:</p>
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                {(['Кал', 'Б', 'Ж', 'У', 'Кл'] as const).map((label, idx) => {
                                    const weightValue = parseFloat(portionWeight) || 0;
                                    const nutrientMap = [
                                        Math.round((selectedDish.per100g.calories * weightValue) / 100),
                                        ((selectedDish.per100g.protein * weightValue) / 100).toFixed(1),
                                        ((selectedDish.per100g.fat * weightValue) / 100).toFixed(1),
                                        ((selectedDish.per100g.carbohydrate * weightValue) / 100).toFixed(1),
                                        ((selectedDish.per100g.fiber * weightValue) / 100).toFixed(1),
                                    ];
                                    return (
                                        <div key={label} className="bg-white rounded-lg p-2 border border-gray-200">
                                            <p className="text-gray-500">{label}</p>
                                            <p className="font-semibold text-base text-gray-900">{nutrientMap[idx]}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => {
                                    setIsWeightModalOpen(false);
                                    setSelectedDish(null);
                                    setPortionWeight('');
                                }}
                                className="mono-button px-5 py-2.5"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddWithWeight}
                                className="mono-button primary-cta flex items-center gap-2 px-5 py-2.5"
                                disabled={!portionWeight || parseFloat(portionWeight) <= 0}
                            >
                                <PlusCircleIcon /> Добавить
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default IngredientSearch;