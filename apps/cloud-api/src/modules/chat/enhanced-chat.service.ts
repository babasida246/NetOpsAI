/**
 * Enhanced Chat Service with Provider Integration
 * Uses @providers/llm package for multi-provider support
 */
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import { env } from '../../config/env.js'
import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelInfo
} from './chat.schema.js'
import { BadRequestError, ServiceUnavailableError } from '../../shared/errors/http-errors.js'
import { randomUUID } from 'crypto'
import { ConversationMemoryService } from '../conversations/memory.service.js'
import { ContextOptimizationService } from '../conversations/context-optimizer.service.js'

// Provider types (inline to avoid complex imports during development)
interface ProviderConfig {
    apiKey: string
    baseUrl?: string
    defaultModel?: string
}

interface ProviderConfigs {
    openai?: ProviderConfig
    anthropic?: ProviderConfig
    google?: ProviderConfig
    openrouter?: ProviderConfig
}

interface AccountInfo {
    provider: string
    balance?: number
    currency?: string
    tier?: string
    rateLimit?: {
        requestsPerMinute: number
        tokensPerMinute: number
    }
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'
const GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export class EnhancedChatService {
    private configs: ProviderConfigs
    private memoryService?: ConversationMemoryService
    private contextOptimizer?: ContextOptimizationService
    private mockMode: boolean

    constructor(deps?: { db?: Pool; redis?: Redis }) {
        this.configs = {
            openai: env.OPENAI_API_KEY ? { apiKey: env.OPENAI_API_KEY } : undefined,
            anthropic: env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY } : undefined,
            google: env.GOOGLE_API_KEY ? { apiKey: env.GOOGLE_API_KEY } : undefined,
            openrouter: env.OPENROUTER_API_KEY ? { apiKey: env.OPENROUTER_API_KEY } : undefined
        }
        this.mockMode = env.MOCK_CHAT_RESPONSES === 'true' ||
            (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GOOGLE_API_KEY && !env.OPENROUTER_API_KEY && env.NODE_ENV !== 'production')

        // Initialize memory services if dependencies provided
        if (deps?.db && deps?.redis) {
            this.memoryService = new ConversationMemoryService(deps.db, deps.redis)
            this.contextOptimizer = new ContextOptimizationService(
                this.memoryService,
                (messages, options) => this.summarize(messages, options)
            )
        }
    }

    /**
     * Create chat completion with provider routing
     */
    async createCompletion(
        request: ChatCompletionRequest,
        options?: { userId?: string; conversationId?: string; saveToMemory?: boolean }
    ): Promise<ChatCompletionResponse> {
        const { provider, model } = this.parseModel(request.model)

        // Get optimized context if conversation ID provided
        let messages = request.messages
        if (options?.conversationId && options?.userId && this.contextOptimizer) {
            const optimized = await this.contextOptimizer.getOptimizedContext(
                options.conversationId,
                options.userId,
                8000 // Default context limit
            )
            if (optimized.optimizationApplied && optimized.summary) {
                // Prepend summary to messages
                messages = [
                    { role: 'system' as const, content: `Previous context summary: ${optimized.summary}` },
                    ...messages
                ]
            }
        }

        const config = this.getProviderConfig(provider)
        if (!config) {
            if (this.mockMode) {
                return this.mockCompletionResponse({ ...request, messages })
            }
            throw new ServiceUnavailableError(`Provider ${provider} not configured`)
        }

        let response: ChatCompletionResponse

        try {
            switch (provider) {
                case 'openai':
                    response = await this.callOpenAI({ ...request, messages }, config)
                    break
                case 'anthropic':
                    response = await this.callAnthropic({ ...request, messages }, config)
                    break
                case 'google':
                    response = await this.callGoogle({ ...request, messages }, config)
                    break
                case 'openrouter':
                default:
                    response = await this.callOpenRouter({ ...request, messages }, config)
            }
        } catch (err) {
            if (this.mockMode) {
                console.warn('Mocking chat response because provider call failed:', err)
                response = this.mockCompletionResponse({ ...request, messages })
            } else {
                throw err
            }
        }

        // Save to memory if enabled
        if (options?.saveToMemory && options?.conversationId && options?.userId && this.memoryService) {
            // Save user message
            const userMessage = request.messages[request.messages.length - 1]
            if (userMessage && userMessage.role === 'user') {
                await this.memoryService.addMessage(options.conversationId, options.userId, {
                    role: 'user',
                    content: userMessage.content,
                    model: request.model,
                    tokenCount: response.usage?.promptTokens
                })
            }

            // Save assistant response
            const assistantContent = response.choices[0]?.message?.content
            if (assistantContent) {
                await this.memoryService.addMessage(options.conversationId, options.userId, {
                    role: 'assistant',
                    content: assistantContent,
                    model: response.model,
                    tokenCount: response.usage?.completionTokens,
                    toolCalls: response.choices[0]?.message?.toolCalls
                })
            }

            // Auto-optimize if needed
            if (this.contextOptimizer) {
                await this.contextOptimizer.autoOptimize(options.conversationId, options.userId)
            }
        }

        return response
    }

