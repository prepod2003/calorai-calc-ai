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
import { calculateTotals, calculateProgressPercentages } from './utils/calculations';
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
        className={`tab-pill flex-1 flex items-center justify-center gap-2 ${
            isActive ? 'tab-pill-active' : ''
        }`}
    >
        <span className="text-sm sm:text-base">{children}</span>
        {badge > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'}`}>
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

    const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

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

    useEffect(() => {
        if (userProfile?.dailyGoals) {
            setHistory(prev => {
                if (Object.keys(prev).length === 0) return prev;
                
                const needsMigration = Object.values(prev).some(dayData => !dayData.progressPercentages);
                if (!needsMigration) return prev;
                
                const migratedHistory: History = {};
                Object.entries(prev).forEach(([date, dayData]) => {
                    migratedHistory[date] = {
                        ...dayData,
                        progressPercentages: calculateProgressPercentages(
                            dayData.dailyTotals,
                            userProfile.dailyGoals || null
                        ) || undefined
                    };
                });
                return migratedHistory;
            });
        }
    }, [userProfile]);

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
            dayData.progressPercentages = calculateProgressPercentages(
                dayData.dailyTotals,
                userProfile?.dailyGoals || null
            ) || undefined;

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
                newHistory[date].progressPercentages = calculateProgressPercentages(
                    newHistory[date].dailyTotals,
                    userProfile?.dailyGoals || null
                ) || undefined;
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

    const todayEntry = history[todayKey];
    const heroStats = useMemo(() => {
        const targetCalories = userProfile?.dailyGoals?.targetCalories;
        const todayCalories = todayEntry?.dailyTotals?.calories ?? 0;
        const todayMeals = todayEntry ? Object.keys(todayEntry.meals).length : 0;
        return [
            {
                label: 'Сегодня потреблено',
                value: `${Math.round(todayCalories)} ккал`,
                helper: todayMeals > 0 ? `${todayMeals} прием(а) пищи` : 'Добавьте прием пищи',
            },
            {
                label: 'Цель на день',
                value: targetCalories ? `${Math.round(targetCalories)} ккал` : 'Не задана',
                helper: targetCalories ? 'Контролируйте прогресс' : 'Заполните профиль',
            },
            {
                label: 'Блюд в библиотеке',
                value: savedDishes.length.toString(),
                helper: 'Готовые пресеты',
            },
        ];
    }, [todayEntry, userProfile, savedDishes]);

    const currentDishStats = useMemo(() => ([
        { label: 'Калории', value: `${Math.round(memoizedTotals.calories)} ккал` },
        { label: 'Белки', value: `${memoizedTotals.protein.toFixed(1)} г` },
        { label: 'Жиры', value: `${memoizedTotals.fat.toFixed(1)} г` },
        { label: 'Углеводы', value: `${memoizedTotals.carbohydrate.toFixed(1)} г` },
    ]), [memoizedTotals]);

    const isReady = !!config && !!config.providers[config.currentProviderId];

    const handleSaveProfile = (profile: UserProfileType) => {
        saveUserProfile(profile);
        setUserProfile(profile);
    };

    const hasProfile = Boolean(userProfile?.name);

    return (
        <div className="app-shell">
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
            
            <header className="sticky top-0 z-20 px-2 sm:px-4 lg:px-8 py-3">
                <div className="glass-panel px-4 sm:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="floating-badge uppercase tracking-[0.3em] text-[10px] sm:text-xs">Nutrition</p>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 text-gray-900">Калькулятор КБЖУ</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {hasProfile ? `${userProfile?.name}, держим курс на цель.`
                                : 'Настройте профиль, чтобы получить персональные рекомендации.'}
                        </p>
                    </div>
                    {isReady && (
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            <button 
                                onClick={() => setIsProfileModalOpen(true)} 
                                className="mono-button"
                            >
                                Профиль
                            </button>
                            <button 
                                onClick={() => setIsApiModalOpen(true)} 
                                className="mono-button primary-cta"
                            >
                                Модели и токен
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            {isReady ? (
                <main className="px-2 sm:px-4 lg:px-8 pb-10 space-y-6 animate-fade-up">
                    <section className="hero-section relative overflow-hidden">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                            <div className="flex-1">
                                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-medium">Баланс питания</p>
                                <h2 className="text-2xl sm:text-3xl font-semibold mt-2 leading-tight text-gray-900">
                                    {hasProfile ? 'Персональная панель питания' : 'Создайте свой nutritional hub'}
                                </h2>
                                <p className="text-gray-600 mt-2 max-w-2xl text-sm sm:text-base">
                                    Следите за рационом, создавайте блюда и сравнивайте с дневными целями в одном месте.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button 
                                        className="mono-button primary-cta"
                                        onClick={() => setIsProfileModalOpen(true)}
                                    >
                                        Настроить профиль
                                    </button>
                                    <button 
                                        className="mono-button"
                                        onClick={() => setActiveView('history')}
                                    >
                                        Смотреть историю
                                    </button>
                                </div>
                            </div>
                            {dishIngredients.length > 0 && (
                                <div className="glass-panel px-4 py-4 lg:w-96">
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-3">Текущее блюдо</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {currentDishStats.map(stat => (
                                            <div key={stat.label} className="metric-pill text-left">
                                                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                                <p className="text-base font-semibold text-gray-900">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hero-grid">
                            {heroStats.map((stat) => (
                                <div key={stat.label} className="metric-pill">
                                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                    <h3 className="text-xl font-semibold text-gray-900">{stat.value}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{stat.helper}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {isReady && (
                        <div className="glass-panel px-3 sm:px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium hidden sm:block">Навигация</div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
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
                        </div>
                    )}

                    {activeView === 'builder' && (
                        <div className="grid gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-5 space-y-6">
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
                            <div className="lg:col-span-7">
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
                </main>
            ) : (
                <main className="px-2 sm:px-4 lg:px-8 pb-10">
                    <div className="glass-panel px-6 py-8 text-center">
                        <h2 className="text-2xl font-semibold mb-2 text-gray-900">Ожидание конфигурации API</h2>
                        <p className="text-gray-600 mb-4">
                            Подключите токен и модель, чтобы открыть весь функционал.
                        </p>
                        <button 
                            onClick={() => setIsApiModalOpen(true)} 
                            className="mono-button primary-cta"
                        >
                            Настроить сейчас
                        </button>
                    </div>
                </main>
            )}
        </div>
    );
};

export default App;