import { describe, it, expect } from 'vitest'

const runIntegration = process.env.RUN_INTEGRATION === 'true'
const cloudBase = process.env.CLOUD_BASE_URL ?? ''
const edgeBase = process.env.EDGE_BASE_URL ?? ''

const itMaybe = runIntegration ? it : it.skip

async function waitForOk(url: string, retries = 10, delayMs = 1000): Promise<void> {
    let lastError: unknown
    for (let i = 0; i < retries; i += 1) {
        try {
            const response = await fetch(url)
            if (response.ok) return
            lastError = new Error(`Health check failed: ${response.status}`)
        } catch (error) {
            lastError = error
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    throw lastError
}

describe('integration: cloud and edge', () => {
    itMaybe('health checks are reachable', async () => {
        expect(cloudBase, 'CLOUD_BASE_URL required').toBeTruthy()
        expect(edgeBase, 'EDGE_BASE_URL required').toBeTruthy()

        await waitForOk(`${cloudBase}/health`)
        await waitForOk(`${edgeBase}/health`)
    })

    itMaybe.todo('auth login + feature gate flow')
    itMaybe.todo('cloud dispatch job -> edge mock -> cloud receives result')
    itMaybe.todo('audit correlationId chain exists')
})
