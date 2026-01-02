import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai'
import type { LLMRequest, LLMResponse, StreamChunk, TokenUsage } from '@contracts/shared'
import {
    ExtendedLLMClient,
    AccountInfo,
    ModelInfo,
    GoogleConfig,
    GoogleConfigSchema,
    ProviderError
} from './types.js'

// Google Gemini pricing per 1M tokens (as of Dec 2024)
const PRICING: Record<string, { prompt: number; completion: number }> = {
    'gemini-2.0-flash-exp': { prompt: 0, completion: 0 }, // Free during preview
    'gemini-1.5-pro': { prompt: 1.25, completion: 5 },
    'gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
    'gemini-1.5-flash-8b': { prompt: 0.0375, completion: 0.15 },
    'gemini-1.0-pro': { prompt: 0.5, completion: 1.5 }
}

const MODELS: ModelInfo[] = [
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        provider: 'google',
        contextLength: 1000000,
        pricing: PRICING['gemini-2.0-flash-exp'],
        capabilities: ['chat', 'vision', 'function_calling', 'code_execution']
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextLength: 2000000,
        pricing: PRICING['gemini-1.5-pro'],
        capabilities: ['chat', 'vision', 'function_calling', 'audio', 'video']
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        contextLength: 1000000,
        pricing: PRICING['gemini-1.5-flash'],
        capabilities: ['chat', 'vision', 'function_calling']
    },
    {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash 8B',
        provider: 'google',
        contextLength: 1000000,
        pricing: PRICING['gemini-1.5-flash-8b'],
        capabilities: ['chat', 'function_calling']
    }
]

export class GoogleClient implements ExtendedLLMClient {
    readonly provider = 'google' as const
    private client: GoogleGenerativeAI
    private config: GoogleConfig

    constructor(config: Partial<GoogleConfig> & { apiKey: string }) {
        this.config = GoogleConfigSchema.parse({
            ...config,
            defaultModel: config.defaultModel ?? 'gemini-1.5-flash',
            timeout: config.timeout ?? 60000,
            maxRetries: config.maxRetries ?? 3
        })

        this.client = new GoogleGenerativeAI(this.config.apiKey)
    }

    private getModel(modelId?: string): GenerativeModel {
        return this.client.getGenerativeModel({
            model: modelId || this.config.defaultModel!
        })
    }

    async chat(request: LLMRequest): Promise<LLMResponse> {
        try {
            const model = this.getModel(request.model)

            // Extract system instruction
            const systemMessage = request.messages.find(m => m.role === 'system')

            // Convert messages to Gemini format
            const contents: Content[] = request.messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))

            const generationConfig: Record<string, unknown> = {}
            if (request.temperature !== undefined) {
                generationConfig.temperature = request.temperature
            }
            if (request.maxTokens !== undefined) {
                generationConfig.maxOutputTokens = request.maxTokens
            }

            const result = await model.generateContent({
                contents,
                systemInstruction: systemMessage?.content,
                generationConfig,
                // Tools mapping - cast to any to avoid strict typing issues
                tools: request.tools ? [{
                    functionDeclarations: request.tools.map(t => ({
                        name: t.name,
                        description: t.description,
                        parameters: t.inputSchema as any
                    }))
                }] : undefined
            })

            const response = result.response
            const text = response.text()
            const modelName = request.model || this.config.defaultModel!
            const usage = this.calculateUsage(response.usageMetadata, modelName)

            // Extract function calls
            const functionCalls = response.functionCalls()
            const toolCalls = functionCalls?.map((fc, i) => ({
                id: `call_${i}`,
                type: 'function' as const,
                function: {
                    name: fc.name,
                    arguments: JSON.stringify(fc.args)
                }
            }))

            const finishReason = response.candidates?.[0]?.finishReason

            return {
                id: `gemini-${Date.now()}`,
                model: modelName,
                content: text,
                toolCalls: toolCalls?.length ? toolCalls : undefined,
                finishReason: this.mapFinishReason(finishReason),
                usage
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async *chatStream(request: LLMRequest): AsyncIterable<StreamChunk> {
        try {
            const model = this.getModel(request.model)

            // Extract system instruction
            const systemMessage = request.messages.find(m => m.role === 'system')

            // Convert messages to Gemini format
            const contents: Content[] = request.messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))

            const generationConfig: Record<string, unknown> = {}
            if (request.temperature !== undefined) {
                generationConfig.temperature = request.temperature
            }
            if (request.maxTokens !== undefined) {
                generationConfig.maxOutputTokens = request.maxTokens
            }

            const result = await model.generateContentStream({
                contents,
                systemInstruction: systemMessage?.content,
                generationConfig
            })

            let chunkIndex = 0
            for await (const chunk of result.stream) {
                const text = chunk.text()
                if (text) {
                    yield {
                        id: `gemini-chunk-${chunkIndex++}`,
                        delta: { content: text }
                    }
                }
            }

            yield {
                id: `gemini-chunk-${chunkIndex}`,
                delta: {},
                finishReason: 'stop'
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async health(): Promise<{ available: boolean; latency: number }> {
        const start = Date.now()
        try {
            const model = this.getModel('gemini-1.5-flash')
            await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: 1 }
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
        // Google AI Studio doesn't expose account info via API
        return {
            provider: 'google',
            rateLimit: {
                requestsPerMinute: 1000,    // Free tier
                tokensPerMinute: 4000000
            }
        }
    }

    async listModels(): Promise<ModelInfo[]> {
        // Google doesn't have a public models list API for Gemini
        return MODELS
    }

    private calculateUsage(
        usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
        model: string
    ): TokenUsage {
        const promptTokens = usageMetadata?.promptTokenCount || 0
        const completionTokens = usageMetadata?.candidatesTokenCount || 0
        const pricing = PRICING[model] || PRICING['gemini-1.5-flash']

        return {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            totalCost: (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1_000_000
        }
    }

    private mapFinishReason(reason: string | undefined): 'stop' | 'length' | 'tool_calls' {
        switch (reason) {
            case 'MAX_TOKENS':
                return 'length'
            case 'STOP':
            default:
                return 'stop'
        }
    }

    private handleError(error: unknown): ProviderError {
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (errorMessage.includes('API_KEY')) {
            return ProviderError.authError('google')
        }
        if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('429')) {
            return ProviderError.rateLimitError('google')
        }
        if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
            return ProviderError.modelNotFound('google', 'unknown')
        }

        return ProviderError.serverError('google', errorMessage)
    }
}
