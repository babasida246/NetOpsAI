/**
 * Integrated Chat Service with Full Tracking
 * Combines chat completion with token tracking, cost calculation, and context management
 */
import type { Pool } from 'pg'
import { EnhancedChatService } from './enhanced-chat.service.js'
import { ChatStatsRepository } from './chat-stats.repository.js'
import { ConversationRepository } from '../conversations/conversations.repository.js'
import type { ChatCompletionRequest, ChatCompletionResponse } from './chat.schema.js'
import type { Redis } from 'ioredis'
import { env } from '../../config/env.js'
import { BadRequestError } from '../../shared/errors/http-errors.js'

export interface ChatOptions {
    userId: string
    conversationId?: string
    saveToDb?: boolean
    trackUsage?: boolean
}

export interface ChatResult {
    response: ChatCompletionResponse
    conversationId: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
        estimatedCost: number
    }
    model: string
    provider: string
    latencyMs: number
}

export class IntegratedChatService {
    private chatService: EnhancedChatService
    private statsRepo: ChatStatsRepository
    private conversationRepo: ConversationRepository

    constructor(
        private db: Pool,
        redis?: Redis
    ) {
        this.chatService = new EnhancedChatService({ db, redis })
        this.statsRepo = new ChatStatsRepository(db)
        this.conversationRepo = new ConversationRepository(db)
    }

    /**
     * Send a chat message with full tracking
     */
    async chat(request: ChatCompletionRequest, options: ChatOptions): Promise<ChatResult> {
        const startTime = Date.now()

        // Get or create conversation
        let conversationId = options.conversationId
        if (!conversationId && options.saveToDb) {
            const conversation = await this.conversationRepo.create(options.userId, {
                title: this.extractTitle(request.messages),
                model: request.model
            })
            conversationId = conversation.id
        }

        // Execute chat completion
        const response = await this.chatService.createCompletion(request, {
            userId: options.userId,
            conversationId,
            saveToMemory: options.saveToDb
        })

        const latencyMs = Date.now() - startTime

        // Parse model and provider
        const { model, provider } = this.parseModelString(request.model)

        // Calculate cost
        const estimatedCost = await this.calculateCost(
            model,
            provider,
            response.usage?.promptTokens || 0,
            response.usage?.completionTokens || 0
        )

        // Save message to database if requested
        if (options.saveToDb && conversationId) {
            await this.saveMessages(
                conversationId,
                request.messages[request.messages.length - 1],
                response.choices[0]?.message,
                {
                    model,
                    provider,
                    promptTokens: response.usage?.promptTokens || 0,
                    completionTokens: response.usage?.completionTokens || 0,
                    cost: estimatedCost,
                    latencyMs
                }
            )
        }

        // Track performance
        if (options.trackUsage) {
            await this.statsRepo.recordModelPerformance({
                model,
                provider,
                successful: true,
                latencyMs,
                tokens: response.usage?.totalTokens || 0,
                cost: estimatedCost
            }).catch(err => console.error('Failed to record performance:', err))
        }

        return {
            response,
            conversationId: conversationId || '',
            usage: {
                promptTokens: response.usage?.promptTokens || 0,
                completionTokens: response.usage?.completionTokens || 0,
                totalTokens: response.usage?.totalTokens || 0,
                estimatedCost
            },
            model,
            provider,
            latencyMs
        }
    }

    /**
     * Get token usage statistics for a conversation
     */
    async getConversationStats(conversationId: string) {
        return await this.statsRepo.getConversationTokenUsage(conversationId)
    }

    /**
     * Get user token usage statistics
     */
    async getUserStats(userId: string, startDate?: Date, endDate?: Date) {
        return await this.statsRepo.getUserTokenStats(userId, startDate, endDate)
    }

    /**
     * Get daily usage summary
     */
    async getDailySummary(userId: string, date?: Date) {
        return await this.statsRepo.getDailyUsageSummary(userId, date)
    }

    /**
     * List available models
     */
    async listModels(filters?: { provider?: string; tier?: number; enabled?: boolean }) {
        return await this.statsRepo.listModels(filters)
    }

    async createModel(data: any) {
        return await this.statsRepo.createModel(data)
    }

    async deleteModel(id: string) {
        return await this.statsRepo.deleteModel(id)
    }

    /**
     * Get model details
     */
    async getModel(modelId: string) {
        return await this.statsRepo.getModel(modelId)
    }

    /**
     * List AI providers
     */
    async listProviders() {
        return await this.statsRepo.listProviders()
    }

    async createProvider(data: any) {
        return await this.statsRepo.createProvider(data)
    }

