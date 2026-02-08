import type { Pool } from 'pg'

export class MessageLinkRepository {
    constructor(private db: Pool) { }

    async create(input: {
        conversationId: string
        internalMessageId: string
        channelId: string
        externalMessageId: string
        threadId?: string
    }): Promise<void> {
        await this.db.query(
            `INSERT INTO message_links (conversation_id, internal_message_id, channel_id, external_message_id, thread_id)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                input.conversationId,
                input.internalMessageId,
                input.channelId,
                input.externalMessageId,
                input.threadId ?? null
            ]
        )
    }
}