    private mockCompletionResponse(request: ChatCompletionRequest): ChatCompletionResponse {
        const lastMessage = request.messages[request.messages.length - 1]
        const echo = lastMessage?.content || 'Mock response'
        const promptTokens = Math.max(1, Math.floor(echo.length / 4))
        const completionTokens = 20
        return {
            id: randomUUID(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: `[mock] ${echo}`,
                    toolCalls: []
                },
                finishReason: 'stop'
            }],
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
            }
        }
    }

    /**
     * Streaming completion
     */
    async *createStreamingCompletion(
        request: ChatCompletionRequest,
        options?: { userId?: string; conversationId?: string }
    ): AsyncGenerator<string> {
        const { provider } = this.parseModel(request.model)
        const config = this.getProviderConfig(provider)

        if (!config) {
            throw new ServiceUnavailableError(`Provider ${provider} not configured`)
        }

        // For now, delegate to OpenRouter for all streaming
        yield* this.streamOpenRouter(request, config)
    }

    /**
     * Get available models from all configured providers
     */
    async getModels(): Promise<ModelInfo[]> {
        const models: ModelInfo[] = []

        // Static models list
        const staticModels: ModelInfo[] = [
            {
                id: 'openai/gpt-4o-mini',
                name: 'GPT-4o Mini',
                provider: 'openai',
                contextLength: 128000,
                pricing: { prompt: 0.15, completion: 0.6 },
                capabilities: ['chat', 'function_calling']
            },
            {
                id: 'openai/gpt-4o',
                name: 'GPT-4o',
                provider: 'openai',
                contextLength: 128000,
                pricing: { prompt: 5.0, completion: 15.0 },
                capabilities: ['chat', 'function_calling', 'vision']
            },
            {
                id: 'anthropic/claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                provider: 'anthropic',
                contextLength: 200000,
                pricing: { prompt: 3.0, completion: 15.0 },
                capabilities: ['chat', 'function_calling', 'vision']
            },
            {
                id: 'google/gemini-2.0-flash-exp',
                name: 'Gemini 2.0 Flash',
                provider: 'google',
                contextLength: 1000000,
                pricing: { prompt: 0, completion: 0 },
                capabilities: ['chat', 'function_calling', 'vision']
            }
        ]

        // If OpenRouter is configured, fetch live models
        if (this.configs.openrouter) {
            try {
                const liveModels = await this.fetchOpenRouterModels()
                return liveModels
            } catch {
                // Fall back to static list
            }
        }

        return staticModels
    }

    /**
     * Get account info for all configured providers
     */
    async getAccountInfo(): Promise<Record<string, AccountInfo>> {
        const results: Record<string, AccountInfo> = {}

        // OpenRouter account info
        if (this.configs.openrouter) {
            try {
                const info = await this.getOpenRouterAccountInfo()
                results.openrouter = info
            } catch {
                results.openrouter = { provider: 'openrouter' }
            }
        }

        // Other providers don't have public account APIs
        if (this.configs.openai) {
            results.openai = {
                provider: 'openai',
                rateLimit: { requestsPerMinute: 10000, tokensPerMinute: 2000000 }
            }
        }

        if (this.configs.anthropic) {
            results.anthropic = {
                provider: 'anthropic',
                rateLimit: { requestsPerMinute: 4000, tokensPerMinute: 400000 }
            }
        }

        if (this.configs.google) {
            results.google = {
                provider: 'google',
                rateLimit: { requestsPerMinute: 1000, tokensPerMinute: 4000000 }
            }
        }

        return results
    }

    /**
     * Health check for all providers
     */
    async healthCheck(): Promise<Record<string, { available: boolean; latency: number }>> {
        const results: Record<string, { available: boolean; latency: number }> = {}

        const checks = [
            { name: 'openrouter', config: this.configs.openrouter },
            { name: 'openai', config: this.configs.openai },
            { name: 'anthropic', config: this.configs.anthropic },
            { name: 'google', config: this.configs.google }
        ]

        await Promise.all(
            checks.map(async ({ name, config }) => {
                if (!config) {
                    results[name] = { available: false, latency: 0 }
                    return
                }

                const start = Date.now()
                try {
                    // Simple API call to check availability
                    await this.pingProvider(name, config)
                    results[name] = { available: true, latency: Date.now() - start }
                } catch {
                    results[name] = { available: false, latency: Date.now() - start }
                }
            })
        )

        return results
    }

    // ==================== Private Methods ====================

    private parseModel(model: string): { provider: string; model: string } {
        if (model.includes('/')) {
            const [provider, ...rest] = model.split('/')
            return { provider: provider.toLowerCase(), model }
        }

        // Auto-detect provider
        const modelLower = model.toLowerCase()
        if (modelLower.startsWith('gpt') || modelLower.startsWith('o1')) {
            return { provider: 'openai', model }
        }
        if (modelLower.startsWith('claude')) {
            return { provider: 'anthropic', model }
        }
        if (modelLower.startsWith('gemini')) {
            return { provider: 'google', model }
        }

        return { provider: 'openrouter', model }
    }

    private getProviderConfig(provider: string): ProviderConfig | undefined {
        return this.configs[provider as keyof ProviderConfigs]
    }

    private async callOpenRouter(
        request: ChatCompletionRequest,
        config: ProviderConfig
    ): Promise<ChatCompletionResponse> {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'https://api.local',
                'X-Title': 'Gateway API'
            },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    ...(m.toolCallId && { tool_call_id: m.toolCallId })
                })),
                temperature: request.temperature,
                max_tokens: request.maxTokens,
                top_p: request.topP,
                stream: false,
                tools: request.tools,
                tool_choice: request.toolChoice
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
            throw new BadRequestError(error.error?.message || `OpenRouter error: ${response.status}`)
        }

        const data = await response.json() as any
        return this.mapToResponse(data, request.model)
    }

    private async callOpenAI(
        request: ChatCompletionRequest,
        config: ProviderConfig
    ): Promise<ChatCompletionResponse> {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: request.model.replace('openai/', ''),
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    ...(m.toolCallId && { tool_call_id: m.toolCallId })
                })),
                temperature: request.temperature,
                max_tokens: request.maxTokens,
                top_p: request.topP,
                tools: request.tools
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
            throw new BadRequestError(error.error?.message || `OpenAI error: ${response.status}`)
        }

        const data = await response.json() as any
        return this.mapToResponse(data, request.model)
    }

    private async callAnthropic(
        request: ChatCompletionRequest,
        config: ProviderConfig
    ): Promise<ChatCompletionResponse> {
        // Extract system message
        const systemMessage = request.messages.find(m => m.role === 'system')
        const userMessages = request.messages.filter(m => m.role !== 'system')

        const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: request.model.replace('anthropic/', ''),
                max_tokens: request.maxTokens || 4096,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                temperature: request.temperature
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
            throw new BadRequestError(error.error?.message || `Anthropic error: ${response.status}`)
        }

        const data = await response.json() as any
        return {
            id: data.id || randomUUID(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: data.model || request.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: data.content?.[0]?.text || ''
                },
                finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
            }],
            usage: {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            }
        }
    }

    private async callGoogle(
        request: ChatCompletionRequest,
        config: ProviderConfig
    ): Promise<ChatCompletionResponse> {
        const modelId = request.model.replace('google/', '')
        const systemMessage = request.messages.find(m => m.role === 'system')
        const userMessages = request.messages.filter(m => m.role !== 'system')

        const response = await fetch(
            `${GOOGLE_BASE_URL}/models/${modelId}:generateContent?key=${config.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: userMessages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    })),
                    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
                    generationConfig: {
                        temperature: request.temperature,
                        maxOutputTokens: request.maxTokens
                    }
                })
            }
        )

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
            throw new BadRequestError(error.error?.message || `Google error: ${response.status}`)
        }

        const data = await response.json() as any
        return {
            id: randomUUID(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                },
                finishReason: 'stop'
            }],
            usage: {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0
            }
        }
    }

    private async *streamOpenRouter(
        request: ChatCompletionRequest,
        config: ProviderConfig
    ): AsyncGenerator<string> {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'https://api.local',
                'X-Title': 'Gateway API'
            },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                temperature: request.temperature,
                max_tokens: request.maxTokens,
                stream: true
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
            throw new BadRequestError(error.error?.message || `Stream error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new ServiceUnavailableError('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6)
                    if (data === '[DONE]') return
                    yield `data: ${data}\n\n`
                }
            }
        }
    }

    private async fetchOpenRouterModels(): Promise<ModelInfo[]> {
        const config = this.configs.openrouter
        if (!config) return []

        const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        })

        if (!response.ok) throw new Error('Failed to fetch models')

        const data = await response.json() as {
            data: Array<{
                id: string
                name: string
                context_length: number
                pricing: { prompt: string; completion: string }
                description?: string
            }>
        }

        return data.data.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.id.split('/')[0] || 'unknown',
            contextLength: m.context_length,
            pricing: {
                prompt: parseFloat(m.pricing.prompt) * 1_000_000,
                completion: parseFloat(m.pricing.completion) * 1_000_000
            },
            capabilities: ['chat']
        }))
    }

    private async getOpenRouterAccountInfo(): Promise<AccountInfo> {
        const config = this.configs.openrouter
        if (!config) throw new Error('OpenRouter not configured')

        const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        })

        if (!response.ok) throw new Error('Failed to get account info')

        const data = await response.json() as {
            data?: {
                usage?: number
                limit?: number | null
                is_free_tier?: boolean
            }
        }

        return {
            provider: 'openrouter',
            balance: data.data?.limit ? data.data.limit - (data.data.usage || 0) : undefined,
            currency: 'USD',
            tier: data.data?.is_free_tier ? 'free' : 'paid'
        }
    }

    private async pingProvider(name: string, config: ProviderConfig): Promise<void> {
        switch (name) {
            case 'openrouter':
                await fetch(`${OPENROUTER_BASE_URL}/models`, {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                })
                break
            case 'openai':
                await fetch(`${OPENAI_BASE_URL}/models`, {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                })
                break
            default:
                // Skip ping for providers without simple ping endpoints
                break
        }
    }

    private mapToResponse(data: any, model: string): ChatCompletionResponse {
        return {
            id: data.id || randomUUID(),
            object: 'chat.completion',
            created: data.created || Math.floor(Date.now() / 1000),
            model: data.model || model,
            choices: data.choices.map((choice: any, index: number) => ({
                index,
                message: {
                    role: 'assistant',
                    content: choice.message?.content || null,
                    ...(choice.message?.tool_calls && {
                        toolCalls: choice.message.tool_calls.map((tc: any) => ({
                            id: tc.id,
                            type: tc.type,
                            function: {
                                name: tc.function.name,
                                arguments: tc.function.arguments
                            }
                        }))
                    })
                },
                finishReason: choice.finish_reason
            })),
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            }
        }
    }

    private async summarize(
        messages: Array<{ role: string; content: string }>,
        options?: { maxTokens?: number; temperature?: number }
    ): Promise<string> {
        // Use the first available provider for summarization
        const provider = this.configs.openrouter || this.configs.openai || this.configs.anthropic

        if (!provider) {
            throw new ServiceUnavailableError('No LLM provider configured for summarization')
        }

        const response = await this.createCompletion({
            model: 'openai/gpt-4o-mini', // Use efficient model for summarization
            messages: messages.map(m => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content
            })),
            maxTokens: options?.maxTokens || 500,
            temperature: options?.temperature || 0.3,
            stream: false
        })

        return response.choices[0]?.message?.content || ''
    }
}
