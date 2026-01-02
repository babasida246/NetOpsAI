import { ModelTier } from '@contracts/shared'

export interface ModelDefinition {
    id: string
    provider: 'openrouter'
    tier: ModelTier
    displayName: string
    contextWindow: number
    maxTokens: number
    costPer1kInput: number
    costPer1kOutput: number
    capabilities: {
        streaming: boolean
        tools: boolean
        vision: boolean
    }
}

// FREE OpenRouter Models mapped to tiers
export const FREE_MODELS: ModelDefinition[] = [
    // T0 - FREE (Default tier)
    {
        id: 'mistralai/devstral-2512:free',
        provider: 'openrouter',
        tier: ModelTier.T0_FREE,
        displayName: 'Mistral Devstral (Free)',
        contextWindow: 32000,
        maxTokens: 4096,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: {
            streaming: true,
            tools: false,
            vision: false
        }
    },
    {
        id: 'openai/gpt-oss-20b:free',
        provider: 'openrouter',
        tier: ModelTier.T0_FREE,
        displayName: 'GPT OSS 20B (Free)',
        contextWindow: 8192,
        maxTokens: 2048,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: {
            streaming: true,
            tools: false,
            vision: false
        }
    },

    // T1 - PAID CHEAP (Using better free model as fallback)
    {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        provider: 'openrouter',
        tier: ModelTier.T1_PAID_CHEAP,
        displayName: 'Llama 3.3 70B (Free)',
        contextWindow: 8192,
        maxTokens: 4096,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: {
            streaming: true,
            tools: false,
            vision: false
        }
    },

    // T2 - PAID MEDIUM (Using best free model)
    {
        id: 'google/gemini-2.0-flash-exp:free',
        provider: 'openrouter',
        tier: ModelTier.T2_PAID_MEDIUM,
        displayName: 'Gemini 2.0 Flash (Free)',
        contextWindow: 1048576,
        maxTokens: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: {
            streaming: true,
            tools: true,
            vision: true
        }
    },

    // T3 - PAID PREMIUM (Reuse Gemini as best free option)
    {
        id: 'google/gemini-2.0-flash-exp:free',
        provider: 'openrouter',
        tier: ModelTier.T3_PAID_PREMIUM,
        displayName: 'Gemini 2.0 Flash (Free - Premium Tier)',
        contextWindow: 1048576,
        maxTokens: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: {
            streaming: true,
            tools: true,
            vision: true
        }
    }
]

export function getModelByTier(tier: ModelTier): ModelDefinition {
    const models = FREE_MODELS.filter(m => m.tier === tier)
    if (models.length === 0) {
        throw new Error(`No model found for tier ${tier}`)
    }
    return models[0]
}

export function getDefaultModel(): ModelDefinition {
    return getModelByTier(ModelTier.T0_FREE)
}
