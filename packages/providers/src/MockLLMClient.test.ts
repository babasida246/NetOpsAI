import { describe, it, expect } from 'vitest'
import { MockLLMClient } from './MockLLMClient.js'
import { createMessage } from '@domain/core'

describe('MockLLMClient', () => {
    it('returns mock response', async () => {
        const client = new MockLLMClient({
            responseTemplate: 'Mock response'
        })

        const response = await client.chat({
            model: 'mock',
            messages: [createMessage({ role: 'user', content: 'Hello' })]
        })

        expect(response.content).toBe('Mock response')
        expect(response.usage.totalCost).toBe(0)
    })

    it('simulates tool calls', async () => {
        const client = new MockLLMClient({
            simulateToolCalls: true
        })

        const response = await client.chat({
            model: 'mock',
            messages: [createMessage({ role: 'user', content: 'Use tools' })]
        })

        expect(response.toolCalls).toBeDefined()
        expect(response.toolCalls?.length).toBeGreaterThan(0)
    })

    it('simulates latency', async () => {
        const client = new MockLLMClient({
            latency: 100
        })

        const start = Date.now()
        await client.chat({
            model: 'mock',
            messages: [createMessage({ role: 'user', content: 'Hello' })]
        })
        const duration = Date.now() - start

        expect(duration).toBeGreaterThanOrEqual(100)
    })

    it('streams response', async () => {
        const client = new MockLLMClient({
            responseTemplate: 'Hello world'
        })

        const chunks: string[] = []
        for await (const chunk of client.chatStream({
            model: 'mock',
            messages: [createMessage({ role: 'user', content: 'Test' })]
        })) {
            if (chunk.delta.content) {
                chunks.push(chunk.delta.content)
            }
        }

        expect(chunks.length).toBeGreaterThan(0)
    })
})
