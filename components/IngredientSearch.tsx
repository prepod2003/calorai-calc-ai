import { useState, useEffect } from 'react';
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
        <div className="bg-white p-2 sm:p-3 lg:p-4 rounded-lg shadow-md w-full">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-2 break-words">Поиск по справочнику</h2>
            <div className="relative w-full">
                <div className="flex w-full">
                    <input 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Начните вводить название блюда..." 
                        className="flex-grow w-full min-w-0 p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition" 
                    />
                    <div className="absolute right-2 top-2 text-slate-400">
                        <SearchIcon />
                    </div>
                </div>
                
                {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map(dish => (
                            <button
                                key={dish.id}
                                onClick={() => handleSelectDish(dish)}
                                className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-slate-200 last:border-b-0"
                            >
                                <h3 className="font-semibold text-sm capitalize">{dish.name}</h3>
                                <div className="flex gap-3 text-xs text-slate-600 mt-1">
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
                <p className="text-slate-500 text-sm mt-2">
                    Блюд не найдено. Добавьте блюдо в справочник или измените запрос.
                </p>
            )}

            {isWeightModalOpen && selectedDish && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">{selectedDish.name}</h3>
                        <p className="text-sm text-slate-600 mb-4">Укажите вес порции:</p>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="number"
                                value={portionWeight}
                                onChange={(e) => setPortionWeight(e.target.value)}
                                placeholder="Вес"
                                className="flex-1 p-2 border border-slate-300 rounded-md text-center text-lg"
                                autoFocus
                                min="1"
                                step="1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddWithWeight()}
                            />
                            <span className="text-slate-600 font-medium">грамм</span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-md mb-4">
                            <p className="text-xs text-slate-500 mb-2">КБЖУК для {portionWeight || 0}г:</p>
                            <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                <div>
                                    <p className="text-slate-500">Кал</p>
                                    <p className="font-bold text-blue-600">
                                        {Math.round((selectedDish.per100g.calories * (parseFloat(portionWeight) || 0)) / 100)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Б</p>
                                    <p className="font-bold text-green-600">
                                        {((selectedDish.per100g.protein * (parseFloat(portionWeight) || 0)) / 100).toFixed(1)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Ж</p>
                                    <p className="font-bold text-orange-600">
                                        {((selectedDish.per100g.fat * (parseFloat(portionWeight) || 0)) / 100).toFixed(1)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">У</p>
                                    <p className="font-bold text-purple-600">
                                        {((selectedDish.per100g.carbohydrate * (parseFloat(portionWeight) || 0)) / 100).toFixed(1)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Кл</p>
                                    <p className="font-bold text-cyan-600">
                                        {((selectedDish.per100g.fiber * (parseFloat(portionWeight) || 0)) / 100).toFixed(1)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setIsWeightModalOpen(false);
                                    setSelectedDish(null);
                                    setPortionWeight('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddWithWeight}
                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                                disabled={!portionWeight || parseFloat(portionWeight) <= 0}
                            >
                                <PlusCircleIcon /> Добавить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientSearch;