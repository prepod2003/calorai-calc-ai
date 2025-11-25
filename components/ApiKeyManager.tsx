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
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="glass-panel p-3 sm:p-6 w-full max-w-lg relative max-h-[95vh] overflow-y-auto space-y-3 sm:space-y-4 bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors" 
                    aria-label="Закрыть"
                >
                    <CloseIcon />
                </button>
                
                <h2 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900">Настройки API</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Провайдер API
                        </label>
                        <select
                            value={currentProviderId}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            className="glow-input w-full"
                        >
                            {API_PROVIDERS.map(provider => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.name}
                                </option>
                            ))}
                            <option value="custom">Другой (ввести URL)</option>
                        </select>
                        {currentProvider && (
                            <p className="text-xs text-gray-500 mt-1">
                                {currentProvider.baseUrl}
                            </p>
                        )}
                    </div>

                    {showCustomEndpoint && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Базовый URL API
                            </label>
                            <input
                                type="url"
                                value={customEndpoint}
                                onChange={(e) => setCustomEndpoint(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="glow-input w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Токен API
                        </label>
                        <input
                            type="password"
                            value={tempToken}
                            onChange={(e) => setTempToken(e.target.value)}
                            placeholder="Введите ваш API токен..."
                            className="glow-input w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Токен сохраняется отдельно для каждого провайдера
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Модель
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={modelSearch}
                                onChange={(e) => setModelSearch(e.target.value)}
                                placeholder="Поиск модели..."
                                className="glow-input w-full pr-10"
                            />
                            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        
                        <button
                            onClick={handleFetchModels}
                            disabled={!tempToken.trim() || isLoadingModels}
                            className="mono-button primary-cta mt-2 w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoadingModels ? <SpinnerIcon /> : null}
                            {availableModels.length > 0 ? 'Обновить список' : 'Загрузить модели'}
                        </button>
                        
                        {error && <p className="text-red-600 text-xs mt-1 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
                        
                        {availableModels.length > 0 && (
                            <select
                                value={tempModel}
                                onChange={(e) => setTempModel(e.target.value)}
                                className="glow-input mt-2 w-full max-h-40"
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
                            <p className="text-gray-500 text-xs mt-1">
                                Нажмите "Загрузить модели" для получения списка
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!tempToken.trim() || !tempModel.trim() || isLoadingModels}
                            className="mono-button primary-cta flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Сохранить
                        </button>
                        {config && (
                            <button
                                onClick={handleClear}
                                className="mono-button flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                            >
                                Очистить всё
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-gray-500">
                        По умолчанию используется OpenRouter. Получите токен на{' '}
                        <a 
                            href="https://openrouter.ai" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-600 hover:text-indigo-700 hover:underline"
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