    async deleteProvider(id: string) {
        return await this.statsRepo.deleteProvider(id)
    }

    /**
     * Get orchestration rules
     */
    async getOrchestrationRules(enabledOnly = false) {
        return await this.statsRepo.listOrchestrationRules(enabledOnly)
    }

    /**
     * Create orchestration rule
     */
    async createOrchestrationRule(rule: {
        name: string
        description?: string
        strategy: 'fallback' | 'load_balance' | 'cost_optimize' | 'quality_first' | 'custom'
        modelSequence: string[]
        conditions?: Record<string, any>
        enabled?: boolean
        priority?: number
    }) {
        return await this.statsRepo.createOrchestrationRule({
            ...rule,
            enabled: rule.enabled ?? true,
            priority: rule.priority ?? 100,
            conditions: rule.conditions || {},
            metadata: {}
        })
    }

    /**
     * Update orchestration rule
     */
    async updateOrchestrationRule(ruleId: string, updates: any) {
        return await this.statsRepo.updateOrchestrationRule(ruleId, updates)
    }

    /**
     * Delete orchestration rule
     */
    async deleteOrchestrationRule(ruleId: string) {
        return await this.statsRepo.deleteOrchestrationRule(ruleId)
    }

    /**
     * Get model performance metrics
     */
    async getModelPerformance(model: string, days = 7) {
        return await this.statsRepo.getModelPerformance(model, days)
    }

    /**
     * Update model priority
     */
    async updateModelPriority(modelId: string, priority: number) {
        return await this.statsRepo.updateModelPriority(modelId, priority)
    }

    async updateModel(modelId: string, updates: any) {
        return await this.statsRepo.updateModel(modelId, updates)
    }

    async updateProvider(providerId: string, updates: any) {
        return await this.statsRepo.updateProvider(providerId, updates)
    }

    async getModelHistory(modelId: string, days?: number) {
        return await this.statsRepo.getModelHistory(modelId, days)
    }

    async getProviderHistory(providerId: string, days?: number) {
        return await this.statsRepo.getProviderHistory(providerId, days)
    }

    async listUsageLogs(limit?: number) {
        return await this.statsRepo.listUsageLogs(limit)
    }

    async checkProviderHealth(providerId: string) {
        const provider = await this.statsRepo.getProvider(providerId)
        if (!provider) {
            throw new Error('Provider not found')
        }

        const headers: Record<string, string> = {}
        const apiKey = this.resolveApiKey(provider)
        if (apiKey && provider.authType === 'bearer') {
            headers.Authorization = `Bearer ${apiKey}`
        }

        const url = provider.apiEndpoint || `https://${provider.id}.com`
        const start = Date.now()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        try {
            const resp = await fetch(url, { method: 'GET', headers, signal: controller.signal })
            const latencyMs = Date.now() - start
            return {
                status: resp.ok ? 'healthy' : 'degraded',
                statusCode: resp.status,
                latencyMs,
                message: resp.statusText
            }
        } catch (err: any) {
            return {
                status: 'unreachable',
                statusCode: 0,
                latencyMs: null,
                message: err?.message || 'unreachable'
            }
        } finally {
            clearTimeout(timeout)
        }
    }

    private resolveOpenRouterKey() {
        return env.OPENROUTER_API_KEY
    }

    async fetchOpenRouterModels(search?: string, page = 1, limit = 50) {
        const provider = await this.statsRepo.getProvider('openrouter')
        const key = provider?.apiKey || this.resolveOpenRouterKey()
        if (!key) {
            return []
        }
        const resp = await this.openRouterFetch('/models', key)
        const models = (resp?.data || []) as Array<any>
        const filtered = search
            ? models.filter(m =>
                (m.id && m.id.toLowerCase().includes(search.toLowerCase())) ||
                (m.name && m.name.toLowerCase().includes(search.toLowerCase()))
            )
            : models

        const start = (page - 1) * limit
        const slice = filtered.slice(start, start + limit)

        return slice.map(m => ({
            id: m.id,
            name: m.name || m.id,
            description: m.description || '',
            pricing: m.pricing || {},
            contextLength: m.context_length,
            provider: 'openrouter'
        }))
    }

