import { z } from 'zod'
import type { LLMClient, LLMRequest, LLMResponse, StreamChunk, TokenUsage } from '@contracts/shared'

// Re-export LLMClient types
export type { LLMClient, LLMRequest, LLMResponse, StreamChunk, TokenUsage }

// Provider types
export type ProviderName = 'openai' | 'anthropic' | 'google' | 'openrouter'

// Account Info Interface
export interface AccountInfo {
    provider: ProviderName
    balance?: number
    currency?: string
    rateLimit?: RateLimitInfo
    usage?: UsageInfo
    organization?: string
    tier?: string
}

export interface RateLimitInfo {
    requestsPerMinute: number
    requestsPerDay?: number
    tokensPerMinute: number
    tokensPerDay?: number
    remaining?: {
        requests: number
        tokens: number
    }
    resetAt?: Date
}

export interface UsageInfo {
    totalRequests: number
    totalTokens: number
    totalCost: number
    period: {
        start: Date
        end: Date
    }
}

// Model Info Interface
export interface ModelInfo {
    id: string
    name: string
    provider: ProviderName | string
    contextLength: number
    pricing?: {
        prompt: number       // per 1M tokens
        completion: number   // per 1M tokens
    }
    capabilities?: string[]
    description?: string
    architecture?: {
        modality: string
        tokenizer: string
        instructType?: string
    }
}

// Extended LLM Client with account info
export interface ExtendedLLMClient extends LLMClient {
    readonly provider: ProviderName
    getAccountInfo(): Promise<AccountInfo>
    listModels(): Promise<ModelInfo[]>
}

// Config schemas
export const BaseConfigSchema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    baseURL: z.string().url().optional(),
    defaultModel: z.string().optional(),
    timeout: z.number().positive().default(60000),
    maxRetries: z.number().min(0).default(3)
})

export const OpenAIConfigSchema = BaseConfigSchema.extend({
    organization: z.string().optional()
})

export const AnthropicConfigSchema = BaseConfigSchema.extend({
    anthropicVersion: z.string().default('2023-06-01')
})

export const GoogleConfigSchema = BaseConfigSchema.extend({
    projectId: z.string().optional()
})

export const OpenRouterConfigSchema = BaseConfigSchema.extend({
    siteUrl: z.string().url().optional(),
    siteName: z.string().optional()
})

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>
export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>
export type GoogleConfig = z.infer<typeof GoogleConfigSchema>
export type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>

// Error types
export class ProviderError extends Error {
    constructor(
        message: string,
        public readonly provider: ProviderName,
        public readonly code: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message)
        this.name = 'ProviderError'
    }

    static authError(provider: ProviderName): ProviderError {
        return new ProviderError(
            `Authentication failed for ${provider}`,
            provider,
            'AUTH_ERROR',
            401,
            false
        )
    }

    static rateLimitError(provider: ProviderName, retryAfter?: number): ProviderError {
        return new ProviderError(
            `Rate limit exceeded for ${provider}. ${retryAfter ? `Retry after ${retryAfter}s` : ''}`,
            provider,
            'RATE_LIMIT',
            429,
            true
        )
    }

    static modelNotFound(provider: ProviderName, model: string): ProviderError {
        return new ProviderError(
            `Model ${model} not found for ${provider}`,
            provider,
            'MODEL_NOT_FOUND',
            404,
            false
        )
    }

    static serverError(provider: ProviderName, message: string): ProviderError {
        return new ProviderError(
            message,
            provider,
            'SERVER_ERROR',
            500,
            true
        )
    }
}
