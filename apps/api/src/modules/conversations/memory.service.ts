/**
 * Conversation Memory Service
 * Handles persistent conversation storage and context management
 */
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'

export interface ConversationMessage {
    id: string
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    model?: string
    tokenCount?: number
    toolCallId?: string
    toolCalls?: Array<{
        id: string
        type: 'function'
        function: {
            name: string
            arguments: string
        }
    }>
    metadata?: Record<string, unknown>
    createdAt: Date
}

export interface ConversationContext {
    conversationId: string
    messages: ConversationMessage[]
    summary?: string
    totalTokens: number
    lastUpdated: Date
}

interface ConversationMemoryConfig {
    maxCacheMessages: number
    maxContextTokens: number
    cacheTTLSeconds: number
    enableSummarization: boolean
}

const DEFAULT_CONFIG: ConversationMemoryConfig = {
    maxCacheMessages: 50,
    maxContextTokens: 8000,
    cacheTTLSeconds: 3600, // 1 hour
    enableSummarization: true
}

export class ConversationMemoryService {
    private config: ConversationMemoryConfig

    constructor(
        private db: Pool,
        private redis: Redis,
        config: Partial<ConversationMemoryConfig> = {}
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Get conversation context with messages
     * First tries Redis cache, falls back to database
     */
    async getContext(conversationId: string, userId: string): Promise<ConversationContext | null> {
        // Try cache first
        const cached = await this.getFromCache(conversationId)
        if (cached) {
            return cached
        }

        // Load from database
        const context = await this.loadFromDatabase(conversationId, userId)
        if (context) {
            // Update cache
            await this.saveToCache(context)
        }

        return context
    }

    /**
     * Add a message to the conversation
     * Saves to both database and cache
     */
    async addMessage(
        conversationId: string,
        userId: string,
        message: Omit<ConversationMessage, 'id' | 'createdAt'>
    ): Promise<ConversationMessage> {
        // Verify ownership
        const conv = await this.verifyOwnership(conversationId, userId)
        if (!conv) {
            throw new Error('Conversation not found or access denied')
        }

        // Calculate token count if not provided
        const tokenCount = message.tokenCount || this.estimateTokens(message.content)

        // Insert into database
        const result = await this.db.query<{
            id: string
            role: string
            content: string
            model: string | null
            token_count: number
            tool_call_id: string | null
            tool_calls: unknown | null
            metadata: Record<string, unknown> | null
            created_at: Date
        }>(
            `INSERT INTO messages (conversation_id, role, content, model, token_count, tool_call_id, tool_calls, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, role, content, model, token_count, tool_call_id, tool_calls, metadata, created_at`,
            [
                conversationId,
                message.role,
                message.content,
                message.model || null,
                tokenCount,
                message.toolCallId || null,
                message.toolCalls ? JSON.stringify(message.toolCalls) : null,
                message.metadata ? JSON.stringify(message.metadata) : null
            ]
        )

        // Update conversation stats
        await this.db.query(
            `UPDATE conversations 
             SET message_count = message_count + 1, updated_at = NOW()
             WHERE id = $1`,
            [conversationId]
        )

        const newMessage: ConversationMessage = {
            id: result.rows[0].id,
            role: result.rows[0].role as 'user' | 'assistant' | 'system' | 'tool',
            content: result.rows[0].content,
            model: result.rows[0].model || undefined,
            tokenCount: result.rows[0].token_count,
            toolCallId: result.rows[0].tool_call_id || undefined,
            toolCalls: result.rows[0].tool_calls as ConversationMessage['toolCalls'],
            metadata: result.rows[0].metadata || undefined,
            createdAt: result.rows[0].created_at
        }

        // Update cache
        await this.appendToCache(conversationId, newMessage)

        return newMessage
    }

    /**
     * Get messages ready for LLM context
     * Applies token limit and includes summary if needed
     */
    async getMessagesForContext(
        conversationId: string,
        userId: string,
        maxTokens?: number
    ): Promise<{
        messages: ConversationMessage[]
        summary?: string
        truncated: boolean
        totalTokens: number
    }> {
        const context = await this.getContext(conversationId, userId)
        if (!context) {
            return { messages: [], truncated: false, totalTokens: 0 }
        }

        const limit = maxTokens || this.config.maxContextTokens
        let totalTokens = 0
        const selectedMessages: ConversationMessage[] = []
        let truncated = false

        // Include system message first if present
        const systemMessage = context.messages.find(m => m.role === 'system')
        if (systemMessage) {
            totalTokens += systemMessage.tokenCount || this.estimateTokens(systemMessage.content)
            selectedMessages.push(systemMessage)
        }

        // Add messages from recent to old until we hit the limit
        const nonSystemMessages = context.messages.filter(m => m.role !== 'system').reverse()

        for (const message of nonSystemMessages) {
            const msgTokens = message.tokenCount || this.estimateTokens(message.content)
            if (totalTokens + msgTokens <= limit) {
                totalTokens += msgTokens
                selectedMessages.unshift(message)
            } else {
                truncated = true
                break
            }
        }

        // If truncated and we have a summary, include it
        let summary: string | undefined
        if (truncated && context.summary) {
            summary = context.summary
        }

        return {
            messages: selectedMessages,
            summary,
            truncated,
            totalTokens
        }
    }

    /**
     * Save conversation summary
     */
    async saveSummary(conversationId: string, userId: string, summary: string): Promise<void> {
        // Verify ownership
        const conv = await this.verifyOwnership(conversationId, userId)
        if (!conv) {
            throw new Error('Conversation not found or access denied')
        }

        // Save summary to database
        await this.db.query(
            `UPDATE conversations 
             SET metadata = COALESCE(metadata, '{}')::jsonb || $2::jsonb, updated_at = NOW()
             WHERE id = $1`,
            [conversationId, JSON.stringify({ summary, summaryUpdatedAt: new Date().toISOString() })]
        )

        // Update cache
        const context = await this.getFromCache(conversationId)
        if (context) {
            context.summary = summary
            await this.saveToCache(context)
        }
    }

    /**
     * Clear conversation memory (cache only)
     */
    async clearCache(conversationId: string): Promise<void> {
        await this.redis.del(this.cacheKey(conversationId))
    }

    /**
     * Delete conversation and all messages
     */
    async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
        // Verify ownership
        const conv = await this.verifyOwnership(conversationId, userId)
        if (!conv) {
            return false
        }

        // Delete messages first (cascade might handle this)
        await this.db.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId])

        // Delete conversation
        const result = await this.db.query(
            'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, userId]
        )

        // Clear cache
        await this.clearCache(conversationId)

        return (result.rowCount || 0) > 0
    }

    // ==================== Private Methods ====================

    private cacheKey(conversationId: string): string {
        return `conv:memory:${conversationId}`
    }

    private async verifyOwnership(conversationId: string, userId: string): Promise<boolean> {
        const result = await this.db.query<{ id: string }>(
            'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, userId]
        )
        return result.rows.length > 0
    }

    private async getFromCache(conversationId: string): Promise<ConversationContext | null> {
        try {
            const data = await this.redis.get(this.cacheKey(conversationId))
            if (!data) return null

            const parsed = JSON.parse(data)
            return {
                ...parsed,
                messages: parsed.messages.map((m: any) => ({
                    ...m,
                    createdAt: new Date(m.createdAt)
                })),
                lastUpdated: new Date(parsed.lastUpdated)
            }
        } catch {
            return null
        }
    }

    private async saveToCache(context: ConversationContext): Promise<void> {
        try {
            const data = JSON.stringify({
                ...context,
                // Only cache recent messages
                messages: context.messages.slice(-this.config.maxCacheMessages)
            })
            await this.redis.setex(
                this.cacheKey(context.conversationId),
                this.config.cacheTTLSeconds,
                data
            )
        } catch {
            // Ignore cache errors
        }
    }

    private async appendToCache(conversationId: string, message: ConversationMessage): Promise<void> {
        const context = await this.getFromCache(conversationId)
        if (context) {
            context.messages.push(message)
            context.totalTokens += message.tokenCount || this.estimateTokens(message.content)
            context.lastUpdated = new Date()
            await this.saveToCache(context)
        }
    }

    private async loadFromDatabase(conversationId: string, userId: string): Promise<ConversationContext | null> {
        // Verify ownership
        const convResult = await this.db.query<{
            id: string
            metadata: Record<string, unknown> | null
            updated_at: Date
        }>(
            'SELECT id, metadata, updated_at FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, userId]
        )

        if (convResult.rows.length === 0) {
            return null
        }

        const conv = convResult.rows[0]

        // Load recent messages
        const messagesResult = await this.db.query<{
            id: string
            role: string
            content: string
            model: string | null
            token_count: number | null
            tool_call_id: string | null
            tool_calls: unknown | null
            metadata: Record<string, unknown> | null
            created_at: Date
        }>(
            `SELECT id, role, content, model, token_count, tool_call_id, tool_calls, metadata, created_at
             FROM messages 
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [conversationId, this.config.maxCacheMessages]
        )

        const messages = messagesResult.rows.reverse().map(row => ({
            id: row.id,
            role: row.role as 'user' | 'assistant' | 'system' | 'tool',
            content: row.content,
            model: row.model || undefined,
            tokenCount: row.token_count || this.estimateTokens(row.content),
            toolCallId: row.tool_call_id || undefined,
            toolCalls: row.tool_calls as ConversationMessage['toolCalls'],
            metadata: row.metadata || undefined,
            createdAt: row.created_at
        }))

        const totalTokens = messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)

        return {
            conversationId,
            messages,
            summary: (conv.metadata as any)?.summary,
            totalTokens,
            lastUpdated: conv.updated_at
        }
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English
        return Math.ceil(text.length / 4)
    }
}
