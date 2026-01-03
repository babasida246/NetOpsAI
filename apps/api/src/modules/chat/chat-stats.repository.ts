/**
 * Chat Stats and Management Repository
 * Handles token usage, cost tracking, and model orchestration
 */
import type { Pool } from 'pg'

// ============================================================================
// TYPES
// ============================================================================

export interface TokenUsageStats {
    conversationId: string
    model: string
    provider: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
    messageCount: number
    date: string
}

export interface UserTokenStats {
    userId: string
    date: string
    model: string
    provider: string
    totalTokens: number
    totalCost: number
    messageCount: number
    conversationCount: number
}

export interface ModelPerformance {
    model: string
    provider: string
    date: string
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    avgLatencyMs: number
    avgTokensPerRequest: number
    totalCost: number
    qualityScore?: number
}

export interface UsageHistoryEntry {
    date: string
    totalTokens: number
    totalCost: number
    messageCount?: number
    creditsUsed?: number
}

export interface AIProvider {
    id: string
    name: string
    description?: string
    apiEndpoint?: string
    apiKey?: string
    authType?: string
    capabilities: Record<string, any>
    status: 'active' | 'inactive' | 'maintenance'
    rateLimitPerMinute?: number
    creditsRemaining?: number
    tokensUsed?: number
    lastUsageAt?: Date
    metadata?: Record<string, any>
    createdAt: Date
    updatedAt: Date
}

export interface ModelConfig {
    id: string
    displayName?: string
    provider: string
    tier: number
    contextWindow?: number
    maxTokens?: number
    costPer1kInput?: number
    costPer1kOutput?: number
    capabilities: Record<string, any>
    enabled: boolean
    supportsStreaming: boolean
    supportsFunctions: boolean
    supportsVision: boolean
    description?: string
    priority: number
    status: 'active' | 'inactive' | 'deprecated'
    createdAt: Date
}

export interface OrchestrationRule {
    id: string
    name: string
    description?: string
    strategy: 'fallback' | 'load_balance' | 'cost_optimize' | 'quality_first' | 'custom'
    modelSequence: string[]
    conditions: Record<string, any>
    enabled: boolean
    priority: number
    metadata?: Record<string, any>
    createdAt: Date
    updatedAt: Date
}

export interface ChatContext {
    id: string
    conversationId: string
    contextType: 'summary' | 'key_points' | 'code_snippet' | 'decision' | 'custom'
    content: string
    tokens: number
    priority: number
    metadata?: Record<string, any>
    createdAt: Date
    updatedAt: Date
}

