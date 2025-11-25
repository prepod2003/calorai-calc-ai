import { useState, useMemo } from 'react';
import { TrashIcon, SparklesIcon, CloseIcon, SpinnerIcon } from './ui/Icons';
import { History, ApiConfig, UserProfile } from '../types';
import { exportToCSV, exportToJSON } from '../utils/exportHistory';
import { formatDate, getMealTypeLabel } from '../utils/calculations';
import { analyzeDailyIntake } from '../services/aiService';

const NutritionLabel = ({ 
    label, 
    value, 
    unit, 
    color, 
    precision = 1,
    percentage,
    goal,
    showPlaceholder = false
}: { 
    label: string; 
    value: number; 
    unit: string; 
    color: string; 
    precision?: number;
    percentage?: number;
    goal?: number;
    showPlaceholder?: boolean;
}) => {
    const isOverLimit = percentage !== undefined && percentage >= 110;
    const baseColor = color.match(/(blue|green|orange|purple|cyan|gray)/)?.[1] || 'slate';
    
    // Статические маппинги цветов для Tailwind
    const colorMap = {
        blue: { bg: 'bg-blue-50', bar: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
        green: { bg: 'bg-emerald-50', bar: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
        orange: { bg: 'bg-orange-50', bar: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200' },
        purple: { bg: 'bg-purple-50', bar: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200' },
        cyan: { bg: 'bg-cyan-50', bar: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-200' },
        gray: { bg: 'bg-gray-50', bar: 'bg-gray-500', text: 'text-gray-700', border: 'border-gray-200' },
        slate: { bg: 'bg-gray-50', bar: 'bg-gray-500', text: 'text-gray-700', border: 'border-gray-200' }
    };
    
    const colors = colorMap[baseColor as keyof typeof colorMap] || colorMap.slate;
    const progressBgColor = isOverLimit ? 'bg-red-100' : 'bg-gray-200';
    const progressBarColor = isOverLimit ? 'bg-red-500' : colors.bar;
    const progressTextColor = isOverLimit ? 'text-white font-bold' : `${colors.text} font-semibold`;
    const displayPercentage = Math.min(percentage || 0, 100);
    
    const hasProgress = percentage !== undefined && goal !== undefined;
    const needsPlaceholder = showPlaceholder && !hasProgress;
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className={`p-1.5 sm:p-2 rounded border ${colors.border} ${colors.bg} flex-1 flex flex-col justify-center`}>
                <p className="text-[10px] sm:text-xs text-gray-600 break-words mb-0.5">{label}</p>
                <p className={`text-sm sm:text-base font-bold break-words ${colors.text}`}>
                    {value.toFixed(precision)} <span className="text-[10px] sm:text-xs font-normal text-gray-500">{unit}</span>
                </p>
            </div>
            {hasProgress && (
                <div className="mt-1 px-0.5">
                    <div className={`relative h-4 sm:h-5 ${progressBgColor} rounded-full overflow-hidden border border-gray-300`}>
                        <div 
                            className={`h-full ${progressBarColor} transition-all duration-300 flex items-center justify-center`}
                            style={{ width: `${displayPercentage}%` }}
                        >
                            <span className={`text-[9px] sm:text-xs ${progressTextColor} font-bold absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap`}>
                                {percentage}%
                            </span>
                        </div>
                    </div>
                    <p className="text-[9px] sm:text-xs text-gray-600 text-center mt-0.5">
                        из {goal.toFixed(precision)} {unit}
                    </p>
                </div>
            )}
            {needsPlaceholder && (
                <div className="mt-1 px-0.5 invisible">
                    <div className="h-4 sm:h-5 rounded-full"></div>
                    <p className="text-[9px] sm:text-xs mt-0.5">&nbsp;</p>
                </div>
            )}
        </div>
    );
};

interface HistoryViewProps {
    history: History;
    onRemoveMeal: (date: string, mealId: string) => void;
    onClearDay: (date: string) => void;
    config: ApiConfig;
    userProfile: UserProfile | null;
}

const HistoryView = ({ history, onRemoveMeal, onClearDay, config, userProfile }: HistoryViewProps) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [analyzingDate, setAnalyzingDate] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Диагностический вывод в консоль
    console.log('🔍 HistoryView диагностика:', {
        'Профиль пользователя': userProfile ? 'Настроен ✅' : 'НЕ настроен ❌',
        'Дневные цели': userProfile?.dailyGoals ? 'Есть ✅' : 'Отсутствуют ❌',
        'Количество дней в истории': Object.keys(history).length
    });

    const filteredDates = useMemo(() => {
        let dates = Object.keys(history);
        
        if (startDate) {
            dates = dates.filter(date => date >= startDate);
        }
        if (endDate) {
            dates = dates.filter(date => date <= endDate);
        }
        
        return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [history, startDate, endDate]);

    const handleExportCSV = () => {
        exportToCSV(history, startDate, endDate);
    };

    const handleExportJSON = () => {
        exportToJSON(history, startDate, endDate);
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    const handleAnalyzeDay = async (date: string) => {
        setAnalyzingDate(date);
        setAnalysisResult(null);
        setAnalysisError(null);
        setIsAnalyzing(true);

        try {
            const dayData = history[date];
            const meals = Object.values(dayData.meals);
            const userGoals = userProfile?.dailyGoals || null;
            
            const analysis = await analyzeDailyIntake(
                formatDate(date),
                dayData.dailyTotals,
                meals,
                userGoals,
                config
            );
            
            setAnalysisResult(analysis);
        } catch (error) {
            setAnalysisError((error as Error).message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCloseAnalysis = () => {
        setAnalyzingDate(null);
        setAnalysisResult(null);
        setAnalysisError(null);
    };

    if (Object.keys(history).length === 0) {
        return (
            <div className="glass-panel p-6 text-center animate-fade-up">
                <h2 className="text-2xl font-semibold text-gray-900">История пуста</h2>
                <p className="text-gray-600 mt-2 text-sm">Сохраненные блюда появятся здесь.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full">
            {/* Панель фильтров и экспорта */}
            <div className="glass-panel p-4 sm:p-6">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold">Фильтры и экспорт</h2>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                        {showFilters ? 'Скрыть' : 'Показать'}
                    </button>
                </div>

                {showFilters && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Дата начала
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="glow-input w-full bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Дата окончания
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="glow-input w-full bg-transparent"
                                />
                            </div>
                        </div>

                        {(startDate || endDate) && (
                            <button
                                onClick={handleClearFilters}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Сбросить фильтры
                            </button>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                            <p className="text-sm font-medium text-gray-900 mb-2">
                                Экспорт данных
                                {(startDate || endDate) && ' (за выбранный период)'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleExportCSV}
                                    className="mono-button flex-1"
                                >
                                    Экспорт в CSV
                                </button>
                                <button
                                    onClick={handleExportJSON}
                                    className="mono-button primary-cta flex-1"
                                >
                                    Экспорт в JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Список дней */}
            {filteredDates.length === 0 ? (
                <div className="glass-panel p-6 text-center">
                    <p className="text-gray-600">Нет данных за выбранный период</p>
                </div>
            ) : (
                filteredDates.map(date => {
                    const dayData = history[date];
                    const totals = dayData.dailyTotals;
                    const progress = dayData.progressPercentages;
                    const goals = userProfile?.dailyGoals;
                    
                    // Диагностика для каждого дня
                    console.log(`📅 День ${date}:`, {
                        'Есть progressPercentages': progress ? 'Да ✅' : 'НЕТ ❌',
                        'Есть goals': goals ? 'Да ✅' : 'НЕТ ❌',
                        'Проценты': progress,
                        'Цели': goals
                    });
                    
                    return (
                        <div key={date} className="glass-panel p-2 sm:p-4 space-y-2 sm:space-y-3 animate-fade-up">
                            <div className="flex justify-between items-center gap-2 border-b border-gray-200 pb-2">
                                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                                    {formatDate(date)}
                                </h2>
                                <div className="flex gap-1 sm:gap-2">
                                    <button 
                                        onClick={() => handleAnalyzeDay(date)} 
                                        className="mono-button px-2 sm:px-3 py-1 text-xs sm:text-sm flex items-center gap-1"
                                        title="Анализ рациона с помощью AI"
                                    >
                                        <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">AI</span>
                                    </button>
                                    <button 
                                        onClick={() => onClearDay(date)} 
                                        className="text-red-500 hover:text-red-600 text-xs sm:text-sm font-semibold px-1"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 items-stretch">
                                <NutritionLabel 
                                    label="Калории" 
                                    value={totals.calories} 
                                    unit="ккал" 
                                    color="bg-blue-100 text-blue-800" 
                                    precision={0} 
                                    percentage={progress?.calories}
                                    goal={goals?.targetCalories}
                                />
                                <NutritionLabel 
                                    label="Белки" 
                                    value={totals.protein} 
                                    unit="г" 
                                    color="bg-green-100 text-green-800" 
                                    percentage={progress?.protein}
                                    goal={goals?.protein}
                                />
                                <NutritionLabel 
                                    label="Жиры" 
                                    value={totals.fat} 
                                    unit="г" 
                                    color="bg-orange-100 text-orange-800" 
                                    percentage={progress?.fat}
                                    goal={goals?.fat}
                                />
                                <NutritionLabel 
                                    label="Углеводы" 
                                    value={totals.carbohydrate} 
                                    unit="г" 
                                    color="bg-purple-100 text-purple-800" 
                                    percentage={progress?.carbohydrate}
                                    goal={goals?.carbohydrate}
                                />
                                <NutritionLabel 
                                    label="Клетчатка" 
                                    value={totals.fiber} 
                                    unit="г" 
                                    color="bg-cyan-100 text-cyan-800" 
                                    percentage={progress?.fiber}
                                    goal={goals?.fiber}
                                />
                                <NutritionLabel 
                                    label="Общий вес" 
                                    value={totals.weight} 
                                    unit="г" 
                                    color="bg-gray-100 text-gray-800" 
                                    precision={0}
                                    showPlaceholder={!!goals}
                                />
                            </div>
                            
                            <div className="space-y-1.5 sm:space-y-2">
                                {Object.entries(dayData.meals).map(([mealId, meal]: [string, any]) => (
                                    <div key={mealId} className="rounded border border-gray-200 bg-white p-2 sm:p-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-semibold text-sm capitalize flex items-center gap-1.5 text-gray-900">
                                                {getMealTypeLabel(meal.type)}
                                                <span className="chip text-[10px] capitalize">{meal.type}</span>
                                            </h3>
                                            <button 
                                                onClick={() => onRemoveMeal(date, mealId)} 
                                                className="p-0.5 text-gray-400 hover:text-red-600"
                                            >
                                                <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                        <ul className="text-xs sm:text-sm space-y-1">
                                            {meal.ingredients.map((ing: any) => (
                                                <li 
                                                    key={ing.id} 
                                                    className="border-t border-gray-200 pt-1 mt-1 first:border-t-0 first:pt-0 first:mt-0"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium capitalize break-words text-gray-900">
                                                            {ing.name}
                                                        </span>
                                                        <span className="font-semibold flex-shrink-0 ml-2 text-gray-700">
                                                            {ing.weight}г
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs text-gray-600 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                        <span>К:{(ing.baseCPFC.calories * ing.weight / 100).toFixed(0)}</span>
                                                        <span>Б:{(ing.baseCPFC.protein * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Ж:{(ing.baseCPFC.fat * ing.weight / 100).toFixed(1)}</span>
                                                        <span>У:{(ing.baseCPFC.carbohydrate * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Кл:{(ing.baseCPFC.fiber * ing.weight / 100).toFixed(1)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Модальное окно с AI-анализом */}
            {analyzingDate && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
                    onClick={handleCloseAnalysis}
                >
                    <div 
                        className="glass-panel w-full max-w-2xl max-h-[95vh] overflow-y-auto bg-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center z-10">
                            <h2 className="text-base sm:text-xl font-bold text-gray-900">
                                Анализ рациона за {formatDate(analyzingDate)}
                            </h2>
                            <button onClick={handleCloseAnalysis} className="text-gray-500 hover:text-gray-700">
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {isAnalyzing && (
                                <div className="flex items-center justify-center py-8">
                                    <SpinnerIcon className="animate-spin h-8 w-8 text-cyan-400" />
                                    <span className="ml-3 text-gray-600">Анализирую ваш рацион...</span>
                                </div>
                            )}

                            {analysisError && (
                                <div className="bg-red-500/10 border border-red-400/40 rounded-2xl p-4">
                                    <p className="text-red-200 font-semibold mb-2">Ошибка анализа</p>
                                    <p className="text-red-100 text-sm">{analysisError}</p>
                                </div>
                            )}

                            {analysisResult && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                        {analysisResult}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryView;