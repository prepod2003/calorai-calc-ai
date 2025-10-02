import { ApiProvider } from '../types';

export const API_PROVIDERS: ApiProvider[] = [
    {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        requiresAuth: true,
    },
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        requiresAuth: true,
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        requiresAuth: true,
    },
    {
        id: 'google',
        name: 'Google AI',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        requiresAuth: true,
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        requiresAuth: true,
    },
    {
        id: 'together',
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1',
        requiresAuth: true,
    },
    {
        id: 'mistral',
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai/v1',
        requiresAuth: true,
    },
    {
        id: 'polza',
        name: 'Polza AI',
        baseUrl: 'https://api.polza.ai/v1',
        requiresAuth: true,
    },
    {
        id: 'lightai',
        name: 'Light AI',
        baseUrl: 'https://api.lightai.io/v1',
        requiresAuth: true,
    },
];

export const DEFAULT_PROVIDER_ID = 'openrouter';

export const getProviderById = (id: string): ApiProvider | undefined => {
    return API_PROVIDERS.find(p => p.id === id);
};

export const getProviderBaseUrl = (id: string): string => {
    const provider = getProviderById(id);
    return provider?.baseUrl || API_PROVIDERS[0].baseUrl;
};