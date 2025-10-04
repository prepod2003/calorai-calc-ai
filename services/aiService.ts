import { ApiConfig } from '../types';
import { getProviderBaseUrl } from '../constants/apiProviders';

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const parseNutrientValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const parseIngredients = (data: any): any[] | null => {
    if (!Array.isArray(data)) return null;

    const parsedData = data.map(item => {
        if (typeof item !== 'object' || item === null || !item.name) return null;

        return {
            ...item,
            calories: parseNutrientValue(item.calories),
            protein: parseNutrientValue(item.protein),
            fat: parseNutrientValue(item.fat),
            carbohydrate: parseNutrientValue(item.carbohydrate),
            fiber: parseNutrientValue(item.fiber),
            weight: parseNutrientValue(item.weight) || 100,
        };
    }).filter(item => item !== null);

    return parsedData.length > 0 ? parsedData : null;
}

export const getCurrentProviderConfig = (config: ApiConfig) => {
    const providerId = config.currentProviderId;
    const providerConfig = config.providers[providerId];
    const baseUrl = getProviderBaseUrl(providerId);
    
    return {
        token: providerConfig?.token || '',
        model: providerConfig?.model || '',
        baseUrl,
        models: providerConfig?.models || [],
    };
};

export const fetchModels = async (config: ApiConfig, providerId?: string): Promise<{ id: string; name: string }[]> => {
    try {
        const targetProviderId = providerId || config.currentProviderId;
        const providerConfig = config.providers[targetProviderId];
        const baseUrl = getProviderBaseUrl(targetProviderId);
        
        if (!providerConfig?.token) {
            throw new Error('Токен не найден для выбранного провайдера');
        }

        const response = await fetch(`${baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${providerConfig.token}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Nutrition Facts Calculator',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data?.map((m: any) => ({ id: m.id, name: m.name || m.id })) || [];
    } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
    }
};

const callAI = async (config: ApiConfig, messages: any[], isJson = true, maxTokens = 1024): Promise<any> => {
    const { token, model, baseUrl } = getCurrentProviderConfig(config);
    
    if (!token || !model) {
        throw new Error('Токен или модель не настроены');
    }

    const body = {
        model,
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
        ...(isJson && { response_format: { type: "json_object" } }),
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Nutrition Facts Calculator',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (isJson) {
        console.log('[AI Response] Raw content:', content);
        try {
            return JSON.parse(content);
        } catch (e) {
            console.warn('[AI Response] Failed to parse as JSON, trying to extract JSON from text');
            const jsonMatch = content.match(/\{[\s\S]*\}/);  
            if (jsonMatch) {
                console.log('[AI Response] Extracted JSON:', jsonMatch[0]);
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Не удалось извлечь JSON из ответа AI');
        }
    }
    return content;
};

export const fetchIngredientData = async (ingredientName: string, config: ApiConfig) => {
    const { token, model } = getCurrentProviderConfig(config);
    if (!token || !model) return null;
    
    try {
        const prompt = `Предоставь точное КБЖУК (калории, белки, жиры, углеводы, клетчатка) на 100 грамм для продукта '${ingredientName}'.
Ответ дай только в формате JSON. В значениях должны быть только цифры.

Пример для запроса "яблоко":
{
  "calories": 52,
  "protein": 0.3,
  "fat": 0.2,
  "carbohydrate": 14,
  "fiber": 2.4
}`;
        const messages = [{ role: "user", content: prompt }];
        const data = await callAI(config, messages, true);

        if (typeof data !== 'object' || data === null) return null;

        const parsedData = {
            calories: parseNutrientValue(data.calories),
            protein: parseNutrientValue(data.protein),
            fat: parseNutrientValue(data.fat),
            carbohydrate: parseNutrientValue(data.carbohydrate),
            fiber: parseNutrientValue(data.fiber),
        };
        
        // Возвращаем данные, даже если некоторые поля нулевые, но хотя бы калории или белки распознаны
        if (parsedData.calories > 0 || parsedData.protein > 0) {
            return parsedData;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching data for ${ingredientName}:`, error);
        return null;
    }
};

