import Anthropic from '@anthropic-ai/sdk'
import type { LLMRequest, LLMResponse, StreamChunk, TokenUsage } from '@contracts/shared'
import {
    ExtendedLLMClient,
    AccountInfo,
    ModelInfo,
    AnthropicConfig,
    AnthropicConfigSchema,
    ProviderError
} from './types.js'

// Anthropic pricing per 1M tokens (as of Dec 2024)
const PRICING: Record<string, { prompt: number; completion: number }> = {
    'claude-3-5-sonnet-20241022': { prompt: 3, completion: 15 },
    'claude-3-5-sonnet-latest': { prompt: 3, completion: 15 },
    'claude-3-5-haiku-20241022': { prompt: 0.8, completion: 4 },
    'claude-3-5-haiku-latest': { prompt: 0.8, completion: 4 },
    'claude-3-opus-20240229': { prompt: 15, completion: 75 },
    'claude-3-opus-latest': { prompt: 15, completion: 75 },
    'claude-3-sonnet-20240229': { prompt: 3, completion: 15 },
    'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 }
}

const MODELS: ModelInfo[] = [
    {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: PRICING['claude-3-5-sonnet-20241022'],
        capabilities: ['chat', 'vision', 'function_calling', 'computer_use']
    },
    {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: PRICING['claude-3-5-haiku-20241022'],
        capabilities: ['chat', 'function_calling']
    },
    {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: PRICING['claude-3-opus-20240229'],
        capabilities: ['chat', 'vision', 'function_calling']
    },
    {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: PRICING['claude-3-sonnet-20240229'],
        capabilities: ['chat', 'vision', 'function_calling']
    },
    {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: PRICING['claude-3-haiku-20240307'],
        capabilities: ['chat', 'function_calling']
    }
]

export class AnthropicClient implements ExtendedLLMClient {
    readonly provider = 'anthropic' as const
    private client: Anthropic
    private config: AnthropicConfig

    constructor(config: Partial<AnthropicConfig> & { apiKey: string }) {
        this.config = AnthropicConfigSchema.parse({
            ...config,
            defaultModel: config.defaultModel ?? 'claude-3-5-sonnet-20241022',
            timeout: config.timeout ?? 60000,
            maxRetries: config.maxRetries ?? 3
        })

        this.client = new Anthropic({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries
        })
    }

    async chat(request: LLMRequest): Promise<LLMResponse> {
        try {
            // Extract system message
            const systemMessage = request.messages.find(m => m.role === 'system')
            const userMessages = request.messages.filter(m => m.role !== 'system')

            const response = await this.client.messages.create({
                model: request.model || this.config.defaultModel!,
                max_tokens: request.maxTokens || 4096,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                tools: request.tools?.map(t => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.inputSchema as Anthropic.Tool['input_schema']
                })),
                temperature: request.temperature
            })

            const model = request.model || this.config.defaultModel!
            const usage = this.calculateUsage(response.usage, model)

            // Extract content and tool calls
            let content = ''
            const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = []

            for (const block of response.content) {
                if (block.type === 'text') {
                    content += block.text
                } else if (block.type === 'tool_use') {
                    toolCalls.push({
                        id: block.id,
                        type: 'function',
                        function: {
                            name: block.name,
                            arguments: JSON.stringify(block.input)
                        }
                    })
                }
            }

            return {
                id: response.id,
                model: response.model,
                content,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                finishReason: this.mapStopReason(response.stop_reason),
                usage
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async *chatStream(request: LLMRequest): AsyncIterable<StreamChunk> {
        try {
            // Extract system message
            const systemMessage = request.messages.find(m => m.role === 'system')
            const userMessages = request.messages.filter(m => m.role !== 'system')

            const stream = this.client.messages.stream({
                model: request.model || this.config.defaultModel!,
                max_tokens: request.maxTokens || 4096,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                tools: request.tools?.map(t => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.inputSchema as Anthropic.Tool['input_schema']
                })),
                temperature: request.temperature
            })

            let currentToolCall: { id: string; name: string; arguments: string } | null = null

            for await (const event of stream) {
                if (event.type === 'content_block_start') {
                    if (event.content_block.type === 'tool_use') {
                        currentToolCall = {
                            id: event.content_block.id,
                            name: event.content_block.name,
                            arguments: ''
                        }
                    }
                } else if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        yield {
                            id: `chunk-${Date.now()}`,
                            delta: { content: event.delta.text }
                        }
                    } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
                        currentToolCall.arguments += event.delta.partial_json
                    }
                } else if (event.type === 'content_block_stop' && currentToolCall) {
                    yield {
                        id: `chunk-${Date.now()}`,
                        delta: {
                            toolCalls: [{
                                id: currentToolCall.id,
                                type: 'function',
                                function: {
                                    name: currentToolCall.name,
                                    arguments: currentToolCall.arguments
                                }
                            }]
                        }
                    }
                    currentToolCall = null
                } else if (event.type === 'message_stop') {
                    yield {
                        id: `chunk-${Date.now()}`,
                        delta: {},
                        finishReason: 'stop'
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
            // Use a minimal request to check health
            await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            })
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
        // Anthropic API doesn't expose account info directly
        // Rate limits come from response headers
        return {
            provider: 'anthropic',
            rateLimit: {
                requestsPerMinute: 4000,    // Default tier 4 limits
                tokensPerMinute: 400000
            }
        }
    }

    async listModels(): Promise<ModelInfo[]> {
        // Anthropic doesn't have a models list API
        return MODELS
    }

    private calculateUsage(
        usage: Anthropic.Usage,
        model: string
    ): TokenUsage {
        const pricing = PRICING[model] || PRICING['claude-3-5-sonnet-20241022']

        return {
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens,
            totalCost: (usage.input_tokens * pricing.prompt + usage.output_tokens * pricing.completion) / 1_000_000
        }
    }

    private mapStopReason(reason: string | null): 'stop' | 'length' | 'tool_calls' {
        switch (reason) {
            case 'tool_use':
                return 'tool_calls'
            case 'max_tokens':
                return 'length'
            default:
                return 'stop'
        }
    }

    private handleError(error: unknown): ProviderError {
        if (error instanceof Anthropic.APIError) {
            if (error.status === 401) {
                return ProviderError.authError('anthropic')
            }
            if (error.status === 429) {
                return ProviderError.rateLimitError('anthropic')
            }
            if (error.status === 404) {
                return ProviderError.modelNotFound('anthropic', 'unknown')
            }
            return ProviderError.serverError('anthropic', error.message)
        }
        return ProviderError.serverError('anthropic', String(error))
    }
}
