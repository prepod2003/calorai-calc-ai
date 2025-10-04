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
    goal
}: { 
    label: string; 
    value: number; 
    unit: string; 
    color: string; 
    precision?: number;
    percentage?: number;
    goal?: number;
}) => {
    const isOverLimit = percentage !== undefined && percentage >= 110;
    const baseColor = color.match(/(blue|green|orange|purple|cyan)/)?.[1] || 'slate';
    
    // Статические маппинги цветов для Tailwind
    const colorMap = {
        blue: { bg: 'bg-blue-50', bar: 'bg-blue-400', text: 'text-blue-700' },
        green: { bg: 'bg-green-50', bar: 'bg-green-400', text: 'text-green-700' },
        orange: { bg: 'bg-orange-50', bar: 'bg-orange-400', text: 'text-orange-700' },
        purple: { bg: 'bg-purple-50', bar: 'bg-purple-400', text: 'text-purple-700' },
        cyan: { bg: 'bg-cyan-50', bar: 'bg-cyan-400', text: 'text-cyan-700' },
        slate: { bg: 'bg-slate-50', bar: 'bg-slate-400', text: 'text-slate-700' }
    };
    
    const colors = colorMap[baseColor as keyof typeof colorMap] || colorMap.slate;
    const progressBgColor = isOverLimit ? 'bg-red-100' : colors.bg;
    const progressBarColor = isOverLimit ? 'bg-red-500' : colors.bar;
    const progressTextColor = isOverLimit ? 'text-white font-bold' : `${colors.text} font-semibold`;
    const displayPercentage = Math.min(percentage || 0, 100);
    
    return (
        <div className="w-full">
            <div className={`p-1.5 sm:p-2 lg:p-3 rounded-md text-center ${color}`}>
                <p className="text-xs sm:text-sm font-medium opacity-80 break-words">{label}</p>
                <p className="text-sm sm:text-base font-bold break-words">
                    {value.toFixed(precision)} <span className="text-xs font-normal">{unit}</span>
                </p>
            </div>
            {percentage !== undefined && goal !== undefined && (
                <div className="mt-1 px-1">
                    <div className={`relative h-6 ${progressBgColor} rounded-full overflow-hidden`}>
                        <div 
                            className={`h-full ${progressBarColor} transition-all duration-300 flex items-center justify-center`}
                            style={{ width: `${displayPercentage}%` }}
                        >
                            <span className={`text-sm sm:text-base ${progressTextColor} font-bold absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap`}>
                                {percentage}%
                            </span>
                        </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-500 text-center mt-1">
                        из {goal.toFixed(precision)} {unit}
                    </p>
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
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-md w-full text-center">
                <h2 className="text-lg font-semibold text-slate-700">История пуста</h2>
                <p className="text-slate-500 mt-2 text-sm">Сохраненные блюда появятся здесь.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full">
            {/* Панель фильтров и экспорта */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold">Фильтры и экспорт</h2>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                        {showFilters ? 'Скрыть' : 'Показать'}
                    </button>
                </div>

                {showFilters && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Дата начала
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Дата окончания
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {(startDate || endDate) && (
                            <button
                                onClick={handleClearFilters}
                                className="text-sm text-slate-600 hover:text-slate-800 font-semibold"
                            >
                                Сбросить фильтры
                            </button>
                        )}

                        <div className="border-t pt-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                                Экспорт данных
                                {(startDate || endDate) && ' (за выбранный период)'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition text-sm"
                                >
                                    Экспорт в CSV
                                </button>
                                <button
                                    onClick={handleExportJSON}
                                    className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm"
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
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md text-center">
                    <p className="text-slate-500">Нет данных за выбранный период</p>
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
                        <div key={date} className="bg-white p-3 sm:p-4 rounded-lg shadow-md animate-fade-in">
                            <div className="flex justify-between items-center mb-3 border-b pb-3">
                                <h2 className="text-lg sm:text-xl font-bold">
                                    {formatDate(date)}
                                </h2>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAnalyzeDay(date)} 
                                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                        title="Анализ рациона с помощью AI"
                                    >
                                        <SparklesIcon />
                                    </button>
                                    <button 
                                        onClick={() => onClearDay(date)} 
                                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                    >
                                        Очистить день
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mb-4">
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
                                    color="bg-slate-100 text-slate-800" 
                                    precision={0} 
                                />
                            </div>
                            
                            <div className="space-y-3">
                                {Object.entries(dayData.meals).map(([mealId, meal]: [string, any]) => (
                                    <div key={mealId} className="bg-slate-50 p-2 sm:p-3 rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-base capitalize">
                                                {getMealTypeLabel(meal.type)}
                                            </h3>
                                            <button 
                                                onClick={() => onRemoveMeal(date, mealId)} 
                                                className="p-1 text-slate-400 hover:text-red-600"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <ul className="text-sm space-y-2">
                                            {meal.ingredients.map((ing: any) => (
                                                <li 
                                                    key={ing.id} 
                                                    className="border-t border-slate-200 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold capitalize break-words">
                                                            {ing.name}
                                                        </span>
                                                        <span className="font-semibold flex-shrink-0 ml-2">
                                                            {ing.weight}г
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                        <span>К: {(ing.baseCPFC.calories * ing.weight / 100).toFixed(0)}</span>
                                                        <span>Б: {(ing.baseCPFC.protein * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Ж: {(ing.baseCPFC.fat * ing.weight / 100).toFixed(1)}</span>
                                                        <span>У: {(ing.baseCPFC.carbohydrate * ing.weight / 100).toFixed(1)}</span>
                                                        <span>Кл: {(ing.baseCPFC.fiber * ing.weight / 100).toFixed(1)}</span>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                Анализ рациона за {formatDate(analyzingDate)}
                            </h2>
                            <button onClick={handleCloseAnalysis} className="text-slate-500 hover:text-slate-700">
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6">
                            {isAnalyzing && (
                                <div className="flex items-center justify-center py-8">
                                    <SpinnerIcon className="animate-spin h-8 w-8 text-blue-600" />
                                    <span className="ml-3 text-slate-600">Анализирую ваш рацион...</span>
                                </div>
                            )}

                            {analysisError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-600 font-semibold mb-2">Ошибка анализа</p>
                                    <p className="text-red-700 text-sm">{analysisError}</p>
                                </div>
                            )}

                            {analysisResult && (
                                <div className="prose prose-sm max-w-none">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 whitespace-pre-wrap">
                                        {analysisResult}
                                    </div>
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