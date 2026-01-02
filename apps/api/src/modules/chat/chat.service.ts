/**
 * Chat Service - LLM Provider Integration
 */
import { env } from '../../config/env.js'
import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelInfo
} from './chat.schema.js'
import { BadRequestError, ServiceUnavailableError } from '../../shared/errors/http-errors.js'
import { randomUUID } from 'crypto'

interface LLMProviderConfig {
    apiKey: string
    baseUrl: string
}

export class ChatService {
    private config: LLMProviderConfig

    constructor() {
        this.config = {
            apiKey: env.OPENROUTER_API_KEY || '',
            baseUrl: 'https://openrouter.ai/api/v1'
        }
    }

    async createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        if (!this.config.apiKey) {
            throw new ServiceUnavailableError('LLM provider not configured')
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'HTTP-Referer': 'https://gateway-api.local',
                    'X-Title': 'Gateway API'
                },
                body: JSON.stringify({
                    model: request.model,
                    messages: request.messages.map(m => ({
                        role: m.role,
                        content: m.content,
                        ...(m.name && { name: m.name }),
                        ...(m.toolCallId && { tool_call_id: m.toolCallId })
                    })),
                    temperature: request.temperature,
                    max_tokens: request.maxTokens,
                    top_p: request.topP,
                    stream: false,
                    stop: request.stop,
                    presence_penalty: request.presencePenalty,
                    frequency_penalty: request.frequencyPenalty,
                    tools: request.tools,
                    tool_choice: request.toolChoice
                })
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({}))
                throw new BadRequestError(
                    (error as any).error?.message || `LLM provider error: ${response.status}`
                )
            }

            const data = await response.json() as any

            return {
                id: data.id || randomUUID(),
                object: 'chat.completion',
                created: data.created || Math.floor(Date.now() / 1000),
                model: data.model || request.model,
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
        } catch (error) {
            if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
                throw error
            }
            throw new ServiceUnavailableError(
                `Failed to connect to LLM provider: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    async *createStreamingCompletion(request: ChatCompletionRequest): AsyncGenerator<string> {
        if (!this.config.apiKey) {
            throw new ServiceUnavailableError('LLM provider not configured')
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'HTTP-Referer': 'https://gateway-api.local',
                    'X-Title': 'Gateway API'
                },
                body: JSON.stringify({
                    model: request.model,
                    messages: request.messages.map(m => ({
                        role: m.role,
                        content: m.content,
                        ...(m.name && { name: m.name }),
                        ...(m.toolCallId && { tool_call_id: m.toolCallId })
                    })),
                    temperature: request.temperature,
                    max_tokens: request.maxTokens,
                    top_p: request.topP,
                    stream: true,
                    stop: request.stop,
                    presence_penalty: request.presencePenalty,
                    frequency_penalty: request.frequencyPenalty,
                    tools: request.tools,
                    tool_choice: request.toolChoice
                })
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({}))
                throw new BadRequestError(
                    (error as any).error?.message || `LLM provider error: ${response.status}`
                )
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new ServiceUnavailableError('No response body')
            }

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
                        if (data === '[DONE]') {
                            return
                        }
                        yield `data: ${data}\n\n`
                    }
                }
            }
        } catch (error) {
            if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
                throw error
            }
            throw new ServiceUnavailableError(
                `Failed to connect to LLM provider: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    async getModels(): Promise<ModelInfo[]> {
        // Return default models - can be extended to fetch from provider
        return [
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
                id: 'google/gemini-2.0-flash-001',
                name: 'Gemini 2.0 Flash',
                provider: 'google',
                contextLength: 1000000,
                pricing: { prompt: 0.1, completion: 0.4 },
                capabilities: ['chat', 'function_calling', 'vision']
            }
        ]
    }
}
