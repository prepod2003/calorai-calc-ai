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
            
            <header className="px-2 sm:px-4 lg:px-8 py-2 sm:py-3 animate-fade-up stagger-1">
                <div className="glass-panel px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#e07a5f] to-[#d06b4f] flex items-center justify-center shadow-md">
                            <span className="text-white text-lg sm:text-xl">🍽️</span>
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-900">
                                Калькулятор КБЖУ
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                                {hasProfile ? `${userProfile?.name}, отличный день для баланса!` : 'Контроль питания'}
                            </p>
                        </div>
                    </div>
                    {isReady && (
                        <div className="flex gap-1.5 sm:gap-2">
                            <button 
                                onClick={() => setIsProfileModalOpen(true)} 
                                className="mono-button text-xs px-2.5 sm:px-3 py-1.5"
                            >
                                <span className="hidden sm:inline">👤 </span>Профиль
                            </button>
                            <button 
                                onClick={() => setIsApiModalOpen(true)} 
                                className="mono-button primary-cta text-xs px-2.5 sm:px-3 py-1.5"
                            >
                                <span className="hidden sm:inline">⚙️ </span>API
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            {isReady ? (
                <main className="px-2 sm:px-4 lg:px-8 pb-4 sm:pb-10 space-y-3 sm:space-y-6">
                    {/* Hero секция только на десктопе */}
                    <section className="hero-section relative overflow-hidden hidden lg:block animate-fade-up stagger-2">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                            <div className="flex-1">
                                <p className="floating-badge mb-3">✨ Умный контроль питания</p>
                                <h2 className="text-2xl sm:text-3xl font-semibold leading-tight text-gray-900">
                                    {hasProfile ? 'Ваша персональная панель' : 'Создайте свой центр питания'}
                                </h2>
                                <p className="text-gray-600 mt-3 max-w-2xl text-sm sm:text-base leading-relaxed">
                                    Анализируйте рацион, создавайте блюда и достигайте целей в одном месте.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-5">
                                    <button 
                                        className="mono-button primary-cta"
                                        onClick={() => setIsProfileModalOpen(true)}
                                    >
                                        👤 Настроить профиль
                                    </button>
                                    <button 
                                        className="mono-button"
                                        onClick={() => setActiveView('history')}
                                    >
                                        📊 История питания
                                    </button>
                                </div>
                            </div>
                            {dishIngredients.length > 0 && (
                                <div className="glass-panel px-5 py-5 lg:w-96 hover-glow">
                                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">🍳 Текущее блюдо</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {currentDishStats.map(stat => (
                                            <div key={stat.label} className="metric-pill text-left">
                                                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hero-grid">
                            {heroStats.map((stat, idx) => (
                                <div key={stat.label} className={`metric-pill animate-fade-up stagger-${idx + 3}`}>
                                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                    <h3 className="text-xl font-semibold text-gray-900">{stat.value}</h3>
                                    <p className="text-xs text-gray-500 mt-1.5">{stat.helper}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Навигация */}
                    {isReady && (
                        <div className="glass-panel px-2 sm:px-4 py-2 animate-fade-up stagger-2 lg:stagger-3">
                            <div className="flex gap-1.5 sm:gap-2 w-full">
                                <MainTabButton 
                                    isActive={activeView === 'builder'} 
                                    onClick={() => setActiveView('builder')} 
                                    badge={dishIngredients.length}
                                >
                                    🔬 Анализ
                                </MainTabButton>
                                <MainTabButton 
                                    isActive={activeView === 'history'} 
                                    onClick={() => setActiveView('history')}
                                >
                                    📅 История
                                </MainTabButton>
                                <MainTabButton 
                                    isActive={activeView === 'dishes'} 
                                    onClick={() => setActiveView('dishes')}
                                    badge={savedDishes.length}
                                >
                                    📚 Блюда
                                </MainTabButton>
                            </div>
                        </div>
                    )}

                    {activeView === 'builder' && (
                        <div className="grid gap-3 sm:gap-5 lg:grid-cols-12">
                            <div className="lg:col-span-5 space-y-3 sm:space-y-5 animate-slide-left stagger-3 lg:stagger-4">
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
                            <div className="lg:col-span-7 animate-slide-right stagger-4 lg:stagger-5">
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
                <main className="px-2 sm:px-4 lg:px-8 pb-10 flex items-center justify-center min-h-[60vh]">
                    <div className="glass-panel px-8 py-10 text-center max-w-md animate-scale-in">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#e07a5f] to-[#d06b4f] flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🔑</span>
                        </div>
                        <h2 className="text-2xl font-semibold mb-3 text-gray-900">Настройка API</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Подключите токен и выберите модель ИИ, чтобы открыть весь функционал калькулятора.
                        </p>
                        <button 
                            onClick={() => setIsApiModalOpen(true)} 
                            className="mono-button primary-cta px-6 py-2.5"
                        >
                            ⚙️ Настроить сейчас
                        </button>
                    </div>
                </main>
            )}
        </div>
    );
};

export default App;