import type { Pool } from 'pg'

export type AlertSubscription = {
    id: string
    userId: string
    channelId: string
    targetChatId: string
    alertTypes: string[]
    severityMin: 'info' | 'warning' | 'critical'
    enabled: boolean
    createdAt: string
}

export class AlertSubscriptionRepository {
    constructor(private db: Pool) { }

    async listForAlert(type: string, severity: 'info' | 'warning' | 'critical'): Promise<AlertSubscription[]> {
        const result = await this.db.query(
            `SELECT id, user_id, channel_id, target_chat_id, alert_types, severity_min, enabled, created_at
       FROM alert_subscriptions
       WHERE enabled = TRUE
         AND $1 = ANY(alert_types)
         AND (severity_min = 'info'
              OR (severity_min = 'warning' AND $2 IN ('warning', 'critical'))
              OR (severity_min = 'critical' AND $2 = 'critical'))`,
            [type, severity]
        )

        return result.rows.map((row: any) => this.mapRow(row))
    }

    private mapRow(row: any): AlertSubscription {
        return {
            id: row.id,
            userId: row.user_id,
            channelId: row.channel_id,
            targetChatId: row.target_chat_id,
            alertTypes: row.alert_types ?? [],
            severityMin: row.severity_min,
            enabled: row.enabled,
            createdAt: row.created_at.toISOString()
        }
    }
}
