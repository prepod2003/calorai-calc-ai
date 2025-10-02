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
        <div className="bg-white p-2 sm:p-3 lg:p-4 rounded-lg shadow-md w-full">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-2 break-words">Анализ блюда</h2>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Опишите блюдо для анализа или добавьте подсказку к фото."
                className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 transition resize-none mb-2"
                rows={3}
                disabled={isLoading}
            />
            
            <div className="flex items-center my-2">
                <input
                    type="checkbox"
                    id="calculatePer100g"
                    checked={calculatePer100g}
                    onChange={(e) => onCalculatePer100gChange(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                />
                <label htmlFor="calculatePer100g" className="ml-2 block text-sm text-slate-700">
                    Расчёт на 100 г (игнорировать вес)
                </label>
            </div>

            {image && (
                <div className="space-y-2 animate-fade-in mb-2">
                    <img 
                        src={image.previewUrl} 
                        alt="Превью блюда" 
                        className="w-full max-h-40 object-contain rounded-md border" 
                    />
                    <button 
                        onClick={handleClearImage} 
                        className="w-full bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-md hover:bg-slate-300 transition text-sm"
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
            
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button 
                    onClick={handleFileSelect} 
                    disabled={isLoading} 
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-md transition border-2 border-dashed border-slate-300 disabled:bg-slate-400 text-sm"
                >
                    <PhotoIcon />
                    <span>{image ? 'Изменить фото' : 'Загрузить фото'}</span>
                </button>
                <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading || (!image && !text.trim())} 
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition text-sm"
                >
                    {isLoading ? <SpinnerIcon /> : null}
                    <span>Проанализировать</span>
                </button>
            </div>

            {error && (
                <p className="text-red-600 bg-red-100 p-2 sm:p-3 rounded-lg text-xs sm:text-sm mt-2">
                    {error}
                </p>
            )}
        </div>
    );
};

export default MealAnalyzer;