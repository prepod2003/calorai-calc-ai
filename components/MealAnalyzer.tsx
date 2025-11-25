import { useState, useRef } from 'react';
import { analyzeImageWithAI, analyzeTextWithAI } from '../services/aiService';
import { PhotoIcon, SpinnerIcon } from './ui/Icons';
import { ApiConfig } from '../types';

interface MealAnalyzerProps {
    onAnalysisComplete: (analyzedIngredients: any[]) => void;
    config: ApiConfig;
    calculatePer100g: boolean;
    onCalculatePer100gChange: (isChecked: boolean) => void;
}

const MealAnalyzer = ({ onAnalysisComplete, config, calculatePer100g, onCalculatePer100gChange }: MealAnalyzerProps) => {
    const [text, setText] = useState('');
    const [image, setImage] = useState<{ file: File, previewUrl: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => { 
        setError(null); 
        fileInputRef.current?.click(); 
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { 
            setImage({ file, previewUrl: URL.createObjectURL(file) }); 
        }
    };

    const handleAnalyze = async () => {
        if (isLoading || (!image && !text.trim())) return;
        
        setIsLoading(true);
        setError(null);
        
        let result;
        try {
            if (image) {
                result = await analyzeImageWithAI(image.file, text, config, calculatePer100g);
            } else {
                result = await analyzeTextWithAI(text, config, calculatePer100g);
            }
            
            if (result && Array.isArray(result) && result.length > 0) {
                onAnalysisComplete(result);
                setText('');
                handleClearImage();
            } else {
                setError("Не удалось распознать. Попробуйте уточнить запрос или загрузить другое фото.");
            }
        } catch (err) {
            setError(`Ошибка анализа: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearImage = () => {
        if (image) URL.revokeObjectURL(image.previewUrl);
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="glass-panel p-4 sm:p-5 space-y-4 w-full animate-fade-up">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Анализ блюда</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Опишите блюдо или загрузите фото — AI заполнит КБЖУ.</p>
                </div>
                <span className="chip">AI</span>
            </div>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Например: «Боул с киноа, авокадо и лососем»"
                className="glow-input w-full min-h-[100px] sm:min-h-[120px] resize-none"
                rows={3}
                disabled={isLoading}
            />
            
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${calculatePer100g ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                    <input
                        type="checkbox"
                        id="calculatePer100g"
                        checked={calculatePer100g}
                        onChange={(e) => onCalculatePer100gChange(e.target.checked)}
                        className="sr-only"
                        disabled={isLoading}
                    />
                    <span className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${calculatePer100g ? 'translate-x-5' : ''}`} />
                </div>
                Расчёт на 100 г (игнорировать вес)
            </label>

            {image && (
                <div className="space-y-3 animate-fade-in">
                    <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                        <img 
                            src={image.previewUrl} 
                            alt="Превью блюда" 
                            className="w-full max-h-48 object-cover" 
                        />
                    </div>
                    <button 
                        onClick={handleClearImage} 
                        className="mono-button w-full"
                    >
                        Убрать фото
                    </button>
                </div>
            )}

            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                aria-hidden="true" 
            />
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button 
                    onClick={handleFileSelect} 
                    disabled={isLoading} 
                    className="mono-button w-full sm:w-auto flex items-center justify-center gap-2 border-dashed border-2"
                >
                    <PhotoIcon />
                    <span className="text-sm">{image ? 'Изменить фото' : 'Загрузить фото'}</span>
                </button>
                <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading || (!image && !text.trim())} 
                    className="mono-button primary-cta w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <SpinnerIcon /> : null}
                    <span className="text-sm">Проанализировать</span>
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                </p>
            )}
        </div>
    );
};

export default MealAnalyzer;