    async importOpenRouterModel(modelId: string, priority = 100) {
        const models = await this.fetchOpenRouterModels()
        const match = models.find(m => m.id === modelId)
        if (!match) {
            throw new Error('Model not found on OpenRouter')
        }

        const costIn = match.pricing?.prompt ?? undefined
        const costOut = match.pricing?.completion ?? undefined

        return await this.statsRepo.createModel({
            id: `openrouter/${match.id}`,
            provider: 'openrouter',
            displayName: match.name,
            description: match.description,
            tier: 0,
            priority,
            contextWindow: match.contextLength,
            costPer1kInput: costIn,
            costPer1kOutput: costOut,
            supportsStreaming: true,
            supportsFunctions: true,
            supportsVision: true,
            enabled: true,
            status: 'active',
            capabilities: {}
        } as any)
    }

    async getOpenRouterAccountActivity() {
        const provider = await this.statsRepo.getProvider('openrouter')
        const key = provider?.apiKey || this.resolveOpenRouterKey()
        if (!key) return { message: 'OpenRouter API key not configured; skipping account fetch' }
        return await this.openRouterFetch('/analytics/user-activity', key)
    }

    async getOpenRouterCredits() {
        const provider = await this.statsRepo.getProvider('openrouter')
        const key = provider?.apiKey || this.resolveOpenRouterKey()
        if (!key) return { message: 'OpenRouter API key not configured; skipping credits fetch' }
        return await this.openRouterFetch('/credits', key)
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private parseModelString(modelStr: string): { model: string; provider: string } {
        const parts = modelStr.split('/')
        if (parts.length === 2) {
            return { provider: parts[0], model: modelStr }
        }
        return { provider: 'openai', model: modelStr }
    }

    private async calculateCost(
        model: string,
        provider: string,
        promptTokens: number,
        completionTokens: number
    ): Promise<number> {
        const modelConfig = await this.statsRepo.getModel(model)

        if (!modelConfig || !modelConfig.costPer1kInput || !modelConfig.costPer1kOutput) {
            // Default costs if not configured (rough estimates)
            const inputCost = (promptTokens / 1000) * 0.0001
            const outputCost = (completionTokens / 1000) * 0.0002
            return inputCost + outputCost
        }

        const inputCost = (promptTokens / 1000) * modelConfig.costPer1kInput
        const outputCost = (completionTokens / 1000) * modelConfig.costPer1kOutput

        return inputCost + outputCost
    }

    private async saveMessages(
        conversationId: string,
        userMessage: any,
        assistantMessage: any,
        metadata: {
            model: string
            provider: string
            promptTokens: number
            completionTokens: number
            cost: number
            latencyMs: number
        }
    ): Promise<void> {
        // Save user message
        if (userMessage) {
            await this.db.query(
                `INSERT INTO messages (conversation_id, role, content, model, provider, token_count, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                    conversationId,
                    userMessage.role,
                    userMessage.content,
                    metadata.model,
                    metadata.provider,
                    metadata.promptTokens
                ]
            )
        }

        // Save assistant message
        if (assistantMessage && assistantMessage.content) {
            await this.db.query(
                `INSERT INTO messages (
                    conversation_id, role, content, model, provider,
                    prompt_tokens, completion_tokens, token_count,
                    cost, latency_ms, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                [
                    conversationId,
                    assistantMessage.role,
                    assistantMessage.content,
                    metadata.model,
                    metadata.provider,
                    metadata.promptTokens,
                    metadata.completionTokens,
                    metadata.promptTokens + metadata.completionTokens,
                    metadata.cost,
                    metadata.latencyMs
                ]
            )
        }
    }

    private extractTitle(messages: any[]): string {
        const userMessage = messages.find(m => m.role === 'user')
        if (userMessage && userMessage.content) {
            const content = userMessage.content.substring(0, 50)
            return content.length < userMessage.content.length ? `${content}...` : content
        }
        return 'New Chat'
    }

    private resolveApiKey(provider?: any): string | undefined {
        if (provider?.apiKey) return provider.apiKey
        if (provider?.id === 'openrouter') return env.OPENROUTER_API_KEY
        if (provider?.id === 'openai') return env.OPENAI_API_KEY
        if (provider?.id === 'anthropic') return env.ANTHROPIC_API_KEY
        if (provider?.id === 'google') return env.GOOGLE_API_KEY
        return undefined
    }

    private async openRouterFetch(path: string, apiKey?: string): Promise<any> {
        const key = apiKey || env.OPENROUTER_API_KEY
        if (!key) {
            throw new BadRequestError('OpenRouter API key not configured')
        }

        const resp = await fetch(`https://openrouter.ai/api/v1${path}`, {
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        })

        if (!resp.ok) {
            const text = await resp.text().catch(() => resp.statusText)
            throw new BadRequestError(text || `OpenRouter error: ${resp.statusText}`, { status: resp.status })
        }

        return resp.json()
    }
}
