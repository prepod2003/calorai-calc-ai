import { useState, useEffect } from 'react';
import { CloseIcon, SearchIcon, SpinnerIcon } from './ui/Icons';
import { ApiConfig } from '../types';
import { API_PROVIDERS, DEFAULT_PROVIDER_ID } from '../constants/apiProviders';
import { fetchModels } from '../services/aiService';

interface ApiKeyManagerProps {
    config: ApiConfig | null;
    setConfig: (config: ApiConfig | null) => void;
    isOpen: boolean;
    onClose: () => void;
}

const ApiKeyManager = ({ config, setConfig, isOpen, onClose }: ApiKeyManagerProps) => {
    const [currentProviderId, setCurrentProviderId] = useState(DEFAULT_PROVIDER_ID);
    const [tempToken, setTempToken] = useState('');
    const [tempModel, setTempModel] = useState('');
    const [customEndpoint, setCustomEndpoint] = useState('');
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelSearch, setModelSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showCustomEndpoint, setShowCustomEndpoint] = useState(false);

    useEffect(() => {
        if (isOpen && config) {
            setCurrentProviderId(config.currentProviderId);
            const providerConfig = config.providers[config.currentProviderId];
            if (providerConfig) {
                setTempToken(providerConfig.token || '');
                setTempModel(providerConfig.model || '');
                setAvailableModels(providerConfig.models || []);
            }
        } else if (isOpen) {
            setCurrentProviderId(DEFAULT_PROVIDER_ID);
            setTempToken('');
            setTempModel('');
            setAvailableModels([]);
        }
    }, [isOpen, config]);

    const handleProviderChange = (providerId: string) => {
        setCurrentProviderId(providerId);
        setError(null);
        
        if (providerId === 'custom') {
            setShowCustomEndpoint(true);
            setTempToken('');
            setTempModel('');
            setAvailableModels([]);
        } else {
            setShowCustomEndpoint(false);
            setCustomEndpoint('');
            
            if (config?.providers[providerId]) {
                const providerConfig = config.providers[providerId];
                setTempToken(providerConfig.token || '');
                setTempModel(providerConfig.model || '');
                setAvailableModels(providerConfig.models || []);
            } else {
                setTempToken('');
                setTempModel('');
                setAvailableModels([]);
            }
        }
    };

    const handleFetchModels = async () => {
        if (!tempToken.trim()) {
            setError('Введите токен для загрузки списка моделей');
            return;
        }
        
        setIsLoadingModels(true);
        setError(null);
        
        try {
            const tempConfig: ApiConfig = {
                currentProviderId,
                providers: {
                    [currentProviderId]: {
                        token: tempToken,
                        model: tempModel,
                        models: [],
                    },
                },
            };
            
            const models = await fetchModels(tempConfig, currentProviderId);
            setAvailableModels(models);
            setError(null);
        } catch (err) {
            setError(`Ошибка загрузки моделей: ${(err as Error).message}`);
            setAvailableModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const filteredModels = availableModels.filter(m =>
        m.name.toLowerCase().includes(modelSearch.toLowerCase()) || 
        m.id.toLowerCase().includes(modelSearch.toLowerCase())
    );

    const selectedModel = availableModels.find(m => m.id === tempModel);
    const displayModels = selectedModel 
        ? [selectedModel, ...filteredModels.filter(m => m.id !== tempModel)] 
        : filteredModels;

    const handleSave = () => {
        if (!tempToken.trim() || !tempModel.trim()) {
            setError('Введите токен и выберите модель');
            return;
        }
        
        const newConfig: ApiConfig = {
            currentProviderId,
            providers: {
                ...(config?.providers || {}),
                [currentProviderId]: {
                    token: tempToken,
                    model: tempModel,
                    models: availableModels,
                },
            },
        };
        
        localStorage.setItem('api-config', JSON.stringify(newConfig));
        setConfig(newConfig);
        onClose();
    };

    const handleClear = () => {
        localStorage.removeItem('api-config');
        setConfig(null);
        setTempToken('');
        setTempModel('');
        setAvailableModels([]);
        setError(null);
        setCurrentProviderId(DEFAULT_PROVIDER_ID);
    };

    if (!isOpen) {
        return null;
    }

    const currentProvider = API_PROVIDERS.find(p => p.id === currentProviderId);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                <button 
                    onClick={onClose} 
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors" 
                    aria-label="Закрыть"
                >
                    <CloseIcon />
                </button>
                
                <h2 className="text-xl font-bold mb-4">Настройки API</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Провайдер API
                        </label>
                        <select
                            value={currentProviderId}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                            {API_PROVIDERS.map(provider => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.name}
                                </option>
                            ))}
                            <option value="custom">Другой (ввести URL)</option>
                        </select>
                        {currentProvider && (
                            <p className="text-xs text-slate-500 mt-1">
                                {currentProvider.baseUrl}
                            </p>
                        )}
                    </div>

                    {showCustomEndpoint && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Базовый URL API
                            </label>
                            <input
                                type="url"
                                value={customEndpoint}
                                onChange={(e) => setCustomEndpoint(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Токен API
                        </label>
                        <input
                            type="password"
                            value={tempToken}
                            onChange={(e) => setTempToken(e.target.value)}
                            placeholder="Введите ваш API токен..."
                            className="w-full p-2 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Токен сохраняется отдельно для каждого провайдера
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Модель
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={modelSearch}
                                onChange={(e) => setModelSearch(e.target.value)}
                                placeholder="Поиск модели..."
                                className="w-full p-2 pr-10 text-base border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                            />
                            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                        
                        <button
                            onClick={handleFetchModels}
                            disabled={!tempToken.trim() || isLoadingModels}
                            className="mt-2 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition text-sm flex items-center justify-center gap-2"
                        >
                            {isLoadingModels ? <SpinnerIcon /> : null}
                            {availableModels.length > 0 ? 'Обновить список' : 'Загрузить модели'}
                        </button>
                        
                        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                        
                        {availableModels.length > 0 && (
                            <select
                                value={tempModel}
                                onChange={(e) => setTempModel(e.target.value)}
                                className="mt-2 w-full p-2 border border-slate-300 rounded-md bg-white text-base max-h-40 overflow-y-auto"
                            >
                                <option value="">Выберите модель</option>
                                {displayModels.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        
                        {availableModels.length === 0 && tempToken.trim() && !isLoadingModels && (
                            <p className="text-slate-500 text-xs mt-1">
                                Нажмите "Загрузить модели" для получения списка
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!tempToken.trim() || !tempModel.trim() || isLoadingModels}
                            className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition text-base"
                        >
                            Сохранить
                        </button>
                        {config && (
                            <button
                                onClick={handleClear}
                                className="flex-1 text-sm text-red-600 hover:text-red-800 text-center font-semibold py-2 rounded-md hover:bg-red-50 transition"
                            >
                                Очистить всё
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-slate-500">
                        По умолчанию используется OpenRouter. Получите токен на{' '}
                        <a 
                            href="https://openrouter.ai" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline"
                        >
                            openrouter.ai
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyManager;