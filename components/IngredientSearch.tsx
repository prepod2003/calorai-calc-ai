import { useState, useCallback } from 'react';
import { fetchIngredientData } from '../services/aiService';
import { PlusCircleIcon, SearchIcon, SpinnerIcon } from './ui/Icons';
import { Ingredient, ApiConfig } from '../types';

interface IngredientSearchProps {
    onAddIngredient: (ingredient: Omit<Ingredient, 'weight'>) => void;
    config: ApiConfig;
}

const IngredientSearch = ({ onAddIngredient, config }: IngredientSearchProps) => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<{ name: string; cpfc: any } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await fetchIngredientData(query, config);

            if (data) {
                setResult({ name: query, cpfc: data });
            } else {
                setError(`Не удалось найти данные для "${query}". Попробуйте другой запрос.`);
            }
        } catch (err) {
            setError(`Ошибка поиска: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [query, config]);

    const handleAdd = () => {
        if (result) {
            onAddIngredient({
                id: crypto.randomUUID(),
                name: result.name,
                baseCPFC: result.cpfc,
            });
            setQuery('');
            setResult(null);
        }
    };

    return (
        <div className="bg-white p-2 sm:p-3 lg:p-4 rounded-lg shadow-md w-full">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-2 break-words">Ручной поиск</h2>
            <form onSubmit={handleSearch} className="w-full">
                <div className="flex w-full">
                    <input 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Например, куриная грудка" 
                        className="flex-grow w-full min-w-0 p-2 text-base border border-r-0 border-slate-300 rounded-l-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition focus:z-10" 
                        disabled={isLoading} 
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white p-2 rounded-r-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors flex items-center justify-center w-10 sm:w-12 flex-shrink-0" 
                        disabled={isLoading || !query.trim()}
                    >
                        {isLoading ? <SpinnerIcon /> : <SearchIcon />}
                    </button>
                </div>
            </form>
            <div className="mt-2 sm:mt-3">
                {error && (
                    <p className="text-red-600 bg-red-100 p-2 sm:p-3 rounded-lg text-xs sm:text-sm">
                        {error}
                    </p>
                )}
                {result && (
                    <div className="bg-slate-50 p-2 sm:p-3 lg:p-4 rounded-lg border border-slate-200 animate-fade-in w-full">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm sm:text-base lg:text-lg capitalize break-words">
                                    {result.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500">КБЖУК на 100г:</p>
                            </div>
                            <button 
                                onClick={handleAdd} 
                                className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors text-xs sm:text-sm lg:text-base self-start sm:self-auto flex-shrink-0"
                            >
                                <PlusCircleIcon />Добавить
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center w-full">
                            <div className="bg-white p-1 sm:p-1.5 lg:p-2 rounded">
                                <p className="text-slate-500 text-xs">Кал</p>
                                <p className="font-bold text-blue-600 text-sm break-words">
                                    {result.cpfc.calories.toFixed(0)}
                                </p>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 lg:p-2 rounded">
                                <p className="text-slate-500 text-xs">Б</p>
                                <p className="font-bold text-green-600 text-sm break-words">
                                    {result.cpfc.protein.toFixed(1)}
                                </p>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 lg:p-2 rounded">
                                <p className="text-slate-500 text-xs">Ж</p>
                                <p className="font-bold text-orange-600 text-sm break-words">
                                    {result.cpfc.fat.toFixed(1)}
                                </p>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 lg:p-2 rounded">
                                <p className="text-slate-500 text-xs">У</p>
                                <p className="font-bold text-purple-600 text-sm break-words">
                                    {result.cpfc.carbohydrate.toFixed(1)}
                                </p>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 lg:p-2 rounded">
                                <p className="text-slate-500 text-xs">Кл</p>
                                <p className="font-bold text-cyan-600 text-sm break-words">
                                    {result.cpfc.fiber.toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IngredientSearch;