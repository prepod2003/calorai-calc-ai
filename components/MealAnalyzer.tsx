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
        <div className="glass-panel p-3 sm:p-4 space-y-3 w-full animate-fade-up">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">🤖 Анализ блюда</h2>
                    <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Опишите блюдо или загрузите фото</p>
                </div>
                <span className="chip text-[10px]">ИИ-помощник</span>
            </div>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Например: «Боул с киноа, авокадо и лососем»"
                className="glow-input w-full min-h-[80px] sm:min-h-[100px] resize-none text-sm"
                rows={3}
                disabled={isLoading}
            />
            
            <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer select-none">
                <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${calculatePer100g ? 'bg-[#e07a5f]' : 'bg-gray-200'}`}>
                    <input
                        type="checkbox"
                        id="calculatePer100g"
                        checked={calculatePer100g}
                        onChange={(e) => onCalculatePer100gChange(e.target.checked)}
                        className="sr-only"
                        disabled={isLoading}
                    />
                    <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-200 shadow-sm ${calculatePer100g ? 'translate-x-5' : ''}`} />
                </div>
                <span>Расчёт на 100 г</span>
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
            
            <div className="flex flex-col sm:flex-row gap-2">
                <button 
                    onClick={handleFileSelect} 
                    disabled={isLoading} 
                    className="mono-button w-full sm:w-auto flex items-center justify-center gap-2 border-dashed border-2 text-sm py-2.5"
                >
                    <PhotoIcon className="w-4 h-4" />
                    <span>{image ? '📷 Изменить фото' : '📷 Загрузить фото'}</span>
                </button>
                <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading || (!image && !text.trim())} 
                    className="mono-button primary-cta w-full sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2.5"
                >
                    {isLoading ? <SpinnerIcon className="w-4 h-4" /> : <span>✨</span>}
                    <span>{isLoading ? 'Анализирую...' : 'Анализировать'}</span>
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