export interface CreateChatContextRequest {
    conversationId: string
    contextType: ChatContext['contextType']
    content: string
    tokens?: number
    priority?: number
    metadata?: Record<string, any>
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class ChatStatsRepository {
    constructor(private db: Pool) { }

    // ========================================================================
    // TOKEN USAGE & STATS
    // ========================================================================

    async getConversationTokenUsage(conversationId: string): Promise<TokenUsageStats[]> {
        const result = await this.db.query<any>(
            `SELECT 
                conversation_id,
                model,
                provider,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost,
                message_count,
                created_at::date as date
            FROM conversation_token_usage
            WHERE conversation_id = $1
            ORDER BY created_at DESC`,
            [conversationId]
        )

        return result.rows.map(row => ({
            conversationId: row.conversation_id,
            model: row.model,
            provider: row.provider,
            promptTokens: row.prompt_tokens,
            completionTokens: row.completion_tokens,
            totalTokens: row.total_tokens,
            cost: parseFloat(row.cost),
            messageCount: row.message_count,
            date: row.date
        }))
    }

    async getUserTokenStats(userId: string, startDate?: Date, endDate?: Date): Promise<UserTokenStats[]> {
        let query = `
            SELECT 
                user_id,
                date,
                model,
                provider,
                total_tokens,
                total_cost,
                message_count,
                conversation_count
            FROM user_token_stats
            WHERE user_id = $1`

        const params: any[] = [userId]
        let paramIndex = 2

        if (startDate) {
            query += ` AND date >= $${paramIndex}`
            params.push(startDate)
            paramIndex++
        }

        if (endDate) {
            query += ` AND date <= $${paramIndex}`
            params.push(endDate)
            paramIndex++
        }

        query += ` ORDER BY date DESC, model`

        const result = await this.db.query<any>(query, params)

        return result.rows.map(row => ({
            userId: row.user_id,
            date: row.date,
            model: row.model,
            provider: row.provider,
            totalTokens: row.total_tokens,
            totalCost: parseFloat(row.total_cost),
            messageCount: row.message_count,
            conversationCount: row.conversation_count
        }))
    }

    async getDailyUsageSummary(userId: string, date?: Date): Promise<{
        totalTokens: number
        totalCost: number
        totalMessages: number
        modelsUsed: number
    }> {
        const targetDate = date || new Date()
        const result = await this.db.query<any>(
            `SELECT 
                SUM(total_tokens) as total_tokens,
                SUM(total_cost) as total_cost,
                SUM(message_count) as total_messages,
                COUNT(DISTINCT model) as models_used
            FROM user_token_stats
            WHERE user_id = $1 AND date = $2`,
            [userId, targetDate.toISOString().split('T')[0]]
        )

        const row = result.rows[0]
        return {
            totalTokens: parseInt(row.total_tokens || '0'),
            totalCost: parseFloat(row.total_cost || '0'),
            totalMessages: parseInt(row.total_messages || '0'),
            modelsUsed: parseInt(row.models_used || '0')
        }
    }

    // ========================================================================
    // MODEL MANAGEMENT
    // ========================================================================

    async listModels(filters?: { provider?: string; tier?: number; enabled?: boolean }): Promise<ModelConfig[]> {
        let query = `SELECT * FROM model_configs WHERE 1=1`
        const params: any[] = []
        let paramIndex = 1

        if (filters?.provider) {
            query += ` AND provider = $${paramIndex}`
            params.push(filters.provider)
            paramIndex++
        }

        if (filters?.tier !== undefined) {
            query += ` AND tier = $${paramIndex}`
            params.push(filters.tier)
            paramIndex++
        }

        if (filters?.enabled !== undefined) {
            query += ` AND enabled = $${paramIndex}`
            params.push(filters.enabled)
            paramIndex++
        }

        query += ` ORDER BY priority ASC, tier ASC`

        const result = await this.db.query<any>(query, params)
        return result.rows.map(this.mapModelConfig)
    }

    async getModel(modelId: string): Promise<ModelConfig | null> {
        const result = await this.db.query<any>(
            `SELECT * FROM model_configs WHERE id = $1`,
            [modelId]
        )
        return result.rows[0] ? this.mapModelConfig(result.rows[0]) : null
    }

    async createModel(data: {
        id: string
        provider: string
        displayName?: string
        tier?: number
        contextWindow?: number
        maxTokens?: number
        costPer1kInput?: number
        costPer1kOutput?: number
        capabilities?: Record<string, any>
        enabled?: boolean
        supportsStreaming?: boolean
        supportsFunctions?: boolean
        supportsVision?: boolean
        description?: string
        priority?: number
        status?: ModelConfig['status']
    }): Promise<ModelConfig> {
        const result = await this.db.query<any>(
            `INSERT INTO model_configs (
                id, provider, display_name, tier, context_window, max_tokens,
                cost_per_1k_input, cost_per_1k_output, capabilities, enabled,
                supports_streaming, supports_functions, supports_vision, description,
                priority, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16
            )
            RETURNING *`,
            [
                data.id,
                data.provider,
                data.displayName || null,
                data.tier ?? 0,
                data.contextWindow || null,
                data.maxTokens || null,
                data.costPer1kInput || null,
                data.costPer1kOutput || null,
                data.capabilities || {},
                data.enabled ?? true,
                data.supportsStreaming ?? false,
                data.supportsFunctions ?? false,
                data.supportsVision ?? false,
                data.description || null,
                data.priority ?? 100,
                data.status || 'active'
            ]
        )

        return this.mapModelConfig(result.rows[0])
    }

    async deleteModel(modelId: string): Promise<boolean> {
        // Remove the model from any orchestration rule sequences first to avoid downstream errors
        await this.db.query(
            `UPDATE orchestration_rules 
             SET model_sequence = array_remove(model_sequence, $1),
                 updated_at = NOW()
             WHERE $1 = ANY(model_sequence)`,
            [modelId]
        )

        const result = await this.db.query(`DELETE FROM model_configs WHERE id = $1`, [modelId])
        return (result.rowCount || 0) > 0
    }

    async updateModelPriority(modelId: string, priority: number): Promise<void> {
        await this.db.query(
            `UPDATE model_configs SET priority = $1 WHERE id = $2`,
            [priority, modelId]
        )
    }

    async updateModelStatus(modelId: string, status: ModelConfig['status']): Promise<void> {
        await this.db.query(
            `UPDATE model_configs SET status = $1 WHERE id = $2`,
            [status, modelId]
        )
    }

    async updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<void> {
        const fields: string[] = []
        const values: any[] = []
        let idx = 1

        const add = (col: string, value: any) => {
            fields.push(`${col} = $${idx}`)
            values.push(value)
            idx++
        }

        if (updates.description !== undefined) add('description', updates.description)
        if (updates.tier !== undefined) add('tier', updates.tier)
        if (updates.contextWindow !== undefined) add('context_window', updates.contextWindow)
        if (updates.maxTokens !== undefined) add('max_tokens', updates.maxTokens)
        if (updates.costPer1kInput !== undefined) add('cost_per_1k_input', updates.costPer1kInput)
        if (updates.costPer1kOutput !== undefined) add('cost_per_1k_output', updates.costPer1kOutput)
        if (updates.enabled !== undefined) add('enabled', updates.enabled)
        if (updates.supportsStreaming !== undefined) add('supports_streaming', updates.supportsStreaming)
        if (updates.supportsFunctions !== undefined) add('supports_functions', updates.supportsFunctions)
        if (updates.supportsVision !== undefined) add('supports_vision', updates.supportsVision)
        if (updates.priority !== undefined) add('priority', updates.priority)
        if (updates.status !== undefined) add('status', updates.status)
        if (updates.displayName !== undefined) add('display_name', updates.displayName)
        if (updates.capabilities !== undefined) add('capabilities', updates.capabilities)

        if (fields.length === 0) return

        add('updated_at', new Date())
        values.push(modelId)

        await this.db.query(
            `UPDATE model_configs SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        )
    }

    async getModelHistory(modelId: string, days = 30): Promise<UsageHistoryEntry[]> {
        const result = await this.db.query<any>(
            `SELECT usage_date, total_tokens, total_cost, message_count
             FROM model_usage_history
             WHERE model = $1 AND usage_date >= CURRENT_DATE - $2
             ORDER BY usage_date DESC`,
            [modelId, days]
        )

        return result.rows.map(row => ({
            date: row.usage_date,
            totalTokens: parseInt(row.total_tokens || 0, 10),
            totalCost: parseFloat(row.total_cost || 0),
            messageCount: parseInt(row.message_count || 0, 10)
        }))
    }

    // ========================================================================
    // PROVIDER MANAGEMENT
    // ========================================================================

    async listProviders(): Promise<AIProvider[]> {
        const result = await this.db.query<any>(
            `SELECT * FROM ai_providers ORDER BY name`
        )
        return result.rows.map(this.mapProvider)
    }

    async getProvider(providerId: string): Promise<AIProvider | null> {
        const result = await this.db.query<any>(
            `SELECT * FROM ai_providers WHERE id = $1`,
            [providerId]
        )
        return result.rows[0] ? this.mapProvider(result.rows[0]) : null
    }

    async createProvider(data: {
        id: string
        name: string
        description?: string
        apiEndpoint?: string
        apiKey?: string
        authType?: string
        capabilities?: Record<string, any>
        status?: AIProvider['status']
        rateLimitPerMinute?: number
    }): Promise<AIProvider> {
        const result = await this.db.query<any>(
            `INSERT INTO ai_providers (
                id, name, description, api_endpoint, api_key, auth_type, capabilities,
                status, rate_limit_per_minute
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                data.id,
                data.name,
                data.description || null,
                data.apiEndpoint || null,
                data.apiKey || null,
                data.authType || null,
                data.capabilities || {},
                data.status || 'active',
                data.rateLimitPerMinute || null
            ]
        )

        return this.mapProvider(result.rows[0])
    }

    async deleteProvider(providerId: string): Promise<boolean> {
        const result = await this.db.query(`DELETE FROM ai_providers WHERE id = $1`, [providerId])
        return (result.rowCount || 0) > 0
    }

    async updateProviderStatus(providerId: string, status: AIProvider['status']): Promise<void> {
        await this.db.query(
            `UPDATE ai_providers SET status = $1, updated_at = NOW() WHERE id = $2`,
            [status, providerId]
        )
    }

    async updateProvider(providerId: string, updates: Partial<AIProvider> & { apiKey?: string }): Promise<void> {
        const fields: string[] = []
        const values: any[] = []
        let idx = 1

        const add = (col: string, value: any) => {
            fields.push(`${col} = $${idx}`)
            values.push(value)
            idx++
        }

        if (updates.name !== undefined) add('name', updates.name)
        if (updates.description !== undefined) add('description', updates.description)
        if (updates.apiEndpoint !== undefined) add('api_endpoint', updates.apiEndpoint)
        if (updates.apiKey !== undefined) add('api_key', updates.apiKey)
        if (updates.authType !== undefined) add('auth_type', updates.authType)
        if (updates.capabilities !== undefined) add('capabilities', updates.capabilities)
        if (updates.status !== undefined) add('status', updates.status)
        if (updates.rateLimitPerMinute !== undefined) add('rate_limit_per_minute', updates.rateLimitPerMinute)
        if (updates.creditsRemaining !== undefined) add('credits_remaining', updates.creditsRemaining)
        if (updates.tokensUsed !== undefined) add('tokens_used', updates.tokensUsed)
        if (updates.lastUsageAt !== undefined) add('last_usage_at', updates.lastUsageAt)
        if (updates.metadata !== undefined) add('metadata', updates.metadata)

        if (fields.length === 0) return

        add('updated_at', new Date())
        values.push(providerId)

        await this.db.query(
            `UPDATE ai_providers SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        )
    }

    async getProviderHistory(providerId: string, days = 30): Promise<UsageHistoryEntry[]> {
        const result = await this.db.query<any>(
            `SELECT usage_date, total_tokens, total_cost, credits_used
             FROM provider_usage_history
             WHERE provider = $1 AND usage_date >= CURRENT_DATE - $2
             ORDER BY usage_date DESC`,
            [providerId, days]
        )

        return result.rows.map(row => ({
            date: row.usage_date,
            totalTokens: parseInt(row.total_tokens || 0, 10),
            totalCost: parseFloat(row.total_cost || 0),
            creditsUsed: parseFloat(row.credits_used || 0)
        }))
    }

    async listUsageLogs(limit = 100): Promise<Array<{
        conversationId: string
        model: string
        provider: string
        totalTokens: number
        cost: number
        messageCount: number
        date: string
    }>> {
        const result = await this.db.query<any>(
            `SELECT conversation_id, model, provider, total_tokens, cost, message_count, created_at
             FROM conversation_token_usage
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
        )

        return result.rows.map(row => ({
            conversationId: row.conversation_id,
            model: row.model,
            provider: row.provider,
            totalTokens: row.total_tokens,
            cost: parseFloat(row.cost),
            messageCount: row.message_count,
            date: row.created_at
        }))
    }

    // ========================================================================
    // ORCHESTRATION RULES
    // ========================================================================

    async listOrchestrationRules(enabledOnly = false): Promise<OrchestrationRule[]> {
        let query = `SELECT * FROM orchestration_rules`
        if (enabledOnly) {
            query += ` WHERE enabled = true`
        }
        query += ` ORDER BY priority ASC`

        const result = await this.db.query<any>(query)
        return result.rows.map(this.mapOrchestrationRule)
    }

    async getOrchestrationRule(ruleId: string): Promise<OrchestrationRule | null> {
        const result = await this.db.query<any>(
            `SELECT * FROM orchestration_rules WHERE id = $1`,
            [ruleId]
        )
        return result.rows[0] ? this.mapOrchestrationRule(result.rows[0]) : null
    }

    async createOrchestrationRule(rule: Omit<OrchestrationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrchestrationRule> {
        const result = await this.db.query<any>(
            `INSERT INTO orchestration_rules (name, description, strategy, model_sequence, conditions, enabled, priority, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                rule.name,
                rule.description,
                rule.strategy,
                JSON.stringify(rule.modelSequence),
                JSON.stringify(rule.conditions),
                rule.enabled,
                rule.priority,
                JSON.stringify(rule.metadata || {})
            ]
        )
        return this.mapOrchestrationRule(result.rows[0])
    }

    async updateOrchestrationRule(ruleId: string, updates: Partial<OrchestrationRule>): Promise<void> {
        const fields: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex}`)
            values.push(updates.name)
            paramIndex++
        }

        if (updates.description !== undefined) {
            fields.push(`description = $${paramIndex}`)
            values.push(updates.description)
            paramIndex++
        }

        if (updates.strategy !== undefined) {
            fields.push(`strategy = $${paramIndex}`)
            values.push(updates.strategy)
            paramIndex++
        }

        if (updates.modelSequence !== undefined) {
            fields.push(`model_sequence = $${paramIndex}`)
            values.push(JSON.stringify(updates.modelSequence))
            paramIndex++
        }

        if (updates.conditions !== undefined) {
            fields.push(`conditions = $${paramIndex}`)
            values.push(JSON.stringify(updates.conditions))
            paramIndex++
        }

        if (updates.enabled !== undefined) {
            fields.push(`enabled = $${paramIndex}`)
            values.push(updates.enabled)
            paramIndex++
        }

        if (updates.priority !== undefined) {
            fields.push(`priority = $${paramIndex}`)
            values.push(updates.priority)
            paramIndex++
        }

        if (fields.length === 0) return

        fields.push(`updated_at = NOW()`)
        values.push(ruleId)

        await this.db.query(
            `UPDATE orchestration_rules SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            values
        )
    }

    async deleteOrchestrationRule(ruleId: string): Promise<void> {
        await this.db.query(`DELETE FROM orchestration_rules WHERE id = $1`, [ruleId])
    }

    // ========================================================================
    // CHAT CONTEXT MANAGEMENT
    // ========================================================================

    async createChatContext(data: CreateChatContextRequest): Promise<ChatContext> {
        const result = await this.db.query<any>(
            `INSERT INTO chat_contexts (conversation_id, context_type, content, tokens, priority, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                data.conversationId,
                data.contextType,
                data.content,
                data.tokens || 0,
                data.priority || 0,
                JSON.stringify(data.metadata || {})
            ]
        )
        return this.mapChatContext(result.rows[0])
    }

    async getChatContexts(conversationId: string, limit = 10): Promise<ChatContext[]> {
        const result = await this.db.query<any>(
            `SELECT * FROM chat_contexts 
            WHERE conversation_id = $1 
            ORDER BY priority DESC, created_at DESC 
            LIMIT $2`,
            [conversationId, limit]
        )
        return result.rows.map(this.mapChatContext)
    }

    // ========================================================================
    // MODEL PERFORMANCE
    // ========================================================================

    async recordModelPerformance(data: {
        model: string
        provider: string
        successful: boolean
        latencyMs: number
        tokens: number
        cost: number
    }): Promise<void> {
        await this.db.query(
            `INSERT INTO model_performance (model, provider, date, total_requests, successful_requests, failed_requests, avg_latency_ms, avg_tokens_per_request, total_cost)
            VALUES ($1, $2, CURRENT_DATE, 1, $3, $4, $5, $6, $7)
            ON CONFLICT (model, provider, date)
            DO UPDATE SET
                total_requests = model_performance.total_requests + 1,
                successful_requests = model_performance.successful_requests + EXCLUDED.successful_requests,
                failed_requests = model_performance.failed_requests + EXCLUDED.failed_requests,
                avg_latency_ms = (model_performance.avg_latency_ms * model_performance.total_requests + EXCLUDED.avg_latency_ms) / (model_performance.total_requests + 1),
                avg_tokens_per_request = (model_performance.avg_tokens_per_request * model_performance.total_requests + EXCLUDED.avg_tokens_per_request) / (model_performance.total_requests + 1),
                total_cost = model_performance.total_cost + EXCLUDED.total_cost,
                updated_at = NOW()`,
            [
                data.model,
                data.provider,
                data.successful ? 1 : 0,
                data.successful ? 0 : 1,
                data.latencyMs,
                data.tokens,
                data.cost
            ]
        )
    }

    async getModelPerformance(model: string, days = 7): Promise<ModelPerformance[]> {
        const result = await this.db.query<any>(
            `SELECT * FROM model_performance 
            WHERE model = $1 AND date >= CURRENT_DATE - $2
            ORDER BY date DESC`,
            [model, days]
        )
        return result.rows.map(this.mapModelPerformance)
    }

    // ========================================================================
    // MAPPERS
    // ========================================================================

    private mapModelConfig(row: any): ModelConfig {
        return {
            id: row.id,
            displayName: row.display_name,
            provider: row.provider,
            tier: row.tier,
            contextWindow: row.context_window,
            maxTokens: row.max_tokens,
            costPer1kInput: row.cost_per_1k_input ? parseFloat(row.cost_per_1k_input) : undefined,
            costPer1kOutput: row.cost_per_1k_output ? parseFloat(row.cost_per_1k_output) : undefined,
            capabilities: row.capabilities || {},
            enabled: row.enabled,
            supportsStreaming: row.supports_streaming || false,
            supportsFunctions: row.supports_functions || false,
            supportsVision: row.supports_vision || false,
            description: row.description,
            priority: row.priority,
            status: row.status,
            createdAt: row.created_at
        }
    }

    private mapProvider(row: any): AIProvider {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            apiEndpoint: row.api_endpoint,
            apiKey: row.api_key,
            authType: row.auth_type,
            capabilities: row.capabilities || {},
            status: row.status,
            rateLimitPerMinute: row.rate_limit_per_minute,
            creditsRemaining: row.credits_remaining ? parseFloat(row.credits_remaining) : undefined,
            tokensUsed: row.tokens_used ? parseInt(row.tokens_used, 10) : undefined,
            lastUsageAt: row.last_usage_at,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    private mapOrchestrationRule(row: any): OrchestrationRule {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            strategy: row.strategy,
            modelSequence: row.model_sequence,
            conditions: row.conditions || {},
            enabled: row.enabled,
            priority: row.priority,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    private mapChatContext(row: any): ChatContext {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            contextType: row.context_type,
            content: row.content,
            tokens: row.tokens,
            priority: row.priority,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    private mapModelPerformance(row: any): ModelPerformance {
        return {
            model: row.model,
            provider: row.provider,
            date: row.date,
            totalRequests: row.total_requests,
            successfulRequests: row.successful_requests,
            failedRequests: row.failed_requests,
            avgLatencyMs: row.avg_latency_ms,
            avgTokensPerRequest: row.avg_tokens_per_request,
            totalCost: parseFloat(row.total_cost),
            qualityScore: row.quality_score ? parseFloat(row.quality_score) : undefined
        }
    }
}
