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
}
