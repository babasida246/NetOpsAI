import type { Pool } from 'pg'

export type PendingActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'executed'

export type PendingAction = {
    actionId: string
    conversationId: string
    correlationId: string
    channelId: string
    externalChatId: string
    externalUserId: string
    actionKind: string
    payload: Record<string, unknown>
    requiresReason: boolean
    status: PendingActionStatus
    expiresAt: string
    createdAt: string
    reason?: string | null
}

export class PendingActionRepository {
    constructor(private db: Pool) { }

    async create(input: {
        actionId: string
        conversationId: string
        correlationId: string
        channelId: string
        externalChatId: string
        externalUserId: string
        actionKind: string
        payload?: Record<string, unknown>
        requiresReason?: boolean
        status?: PendingActionStatus
        expiresAt: string
    }): Promise<void> {
        await this.db.query(
            `INSERT INTO pending_actions (
        action_id, conversation_id, correlation_id, channel_id, external_chat_id,
        external_user_id, action_kind, payload, requires_reason, status, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
                input.actionId,
                input.conversationId,
                input.correlationId,
                input.channelId,
                input.externalChatId,
                input.externalUserId,
                input.actionKind,
                input.payload ?? {},
                input.requiresReason ?? false,
                input.status ?? 'pending',
                input.expiresAt
            ]
        )
    }

    async findById(actionId: string): Promise<PendingAction | null> {
        const result = await this.db.query(
            `SELECT action_id, conversation_id, correlation_id, channel_id, external_chat_id,
              external_user_id, action_kind, payload, requires_reason, status, expires_at, created_at, reason
       FROM pending_actions
       WHERE action_id = $1`,
            [actionId]
        )
        if (!result.rows[0]) return null
        return this.mapRow(result.rows[0])
    }

    async updateStatus(actionId: string, status: PendingActionStatus, reason?: string): Promise<void> {
        await this.db.query(
            `UPDATE pending_actions
       SET status = $2, reason = COALESCE($3, reason)
       WHERE action_id = $1`,
            [actionId, status, reason ?? null]
        )
    }

    async expirePast(now: Date): Promise<number> {
        const result = await this.db.query(
            `UPDATE pending_actions
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < $1`,
            [now.toISOString()]
        )
        return result.rowCount || 0
    }

    private mapRow(row: any): PendingAction {
        return {
            actionId: row.action_id,
            conversationId: row.conversation_id,
            correlationId: row.correlation_id,
            channelId: row.channel_id,
            externalChatId: row.external_chat_id,
            externalUserId: row.external_user_id,
            actionKind: row.action_kind,
            payload: row.payload ?? {},
            requiresReason: row.requires_reason,
            status: row.status,
            expiresAt: row.expires_at.toISOString(),
            createdAt: row.created_at.toISOString(),
            reason: row.reason
        }
    }
}