export const analyzeTextWithAI = async (text: string, config: ApiConfig, calculatePer100g = false) => {
    const { token, model } = getCurrentProviderConfig(config);
    if (!token || !model || !text) return null;
    
    try {
        let weightInstruction = `Определи вес каждого ингредиента в граммах, следуя правилам:
1. Если в тексте указан ОБЩИЙ вес блюда (например, "гуляш 200г"), распредели этот общий вес пропорционально между всеми определенными ингредиентами. Сумма весов всех ингредиентов должна быть равна указанному общему весу.
2. Если в тексте указаны КОНКРЕТНЫЕ веса для каждого ингредиента (например, "картофель 80г, мясо 70г"), используй именно эти веса.
3. Если вес не указан ни в каком виде, оцени вес каждого ингредиента самостоятельно.`;

        if (calculatePer100g) {
            weightInstruction = `Для КАЖДОГО определенного ингредиента установи вес РОВНО 100 грамм. Игнорируй любые упоминания веса в тексте. В поле 'weight' для каждого ингредиента должно быть число 100.`;
        }

        const prompt = `Проанализируй этот текст с описанием блюда: "${text}".
Определи все ингредиенты и для каждого предоставь КБЖУК (калории, белки, жиры, углеводы, клетчатка) на 100 грамм.
${weightInstruction}
Ответ дай только в формате JSON в виде массива объектов. Важно: название каждого ингредиента в поле 'name' должно быть на русском языке.

Пример для запроса "салат с курицей 150г":
[
  {
    "name": "куриное филе",
    "calories": 165,
    "protein": 31,
    "fat": 3.6,
    "carbohydrate": 0,
    "fiber": 0,
    "weight": 80
  },
  {
    "name": "листья салата",
    "calories": 15,
    "protein": 1.4,
    "fat": 0.2,
    "carbohydrate": 2.9,
    "fiber": 1.3,
    "weight": 70
  }
]`;
        
        const messages = [{ role: "user", content: prompt }];
        const result = await callAI(config, messages, true);
        return parseIngredients(result);
    } catch (error) {
        console.error("Error analyzing text:", error);
        return null;
    }
};

export const analyzeImageWithAI = async (imageFile: File, userHint: string, config: ApiConfig, calculatePer100g = false) => {
    const { token, model } = getCurrentProviderConfig(config);
    if (!token || !model) return null;
    
    try {
        const base64Data = await fileToBase64(imageFile);
        
        let promptText = `Проанализируй это изображение блюда и определи все ингредиенты. Для каждого ингредиента предоставь КБЖУК (калории, белки, жиры, углеводы, клетчатка) на 100 грамм.`;
        
        if (calculatePer100g) {
            promptText += `\n\nДля КАЖДОГО определенного ингредиента установи вес РОВНО 100 грамм. Игнорируй любые упоминания веса в подсказке пользователя. В поле 'weight' для каждого ингредиента должно быть число 100.`;
        } else if (userHint && userHint.trim()) {
            promptText += `\n\nПользователь предоставил следующую подсказку: "${userHint.trim()}".`;
            promptText += `\n\nИспользуй подсказку для определения веса каждого ингредиента в граммах, следуя этим правилам:
1. Если в подсказке указан ОБЩИЙ вес блюда (например, "гуляш 200г"), распредели этот общий вес пропорционально между всеми ингредиентами, которые ты видишь на фото. Сумма весов всех ингредиентов должна быть равна указанному общему весу.
2. Если в подсказке указаны КОНКРЕТНЫЕ веса для каждого ингредиента (например, "картофель 80г, мясо 70г"), используй именно эти веса.
3. Если в подсказке вес не указан, оцени вес каждого ингредиента на фото самостоятельно.`;
        } else {
            promptText += `\n\nОцени вес каждого ингредиента в граммах самостоятельно, исходя из изображения.`;
        }

        promptText += `\n\nОтвет дай только в формате JSON в виде массива объектов. Важно: название каждого ингредиента в поле 'name' должно быть на русском языке.

Пример ответа:
[
  {
    "name": "яичница",
    "calories": 155,
    "protein": 13,
    "fat": 11,
    "carbohydrate": 1.1,
    "fiber": 0,
    "weight": 120
  },
  {
    "name": "помидор",
    "calories": 18,
    "protein": 0.9,
    "fat": 0.2,
    "carbohydrate": 3.9,
    "fiber": 1.2,
    "weight": 50
  }
]`;
        
        const messages = [
            { role: "user", content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: `data:${imageFile.type};base64,${base64Data}` } }
            ] }
        ];
        const result = await callAI(config, messages, true);
        return parseIngredients(result);
    } catch (error) {
        console.error("Error analyzing image:", error);
        return null;
    }
};

