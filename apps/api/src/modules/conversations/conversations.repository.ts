/**
 * Conversations Repository
 */
import type { Pool } from 'pg'
import type {
    Conversation,
    CreateConversationRequest,
    UpdateConversationRequest,
    Message,
    CreateMessageRequest,
    ListConversationsQuery,
    ListMessagesQuery
} from './conversations.schema.js'
import { calculateOffset } from '../../shared/utils/helpers.js'

interface ConversationRow {
    id: string
    user_id: string
    title: string
    model: string
    status: string
    message_count: number
    metadata: Record<string, any> | null
    created_at: Date
    updated_at: Date
}

interface MessageRow {
    id: string
    conversation_id: string
    role: string
    content: string
    model: string | null
    token_count: number | null
    metadata: Record<string, any> | null
    created_at: Date
}

export class ConversationRepository {
    constructor(private db: Pool) { }

    // Conversation methods
    async findById(id: string, userId: string): Promise<Conversation | null> {
        const result = await this.db.query<ConversationRow>(
            `SELECT id, user_id, title, model, status, message_count, metadata, created_at, updated_at
       FROM conversations WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )
        return result.rows[0] ? this.mapConversation(result.rows[0]) : null
    }

    async findAll(userId: string, query: ListConversationsQuery): Promise<{ data: Conversation[]; total: number }> {
        const offset = calculateOffset(query.page, query.limit)
        const conditions = ['user_id = $1']
        const params: any[] = [userId]
        let paramIndex = 2

        if (query.status) {
            conditions.push(`status = $${paramIndex}`)
            params.push(query.status)
            paramIndex++
        }

        if (query.search) {
            conditions.push(`title ILIKE $${paramIndex}`)
            params.push(`%${query.search}%`)
            paramIndex++
        }

        const whereClause = conditions.join(' AND ')
        const orderBy = `${query.sortBy || 'updated_at'} ${query.sortOrder}`

        // Get total count
        const countResult = await this.db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM conversations WHERE ${whereClause}`,
            params
        )
        const total = parseInt(countResult.rows[0].count, 10)

        // Get data
        const dataResult = await this.db.query<ConversationRow>(
            `SELECT id, user_id, title, model, status, message_count, metadata, created_at, updated_at
       FROM conversations WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, query.limit, offset]
        )

        return {
            data: dataResult.rows.map(row => this.mapConversation(row)),
            total
        }
    }

    async create(userId: string, data: CreateConversationRequest): Promise<Conversation> {
        const result = await this.db.query<ConversationRow>(
            `INSERT INTO conversations (user_id, title, model, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, title, model, status, message_count, metadata, created_at, updated_at`,
            [userId, data.title, data.model, data.metadata || null]
        )
        return this.mapConversation(result.rows[0])
    }

    async update(id: string, userId: string, data: UpdateConversationRequest): Promise<Conversation | null> {
        const updates: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (data.title !== undefined) {
            updates.push(`title = $${paramIndex}`)
            params.push(data.title)
            paramIndex++
        }

        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex}`)
            params.push(data.status)
            paramIndex++
        }

        if (data.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex}`)
            params.push(data.metadata)
            paramIndex++
        }

        if (updates.length === 0) {
            return this.findById(id, userId)
        }

        updates.push('updated_at = NOW()')
        params.push(id, userId)

        const result = await this.db.query<ConversationRow>(
            `UPDATE conversations 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, user_id, title, model, status, message_count, metadata, created_at, updated_at`,
            params
        )

        return result.rows[0] ? this.mapConversation(result.rows[0]) : null
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const result = await this.db.query(
            `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )
        return (result.rowCount || 0) > 0
    }

    // Message methods
    async findMessages(conversationId: string, userId: string, query: ListMessagesQuery): Promise<Message[]> {
        // First verify conversation belongs to user
        const conv = await this.findById(conversationId, userId)
        if (!conv) return []

        let whereClause = 'conversation_id = $1'
        const params: any[] = [conversationId]
        let paramIndex = 2

        if (query.before) {
            whereClause += ` AND created_at < (SELECT created_at FROM messages WHERE id = $${paramIndex})`
            params.push(query.before)
            paramIndex++
        }

        if (query.after) {
            whereClause += ` AND created_at > (SELECT created_at FROM messages WHERE id = $${paramIndex})`
            params.push(query.after)
            paramIndex++
        }

        const result = await this.db.query<MessageRow>(
            `SELECT id, conversation_id, role, content, model, token_count, metadata, created_at
       FROM messages 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
            [...params, query.limit]
        )

        return result.rows.map(row => this.mapMessage(row)).reverse()
    }

    async createMessage(conversationId: string, userId: string, data: CreateMessageRequest): Promise<Message | null> {
        // Verify conversation belongs to user
        const conv = await this.findById(conversationId, userId)
        if (!conv) return null

        const result = await this.db.query<MessageRow>(
            `INSERT INTO messages (conversation_id, role, content, model, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, conversation_id, role, content, model, token_count, metadata, created_at`,
            [conversationId, data.role, data.content, data.model || null, data.metadata || null]
        )

        // Update conversation message count and updated_at
        await this.db.query(
            `UPDATE conversations 
       SET message_count = message_count + 1, updated_at = NOW()
       WHERE id = $1`,
            [conversationId]
        )

        return this.mapMessage(result.rows[0])
    }

    private mapConversation(row: ConversationRow): Conversation {
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            model: row.model,
            status: row.status as any,
            messageCount: row.message_count,
            metadata: row.metadata || undefined,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString()
        }
    }

    private mapMessage(row: MessageRow): Message {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            role: row.role as any,
            content: row.content,
            model: row.model || undefined,
            tokenCount: row.token_count || undefined,
            metadata: row.metadata || undefined,
            createdAt: row.created_at.toISOString()
        }
    }
}
