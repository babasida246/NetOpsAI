import OpenAI from 'openai'
import type { LLMRequest, LLMResponse, StreamChunk, TokenUsage } from '@contracts/shared'
import {
    ExtendedLLMClient,
    AccountInfo,
    ModelInfo,
    OpenRouterConfig,
    OpenRouterConfigSchema,
    ProviderError
} from './types.js'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export class OpenRouterClient implements ExtendedLLMClient {
    readonly provider = 'openrouter' as const
    private client: OpenAI
    private config: OpenRouterConfig
    private extraHeaders: Record<string, string>

    constructor(config: Partial<OpenRouterConfig> & { apiKey: string }) {
        this.config = OpenRouterConfigSchema.parse({
            ...config,
            baseURL: config.baseURL ?? OPENROUTER_BASE_URL,
            defaultModel: config.defaultModel ?? 'openai/gpt-4o-mini',
            timeout: config.timeout ?? 60000,
            maxRetries: config.maxRetries ?? 3
        })

        this.extraHeaders = {
            'HTTP-Referer': this.config.siteUrl || 'https://localhost',
            'X-Title': this.config.siteName || 'AI Chat Application'
        }

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            defaultHeaders: this.extraHeaders
        })
    }

    async chat(request: LLMRequest): Promise<LLMResponse> {
        try {
            const messages = this.mapMessages(request.messages)
            const response = await this.client.chat.completions.create({
                model: request.model || this.config.defaultModel!,
                messages,
                tools: request.tools?.map(t => ({
                    type: 'function' as const,
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.inputSchema
                    }
                })),
                temperature: request.temperature,
                max_tokens: request.maxTokens
            })

            const choice = response.choices[0]
            const model = request.model || this.config.defaultModel!
            const usage = this.calculateUsage(response.usage, model)

            return {
                id: response.id,
                model: response.model,
                content: choice.message.content || '',
                toolCalls: choice.message.tool_calls?.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                })),
                finishReason: this.mapFinishReason(choice.finish_reason),
                usage
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async *chatStream(request: LLMRequest): AsyncIterable<StreamChunk> {
        try {
            const messages = this.mapMessages(request.messages)
            const stream = await this.client.chat.completions.create({
                model: request.model || this.config.defaultModel!,
                messages,
                tools: request.tools?.map(t => ({
                    type: 'function' as const,
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.inputSchema
                    }
                })),
                temperature: request.temperature,
                max_tokens: request.maxTokens,
                stream: true
            })

            for await (const chunk of stream) {
                const choice = chunk.choices[0]
                if (choice) {
                    yield {
                        id: chunk.id,
                        delta: {
                            content: choice.delta.content || undefined,
                            toolCalls: choice.delta.tool_calls?.map(tc => ({
                                id: tc.id || '',
                                type: 'function' as const,
                                function: {
                                    name: tc.function?.name || '',
                                    arguments: tc.function?.arguments || ''
                                }
                            }))
                        },
                        finishReason: choice.finish_reason || undefined
                    }
                }
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async health(): Promise<{ available: boolean; latency: number }> {
        const start = Date.now()
        try {
            await this.listModels()
            return {
                available: true,
                latency: Date.now() - start
            }
        } catch {
            return {
                available: false,
                latency: Date.now() - start
            }
        }
    }

    async getAccountInfo(): Promise<AccountInfo> {
        try {
            // Get credits info from OpenRouter
            const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to get account info: ${response.status}`)
            }

            const data = await response.json() as {
                data?: {
                    label?: string
                    usage?: number
                    limit?: number | null
                    is_free_tier?: boolean
                    rate_limit?: {
                        requests: number
                        interval: string
                    }
                }
            }

            return {
                provider: 'openrouter',
                balance: data.data?.limit ? data.data.limit - (data.data.usage || 0) : undefined,
                currency: 'USD',
                usage: {
                    totalRequests: 0,
                    totalTokens: 0,
                    totalCost: data.data?.usage || 0,
                    period: {
                        start: new Date(new Date().setDate(1)),
                        end: new Date()
                    }
                },
                tier: data.data?.is_free_tier ? 'free' : 'paid',
                rateLimit: data.data?.rate_limit ? {
                    requestsPerMinute: data.data.rate_limit.requests,
                    tokensPerMinute: 1000000 // Default, not provided by API
                } : undefined
            }
        } catch {
            return {
                provider: 'openrouter',
                rateLimit: {
                    requestsPerMinute: 200,
                    tokensPerMinute: 1000000
                }
            }
        }
    }

    async listModels(): Promise<ModelInfo[]> {
        try {
            const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to get models: ${response.status}`)
            }

            const data = await response.json() as {
                data: Array<{
                    id: string
                    name: string
                    context_length: number
                    pricing: {
                        prompt: string
                        completion: string
                    }
                    architecture?: {
                        modality: string
                        tokenizer: string
                        instruct_type?: string
                    }
                    description?: string
                    top_provider?: {
                        max_completion_tokens?: number
                    }
                }>
            }

            return data.data.map(m => ({
                id: m.id,
                name: m.name,
                provider: m.id.split('/')[0] || 'openrouter',
                contextLength: m.context_length,
                pricing: {
                    prompt: parseFloat(m.pricing.prompt) * 1_000_000,
                    completion: parseFloat(m.pricing.completion) * 1_000_000
                },
                description: m.description,
                architecture: m.architecture ? {
                    modality: m.architecture.modality,
                    tokenizer: m.architecture.tokenizer,
                    instructType: m.architecture.instruct_type
                } : undefined,
                capabilities: this.inferCapabilities(m.id, m.architecture?.modality)
            }))
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async getModelById(modelId: string): Promise<ModelInfo | null> {
        const models = await this.listModels()
        return models.find(m => m.id === modelId) || null
    }

    async getGenerationStats(generationId: string): Promise<{
        id: string
        model: string
        totalCost: number
        promptTokens: number
        completionTokens: number
    } | null> {
        try {
            const response = await fetch(`${OPENROUTER_BASE_URL}/generation?id=${generationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            })

            if (!response.ok) {
                return null
            }

            const data = await response.json() as {
                data?: {
                    id: string
                    model: string
                    total_cost: number
                    tokens_prompt: number
                    tokens_completion: number
                }
            }

            if (!data.data) return null

            return {
                id: data.data.id,
                model: data.data.model,
                totalCost: data.data.total_cost,
                promptTokens: data.data.tokens_prompt,
                completionTokens: data.data.tokens_completion
            }
        } catch {
            return null
        }
    }

    private calculateUsage(
        usage: OpenAI.CompletionUsage | undefined,
        model: string
    ): TokenUsage {
        const promptTokens = usage?.prompt_tokens || 0
        const completionTokens = usage?.completion_tokens || 0

        // Use approximate pricing (actual cost comes from generation endpoint)
        const defaultPricing = { prompt: 0.5, completion: 1.5 }

        return {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            totalCost: (promptTokens * defaultPricing.prompt + completionTokens * defaultPricing.completion) / 1_000_000
        }
    }

    private mapMessages(messages: LLMRequest['messages']): OpenAI.ChatCompletionMessageParam[] {
        return messages.map(m => {
            if (m.role === 'system') {
                return { role: 'system' as const, content: m.content }
            }
            if (m.role === 'user') {
                return { role: 'user' as const, content: m.content }
            }
            if (m.role === 'assistant') {
                return {
                    role: 'assistant' as const,
                    content: m.content,
                    ...(m.toolCalls && {
                        tool_calls: m.toolCalls.map(tc => ({
                            id: tc.id,
                            type: 'function' as const,
                            function: { name: tc.function.name, arguments: tc.function.arguments }
                        }))
                    })
                }
            }
            if (m.role === 'tool' && m.toolCallId) {
                return {
                    role: 'tool' as const,
                    content: m.content,
                    tool_call_id: m.toolCallId
                }
            }
            // Default to user
            return { role: 'user' as const, content: m.content }
        })
    }

    private mapFinishReason(reason: string | null): 'stop' | 'length' | 'tool_calls' {
        switch (reason) {
            case 'tool_calls':
                return 'tool_calls'
            case 'length':
                return 'length'
            default:
                return 'stop'
        }
    }

    private inferCapabilities(modelId: string, modality?: string): string[] {
        const caps = ['chat']

        const lowerModel = modelId.toLowerCase()

        if (modality?.includes('text+image')) {
            caps.push('vision')
        }
        if (lowerModel.includes('gpt-4') || lowerModel.includes('claude') || lowerModel.includes('gemini')) {
            caps.push('function_calling')
        }
        if (lowerModel.includes('vision') || lowerModel.includes('4o') || lowerModel.includes('gemini')) {
            caps.push('vision')
        }

        return [...new Set(caps)]
    }

    private handleError(error: unknown): ProviderError {
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return ProviderError.authError('openrouter')
            }
            if (error.status === 429) {
                return ProviderError.rateLimitError('openrouter')
            }
            if (error.status === 404) {
                return ProviderError.modelNotFound('openrouter', 'unknown')
            }
            return ProviderError.serverError('openrouter', error.message)
        }
        return ProviderError.serverError('openrouter', String(error))
    }
}

export type { OpenRouterConfig }
