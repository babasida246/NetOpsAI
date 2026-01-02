import { OpenAIClient } from './OpenAIClient.js'
import { AnthropicClient } from './AnthropicClient.js'
import { GoogleClient } from './GoogleClient.js'
import { OpenRouterClient } from './OpenRouterClient.js'
import { MockLLMClient } from './MockLLMClient.js'
import type { ExtendedLLMClient, ProviderName, OpenAIConfig, AnthropicConfig, GoogleConfig, OpenRouterConfig } from './types.js'

export interface ProviderConfigs {
    openai?: Partial<OpenAIConfig> & { apiKey: string }
    anthropic?: Partial<AnthropicConfig> & { apiKey: string }
    google?: Partial<GoogleConfig> & { apiKey: string }
    openrouter?: Partial<OpenRouterConfig> & { apiKey: string }
}

export class ProviderFactory {
    private clients: Map<ProviderName, ExtendedLLMClient> = new Map()
    private configs: ProviderConfigs

    constructor(configs: ProviderConfigs) {
        this.configs = configs
    }

    /**
     * Get or create a client for the specified provider
     */
    getClient(provider: ProviderName): ExtendedLLMClient {
        if (this.clients.has(provider)) {
            return this.clients.get(provider)!
        }

        const client = this.createClient(provider)
        this.clients.set(provider, client)
        return client
    }

    /**
     * Create a new client for the specified provider
     */
    createClient(provider: ProviderName): ExtendedLLMClient {
        switch (provider) {
            case 'openai': {
                const config = this.configs.openai
                if (!config) throw new Error('OpenAI config not provided')
                return new OpenAIClient(config)
            }
            case 'anthropic': {
                const config = this.configs.anthropic
                if (!config) throw new Error('Anthropic config not provided')
                return new AnthropicClient(config)
            }
            case 'google': {
                const config = this.configs.google
                if (!config) throw new Error('Google config not provided')
                return new GoogleClient(config)
            }
            case 'openrouter': {
                const config = this.configs.openrouter
                if (!config) throw new Error('OpenRouter config not provided')
                return new OpenRouterClient(config)
            }
            default:
                throw new Error(`Unknown provider: ${provider}`)
        }
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): ProviderName[] {
        return Object.keys(this.configs).filter(
            key => this.configs[key as keyof ProviderConfigs]?.apiKey
        ) as ProviderName[]
    }

    /**
     * Check health of all configured providers
     */
    async healthCheckAll(): Promise<Record<ProviderName, { available: boolean; latency: number }>> {
        const providers = this.getAvailableProviders()
        const results: Record<string, { available: boolean; latency: number }> = {}

        await Promise.all(
            providers.map(async provider => {
                try {
                    const client = this.getClient(provider)
                    results[provider] = await client.health()
                } catch {
                    results[provider] = { available: false, latency: 0 }
                }
            })
        )

        return results as Record<ProviderName, { available: boolean; latency: number }>
    }

    /**
     * Get account info for all configured providers
     */
    async getAccountInfoAll(): Promise<Record<ProviderName, import('./types.js').AccountInfo>> {
        const providers = this.getAvailableProviders()
        const results: Record<string, import('./types.js').AccountInfo> = {}

        await Promise.all(
            providers.map(async provider => {
                try {
                    const client = this.getClient(provider)
                    results[provider] = await client.getAccountInfo()
                } catch {
                    results[provider] = { provider }
                }
            })
        )

        return results as Record<ProviderName, import('./types.js').AccountInfo>
    }

    /**
     * Get all available models across all providers
     */
    async getAllModels(): Promise<import('./types.js').ModelInfo[]> {
        const providers = this.getAvailableProviders()
        const models: import('./types.js').ModelInfo[] = []

        await Promise.all(
            providers.map(async provider => {
                try {
                    const client = this.getClient(provider)
                    const providerModels = await client.listModels()
                    models.push(...providerModels)
                } catch {
                    // Ignore errors
                }
            })
        )

        return models
    }

    /**
     * Create a mock client for testing
     */
    static createMockClient(config?: Partial<import('./MockLLMClient.js').MockConfig>): MockLLMClient {
        return new MockLLMClient(config)
    }

    /**
     * Parse model string to get provider
     * Supports formats: "provider/model" or just "model"
     */
    static parseModelString(model: string): { provider: ProviderName | null; model: string } {
        if (model.includes('/')) {
            const [provider, ...rest] = model.split('/')
            const providerName = provider.toLowerCase()

            // Map common provider names
            const providerMap: Record<string, ProviderName> = {
                'openai': 'openai',
                'anthropic': 'anthropic',
                'claude': 'anthropic',
                'google': 'google',
                'gemini': 'google',
                'openrouter': 'openrouter'
            }

            return {
                provider: providerMap[providerName] || null,
                model: model // Keep full model name for OpenRouter
            }
        }

        // Detect provider from model name
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

        return { provider: null, model }
    }
}
