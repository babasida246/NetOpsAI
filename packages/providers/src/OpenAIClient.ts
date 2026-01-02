import OpenAI from 'openai'
import type { LLMRequest, LLMResponse, StreamChunk, TokenUsage } from '@contracts/shared'
import {
    ExtendedLLMClient,
    AccountInfo,
    ModelInfo,
    OpenAIConfig,
    OpenAIConfigSchema,
    ProviderError
} from './types.js'

// OpenAI pricing per 1M tokens (as of Dec 2024)
const PRICING: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 2.5, completion: 10 },
    'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
    'gpt-4-turbo': { prompt: 10, completion: 30 },
    'gpt-4': { prompt: 30, completion: 60 },
    'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
    'o1': { prompt: 15, completion: 60 },
    'o1-mini': { prompt: 3, completion: 12 },
    'o1-preview': { prompt: 15, completion: 60 }
}

export class OpenAIClient implements ExtendedLLMClient {
    readonly provider = 'openai' as const
    private client: OpenAI
    private config: OpenAIConfig

    constructor(config: Partial<OpenAIConfig> & { apiKey: string }) {
        this.config = OpenAIConfigSchema.parse({
            ...config,
            defaultModel: config.defaultModel ?? 'gpt-4o-mini',
            timeout: config.timeout ?? 60000,
            maxRetries: config.maxRetries ?? 3
        })

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            organization: this.config.organization,
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries
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
            await this.client.models.list()
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
        // OpenAI doesn't have a direct API for balance/usage
        // We can only get organization info and rate limits from headers
        const info: AccountInfo = {
            provider: 'openai',
            organization: this.config.organization,
            rateLimit: {
                requestsPerMinute: 10000,  // Default tier limits
                tokensPerMinute: 2000000
            }
        }

        // Get organization details if available
        try {
            // Note: OpenAI doesn't expose billing/usage API publicly
            // This would require the dashboard API which is not in the SDK
            const models = await this.client.models.list()
            info.tier = models.data.some(m => m.id.includes('gpt-4')) ? 'paid' : 'free'
        } catch {
            // Ignore errors
        }

        return info
    }

    async listModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.client.models.list()
            return response.data
                .filter(m => m.id.includes('gpt') || m.id.includes('o1'))
                .map(m => ({
                    id: m.id,
                    name: m.id,
                    provider: 'openai',
                    contextLength: this.getContextLength(m.id),
                    pricing: PRICING[m.id],
                    capabilities: this.getCapabilities(m.id)
                }))
        } catch (error) {
            throw this.handleError(error)
        }
    }

    private calculateUsage(
        usage: OpenAI.CompletionUsage | undefined,
        model: string
    ): TokenUsage {
        const promptTokens = usage?.prompt_tokens || 0
        const completionTokens = usage?.completion_tokens || 0
        const pricing = PRICING[model] || PRICING['gpt-4o-mini']

        return {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            totalCost: (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1_000_000
        }
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

    private getContextLength(modelId: string): number {
        if (modelId.includes('gpt-4o')) return 128000
        if (modelId.includes('gpt-4-turbo')) return 128000
        if (modelId.includes('gpt-4')) return 8192
        if (modelId.includes('gpt-3.5')) return 16385
        if (modelId.includes('o1')) return 128000
        return 8192
    }

    private getCapabilities(modelId: string): string[] {
        const caps = ['chat', 'completion']
        if (modelId.includes('gpt-4') || modelId.includes('o1')) {
            caps.push('function_calling', 'vision', 'json_mode')
        }
        return caps
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
            return { role: 'user' as const, content: m.content }
        })
    }

    private handleError(error: unknown): ProviderError {
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return ProviderError.authError('openai')
            }
            if (error.status === 429) {
                return ProviderError.rateLimitError('openai')
            }
            if (error.status === 404) {
                return ProviderError.modelNotFound('openai', 'unknown')
            }
            return ProviderError.serverError('openai', error.message)
        }
        return ProviderError.serverError('openai', String(error))
    }
}
