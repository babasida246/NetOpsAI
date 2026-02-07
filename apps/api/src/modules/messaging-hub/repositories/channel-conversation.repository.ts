import type { Pool } from 'pg'

export type ChannelConversation = {
    id: string
    channelId: string
    externalChatId: string
    threadId: string | null
    conversationId: string
    updatedAt: string
}

export class ChannelConversationRepository {
    constructor(private db: Pool) { }

    async find(
        channelId: string,
        externalChatId: string,
        threadId?: string
    ): Promise<ChannelConversation | null> {
        const result = await this.db.query(
            `SELECT id, channel_id, external_chat_id, thread_id, conversation_id, updated_at
       FROM channel_conversations
       WHERE channel_id = $1 AND external_chat_id = $2 AND thread_id IS NOT DISTINCT FROM $3
       LIMIT 1`,
            [channelId, externalChatId, threadId ?? null]
        )
        if (!result.rows[0]) return null
        return this.mapRow(result.rows[0])
    }

    async upsert(input: {
        channelId: string
        externalChatId: string
        threadId?: string
        conversationId: string
    }): Promise<ChannelConversation> {
        const result = await this.db.query(
            `INSERT INTO channel_conversations (channel_id, external_chat_id, thread_id, conversation_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (channel_id, external_chat_id, thread_id)
       DO UPDATE SET conversation_id = EXCLUDED.conversation_id, updated_at = NOW()
       RETURNING id, channel_id, external_chat_id, thread_id, conversation_id, updated_at`,
            [input.channelId, input.externalChatId, input.threadId ?? null, input.conversationId]
        )
        return this.mapRow(result.rows[0])
    }

    private mapRow(row: any): ChannelConversation {
        return {
            id: row.id,
            channelId: row.channel_id,
            externalChatId: row.external_chat_id,
            threadId: row.thread_id,
            conversationId: row.conversation_id,
            updatedAt: row.updated_at.toISOString()
        }
    }
}