export const calculateDailyGoals = async (profile: any, config: ApiConfig) => {
    const { token, model } = getCurrentProviderConfig(config);
    if (!token || !model) {
        throw new Error('Токен или модель не настроены');
    }
    
    try {
        const genderRu = profile.gender === 'male' ? 'мужской' : 'женский';
        const activityLabels: { [key: string]: string } = {
            minimal: 'минимальная (сидячая работа, нет тренировок)',
            light: 'легкая (тренировки 1-3 раза в неделю)',
            moderate: 'средняя (тренировки 3-5 раз в неделю)',
            high: 'высокая (интенсивные тренировки 6-7 раз в неделю)',
            extreme: 'очень высокая (физическая работа + интенсивные тренировки)',
        };
        const goalLabels: { [key: string]: string } = {
            lose: 'снизить вес',
            maintain: 'поддерживать вес',
            gain: 'набрать вес',
        };
        
        const prompt = `Рассчитай дневные нормы питания для человека со следующими данными:
- Пол: ${genderRu}
- Возраст: ${profile.age} лет
- Вес: ${profile.weight} кг
- Рост: ${profile.height} см
- Уровень активности: ${activityLabels[profile.activityLevel] || profile.activityLevel}
- Цель: ${goalLabels[profile.goal] || profile.goal}

ВАЖНО: Ответь СТРОГО в формате JSON без дополнительного текста, объяснений или markdown форматирования. Верни только чистый JSON объект.

Рассчитай:
1. BMR (основной обмен) - формула Миффлина-Сан Жеора
2. TDEE (общий расход с учетом активности)
3. targetCalories (целевая калорийность: похудение -15-20% от TDEE, набор +10-15%, поддержание = TDEE)
4. protein (белки г: 1.6-2.2 г/кг для похудения/набора, 1.2-1.6 г/кг поддержание)
5. fat (жиры г: 25-30% от targetCalories, 1г = 9 ккал)
6. carbohydrate (углеводы г: остаток калорий, 1г = 4 ккал)
7. fiber (клетчатка г: 25-30 для женщин, 30-38 для мужчин)

Формат ответа (только JSON, ничего более):
{
  "bmr": 1650,
  "tdee": 2280,
  "targetCalories": 1824,
  "protein": 130,
  "fat": 60,
  "carbohydrate": 180,
  "fiber": 30
}`;

        const messages = [{ role: "user", content: prompt }];
        const data = await callAI(config, messages, true, 2048);
        
        console.log('[calculateDailyGoals] Received data:', data);

        const result = {
            bmr: Math.round(parseNutrientValue(data.bmr)),
            tdee: Math.round(parseNutrientValue(data.tdee)),
            targetCalories: Math.round(parseNutrientValue(data.targetCalories)),
            protein: Math.round(parseNutrientValue(data.protein)),
            fat: Math.round(parseNutrientValue(data.fat)),
            carbohydrate: Math.round(parseNutrientValue(data.carbohydrate)),
            fiber: Math.round(parseNutrientValue(data.fiber)),
        };
        
        console.log('[calculateDailyGoals] Calculated result:', result);
        return result;
    } catch (error) {
        console.error("Error calculating daily goals:", error);
        throw new Error('Не удалось рассчитать дневные нормы. Проверьте подключение к AI.');
    }
};

export const analyzeDailyIntake = async (
    date: string,
    dailyTotals: any,
    meals: any[],
    userGoals: any | null,
    config: ApiConfig
): Promise<string> => {
    const { token, model } = getCurrentProviderConfig(config);
    if (!token || !model) {
        throw new Error('Токен или модель не настроены');
    }
    
    try {
        let prompt = `Проанализируй мой дневной рацион питания за ${date}.\n\n`;
        
        if (userGoals) {
            prompt += `МОИ ЦЕЛИ:\n`;
            prompt += `- Целевые калории: ${userGoals.targetCalories} ккал\n`;
            prompt += `- Белки: ${userGoals.protein}г\n`;
            prompt += `- Жиры: ${userGoals.fat}г\n`;
            prompt += `- Углеводы: ${userGoals.carbohydrate}г\n`;
            prompt += `- Клетчатка: ${userGoals.fiber}г\n\n`;
        }
        
        prompt += `МОЕ ФАКТИЧЕСКОЕ ПОТРЕБЛЕНИЕ:\n`;
        prompt += `- Калории: ${Math.round(dailyTotals.calories)} ккал\n`;
        prompt += `- Белки: ${dailyTotals.protein.toFixed(1)}г\n`;
        prompt += `- Жиры: ${dailyTotals.fat.toFixed(1)}г\n`;
        prompt += `- Углеводы: ${dailyTotals.carbohydrate.toFixed(1)}г\n`;
        prompt += `- Клетчатка: ${dailyTotals.fiber.toFixed(1)}г\n\n`;
        
        prompt += `МОЙ РАЦИОН:\n`;
        meals.forEach((meal, index) => {
            const mealTypeLabels: { [key: string]: string } = {
                breakfast: 'Завтрак',
                lunch: 'Обед',
                dinner: 'Ужин',
                snack: 'Перекус',
            };
            prompt += `${index + 1}. ${mealTypeLabels[meal.type] || meal.type}:\n`;
            meal.ingredients.forEach((ing: any) => {
                const ingCalories = Math.round((ing.baseCPFC.calories * ing.weight) / 100);
                prompt += `   - ${ing.name} (${ing.weight}г) - ${ingCalories} ккал\n`;
            });
        });
        
        prompt += `\nДай краткий и понятный анализ (максимум 150-200 слов):\n`;
        prompt += `1. Что было хорошо в моем питании?\n`;
        prompt += `2. Что можно улучшить?\n`;
        prompt += `3. Как скорректировать питание завтра, чтобы лучше соответствовать моим целям?\n\n`;
        prompt += `Ответ должен быть дружелюбным, мотивирующим и конкретным. Формат ответа - обычный текст, не JSON.`;

        const messages = [{ role: "user", content: prompt }];
        const analysis = await callAI(config, messages, false);
        
        return analysis;
    } catch (error) {
        console.error("Error analyzing daily intake:", error);
        throw new Error('Не удалось проанализировать рацион. Проверьте подключение к AI.');
    }
};