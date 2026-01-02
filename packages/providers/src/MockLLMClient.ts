import type { LLMClient, LLMRequest, LLMResponse, StreamChunk } from '@contracts/shared'

export interface MockConfig {
    responseTemplate?: string
    simulateToolCalls?: boolean
    latency?: number
    failureRate?: number
}

export class MockLLMClient implements LLMClient {
    constructor(private config: MockConfig = {}) { }

    async chat(request: LLMRequest): Promise<LLMResponse> {
        // Simulate latency
        if (this.config.latency) {
            await this.delay(this.config.latency)
        }

        // Simulate failures
        if (this.config.failureRate && Math.random() < this.config.failureRate) {
            throw new Error('Simulated LLM failure')
        }

        // Check for context-aware responses
        const lastMessage = request.messages[request.messages.length - 1].content.toLowerCase()
        const allMessages = request.messages.map(m => m.content.toLowerCase()).join(' ')

        let content: string
        if (lastMessage.includes('what is my name') && allMessages.includes('alice')) {
            content = 'Based on our conversation, your name is Alice.'
        } else {
            content = this.config.responseTemplate ||
                `Mock response to: ${request.messages[request.messages.length - 1].content}`
        }

        const promptTokens = request.messages.reduce((sum, m) => sum + m.tokenCount, 0)
        const completionTokens = Math.ceil(content.split(/\s+/).length * 1.3)

        return {
            id: `mock_${Date.now()}`,
            model: request.model,
            content,
            finishReason: 'stop',
            toolCalls: this.config.simulateToolCalls ? this.mockToolCalls() : undefined,
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                totalCost: 0 // Free for mock
            }
        }
    }

    async *chatStream(request: LLMRequest): AsyncIterable<StreamChunk> {
        const content = this.config.responseTemplate ||
            `Mock response to: ${request.messages[request.messages.length - 1].content}`

        const words = content.split(' ')

        for (let i = 0; i < words.length; i++) {
            await this.delay(50)

            yield {
                id: `mock_chunk_${i}`,
                delta: {
                    content: words[i] + ' '
                },
                finishReason: i === words.length - 1 ? 'stop' : undefined
            }
        }
    }

    async health(): Promise<{ available: boolean; latency: number }> {
        const start = Date.now()
        await this.delay(10)
        return {
            available: true,
            latency: Date.now() - start
        }
    }

    private mockToolCalls(): any[] {
        return [
            {
                id: 'call_1',
                type: 'function',
                function: {
                    name: 'mock_tool',
                    arguments: JSON.stringify({ param: 'value' })
                }
            }
        ]
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
