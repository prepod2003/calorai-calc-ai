import { useState, useEffect, useMemo } from 'react';
import MealAnalyzer from './components/MealAnalyzer';
import IngredientSearch from './components/IngredientSearch';
import DishBuilder from './components/DishBuilder';
import HistoryView from './components/HistoryView';
import ApiKeyManager from './components/ApiKeyManager';
import MyDishes from './components/MyDishes';
import UserProfile from './components/UserProfile';
import { Ingredient, ApiConfig, History, SavedDish, UserProfile as UserProfileType } from './types';
import { DEFAULT_PROVIDER_ID } from './constants/apiProviders';
import { calculateTotals } from './utils/calculations';
import { loadSavedDishes, saveDishToLibrary, updateDishInLibrary, deleteDishFromLibrary } from './utils/savedDishes';
import { loadUserProfile, saveUserProfile } from './utils/userProfile';

const MainTabButton = ({ 
    isActive, 
    onClick, 
    children, 
    badge = 0 
}: { 
    isActive: boolean; 
    onClick: () => void; 
    children: React.ReactNode; 
    badge?: number;
}) => (
    <button 
        onClick={onClick} 
        className={`relative flex-1 py-3 px-1 text-sm sm:text-base font-bold text-center transition-colors ${
            isActive ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
        {children}
        <span className={`absolute bottom-0 left-0 right-0 h-1 transition-transform ${
            isActive ? 'bg-blue-600' : 'bg-transparent'
        }`} />
        {badge > 0 && (
            <span className="absolute top-1 right-2 ml-2 bg-blue-100 text-blue-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {badge}
            </span>
        )}
    </button>
);

const App = () => {
    const [config, setConfig] = useState<ApiConfig | null>(null);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [dishIngredients, setDishIngredients] = useState<Ingredient[]>([]);
    const [history, setHistory] = useState<History>({});
    const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
    const [activeView, setActiveView] = useState<'builder' | 'history' | 'dishes'>('builder');
    const [calculatePer100g, setCalculatePer100g] = useState(false);

    const loadDishes = () => {
        setSavedDishes(loadSavedDishes());
    };

    useEffect(() => {
        loadDishes();
        setUserProfile(loadUserProfile());
        
        const storedConfig = localStorage.getItem('api-config');
        if (storedConfig) {
            try {
                const parsedConfig = JSON.parse(storedConfig);
                // Миграция старой конфигурации к новой структуре
                if (parsedConfig.token && parsedConfig.model) {
                    const migratedConfig: ApiConfig = {
                        currentProviderId: DEFAULT_PROVIDER_ID,
                        providers: {
                            [DEFAULT_PROVIDER_ID]: {
                                token: parsedConfig.token,
                                model: parsedConfig.model,
                                models: parsedConfig.models || [],
                            },
                        },
                    };
                    setConfig(migratedConfig);
                    localStorage.setItem('api-config', JSON.stringify(migratedConfig));
                } else {
                    setConfig(parsedConfig);
                }
            } catch (error) {
                console.error('Error parsing config:', error);
                localStorage.removeItem('api-config');
            }
        }
        
        const storedHistory = localStorage.getItem('meal-history');
        if (storedHistory) {
            try {
                setHistory(JSON.parse(storedHistory));
            } catch (error) {
                console.error('Error parsing history:', error);
                localStorage.removeItem('meal-history');
            }
        }
    }, []);
    
    useEffect(() => {
        if (Object.keys(history).length > 0) {
            localStorage.setItem('meal-history', JSON.stringify(history));
        } else {
            localStorage.removeItem('meal-history');
        }
    }, [history]);

    const handleAddIngredient = (ingredient: Omit<Ingredient, 'weight'>, weight: number = 100) => {
        setDishIngredients(prev => [...prev, { ...ingredient, weight }]);
    };
    
    const handleAnalysisComplete = (analyzedIngredients: any[]) => {
        const newIngredients = analyzedIngredients.map(ing => ({
            id: crypto.randomUUID(),
            name: ing.name,
            weight: Math.round(ing.weight) || 100,
            baseCPFC: {
                calories: ing.calories || 0,
                protein: ing.protein || 0,
                fat: ing.fat || 0,
                carbohydrate: ing.carbohydrate || 0,
                fiber: ing.fiber || 0,
            }
        }));
        setDishIngredients(prev => [...prev, ...newIngredients]);
        setCalculatePer100g(false);
    };
    
    const handleCalculatePer100gChange = (isChecked: boolean) => {
        setCalculatePer100g(isChecked);
        if (isChecked && dishIngredients.length > 0) {
            setDishIngredients(prev => prev.map(item => ({ ...item, weight: 100 })));
        }
    };

    const handleUpdateIngredientWeight = (id: string, weight: number) => {
        setDishIngredients(prev => 
            prev.map(item => item.id === id ? { ...item, weight: isNaN(weight) ? 0 : weight } : item)
        );
    };

    const handleRemoveIngredient = (id: string) => {
        setDishIngredients(prev => prev.filter(item => item.id !== id));
    };
    
    const handleClearDish = () => setDishIngredients([]);

    const handleSaveDish = (mealType: string, ingredients: Ingredient[]) => {
        const today = new Date().toISOString().split('T')[0];
        const mealId = crypto.randomUUID();

        setHistory(prev => {
            const newHistory: History = JSON.parse(JSON.stringify(prev));
            const dayData = newHistory[today] || { 
                meals: {}, 
                dailyTotals: { calories: 0, protein: 0, fat: 0, carbohydrate: 0, fiber: 0, weight: 0 } 
            };
            
            dayData.meals[mealId] = { type: mealType, ingredients };

            const allMealsToday = Object.values(dayData.meals).flatMap((m: any) => m.ingredients);
            dayData.dailyTotals = calculateTotals(allMealsToday);

            newHistory[today] = dayData;
            return newHistory;
        });
        handleClearDish();
    };

    const handleRemoveMeal = (date: string, mealId: string) => {
        setHistory(prev => {
            const newHistory: History = JSON.parse(JSON.stringify(prev));
            if (!newHistory[date]) return newHistory;
            
            delete newHistory[date].meals[mealId];

            if (Object.keys(newHistory[date].meals).length === 0) {
                delete newHistory[date];
            } else {
                const allMealsToday = Object.values(newHistory[date].meals).flatMap((m: any) => m.ingredients);
                newHistory[date].dailyTotals = calculateTotals(allMealsToday);
            }
            return newHistory;
        });
    };
    
    const handleClearDay = (date: string) => {
        setHistory(prev => {
            const newHistory = { ...prev };
            delete newHistory[date];
            return newHistory;
        });
    };

    const memoizedTotals = useMemo(() => calculateTotals(dishIngredients), [dishIngredients]);

    const isReady = !!config && !!config.providers[config.currentProviderId];

    const handleSaveProfile = (profile: UserProfileType) => {
        saveUserProfile(profile);
        setUserProfile(profile);
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
            <ApiKeyManager
                config={config}
                setConfig={setConfig}
                isOpen={!config || isApiModalOpen}
                onClose={() => setIsApiModalOpen(false)}
            />
            
            {config && (
                <UserProfile
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    profile={userProfile}
                    onSave={handleSaveProfile}
                    config={config}
                />
            )}
            
            <header className="bg-white shadow-md w-full sticky top-0 z-10">
                <div className="px-2 sm:px-4 lg:px-8 py-2 flex justify-between items-center">
                    <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Калькулятор КБЖУ</h1>
                    {isReady && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsProfileModalOpen(true)} 
                                className="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100 transition-colors" 
                                aria-label="Профиль"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-6 w-6" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor" 
                                    strokeWidth={2}
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                                    />
                                </svg>
                            </button>
                            <button 
                                onClick={() => setIsApiModalOpen(true)} 
                                className="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100 transition-colors" 
                                aria-label="Настройки"
                            >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-6 w-6" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth={2}
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                                />
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                                />
                            </svg>
                            </button>
                        </div>
                    )}
                </div>
                {isReady && (
                    <div className="flex border-t border-slate-200">
                        <MainTabButton 
                            isActive={activeView === 'builder'} 
                            onClick={() => setActiveView('builder')} 
                            badge={dishIngredients.length}
                        >
                            Конструктор
                        </MainTabButton>
                        <MainTabButton 
                            isActive={activeView === 'history'} 
                            onClick={() => setActiveView('history')}
                        >
                            История
                        </MainTabButton>
                        <MainTabButton 
                            isActive={activeView === 'dishes'} 
                            onClick={() => setActiveView('dishes')}
                            badge={savedDishes.length}
                        >
                            Мои блюда
                        </MainTabButton>
                    </div>
                )}
            </header>
            
            {isReady ? (
                <main className="w-full mt-2 sm:mt-4 animate-fade-in pb-4">
                    <div className="px-2 sm:px-4 lg:px-8">
                        {activeView === 'builder' && (
                            <div className="grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
                                <div className="space-y-4">
                                    <MealAnalyzer
                                        onAnalysisComplete={handleAnalysisComplete}
                                        config={config}
                                        calculatePer100g={calculatePer100g}
                                        onCalculatePer100gChange={handleCalculatePer100gChange}
                                    />
                                    <IngredientSearch 
                                        onAddIngredient={handleAddIngredient} 
                                        savedDishes={savedDishes}
                                    />
                                </div>
                                <DishBuilder 
                                    ingredients={dishIngredients} 
                                    totals={memoizedTotals} 
                                    onUpdateWeight={handleUpdateIngredientWeight} 
                                    onRemove={handleRemoveIngredient} 
                                    onClear={handleClearDish} 
                                    onSave={handleSaveDish}
                                    onRefreshSavedDishes={loadDishes}
                                />
                            </div>
                        )}
                        {activeView === 'dishes' && (
                            <MyDishes
                                dishes={savedDishes}
                                onAddDish={(dish) => {
                                    saveDishToLibrary({ ...dish, id: crypto.randomUUID() });
                                    loadDishes();
                                }}
                                onUpdateDish={(id, dish) => {
                                    updateDishInLibrary(id, { ...dish, id });
                                    loadDishes();
                                }}
                                onDeleteDish={(id) => {
                                    deleteDishFromLibrary(id);
                                    loadDishes();
                                }}
                            />
                        )}
                        {activeView === 'history' && (
                            <HistoryView 
                                history={history} 
                                onRemoveMeal={handleRemoveMeal} 
                                onClearDay={handleClearDay}
                                config={config}
                                userProfile={userProfile}
                            />
                        )}
                    </div>
                </main>
            ) : (
                <main className="w-full mt-2 text-center">
                    <div className="px-2 sm:px-4 lg:px-8">
                        <div className="bg-white p-6 rounded-lg shadow-md w-full">
                            <h2 className="text-xl font-semibold text-slate-700">
                                Ожидание конфигурации API...
                            </h2>
                            <p className="text-slate-500 mt-2">
                                Пожалуйста, введите токен и выберите модель, чтобы начать.
                            </p>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default App;