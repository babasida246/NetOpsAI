import type { Pool } from 'pg'

export type ChannelBinding = {
    id: string
    channelId: string
    externalUserId: string
    externalChatId: string
    userId: string | null
    status: 'pending' | 'active' | 'blocked'
    roleHint?: string | null
    createdAt: string
}

export class ChannelBindingRepository {
    constructor(private db: Pool) { }

    async findActive(
        channelId: string,
        externalUserId: string,
        externalChatId: string
    ): Promise<ChannelBinding | null> {
        const result = await this.db.query(
            `SELECT id, channel_id, external_user_id, external_chat_id, user_id, status, role_hint, created_at
       FROM channel_bindings
       WHERE channel_id = $1
         AND external_user_id = $2
         AND external_chat_id = $3
         AND status = 'active'
       LIMIT 1`,
            [channelId, externalUserId, externalChatId]
        )
        if (!result.rows[0]) return null
        return this.mapRow(result.rows[0])
    }

    async createPending(input: {
        channelId: string
        externalUserId: string
        externalChatId: string
        roleHint?: string
    }): Promise<ChannelBinding> {
        const result = await this.db.query(
            `INSERT INTO channel_bindings (channel_id, external_user_id, external_chat_id, status, role_hint)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING id, channel_id, external_user_id, external_chat_id, user_id, status, role_hint, created_at`,
            [input.channelId, input.externalUserId, input.externalChatId, input.roleHint ?? null]
        )
        return this.mapRow(result.rows[0])
    }

    async activate(bindingId: string, userId: string): Promise<void> {
        await this.db.query(
            `UPDATE channel_bindings
       SET status = 'active', user_id = $2
       WHERE id = $1`,
            [bindingId, userId]
        )
    }

    private mapRow(row: any): ChannelBinding {
        return {
            id: row.id,
            channelId: row.channel_id,
            externalUserId: row.external_user_id,
            externalChatId: row.external_chat_id,
            userId: row.user_id,
            status: row.status,
            roleHint: row.role_hint,
            createdAt: row.created_at.toISOString()
        }
    }
}
