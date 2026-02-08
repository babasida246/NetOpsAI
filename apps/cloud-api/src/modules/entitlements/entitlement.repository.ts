import type { Pool } from 'pg'

interface SubscriptionRow {
    plan_code: string
    plan_name: string
    status: string
    ends_at: Date | null
}

export class EntitlementRepository {
    constructor(private db: Pool) { }

    async getTenantSubscription(tenantId: string): Promise<SubscriptionRow | null> {
        const result = await this.db.query<SubscriptionRow>(
            `SELECT p.code as plan_code, p.name as plan_name, s.status, s.ends_at
             FROM tenant_subscriptions s
             JOIN plans p ON p.id = s.plan_id
             WHERE s.tenant_id = $1`,
            [tenantId]
        )
        return result.rows[0] ?? null
    }

    async getTenantFeatures(tenantId: string): Promise<string[]> {
        const result = await this.db.query<{ feature_key: string }>(
            `SELECT pf.feature_key
             FROM tenant_subscriptions s
             JOIN plan_features pf ON pf.plan_id = s.plan_id
             WHERE s.tenant_id = $1
             UNION
             SELECT ta.feature_key
             FROM tenant_addons ta
             WHERE ta.tenant_id = $1 AND ta.status = 'active'`,
            [tenantId]
        )
        return result.rows.map((row) => row.feature_key)
    }

    async getTenantLimits(tenantId: string): Promise<Record<string, number>> {
        const result = await this.db.query<{ limits: Record<string, number> }>(
            `SELECT limits FROM tenant_limits WHERE tenant_id = $1`,
            [tenantId]
        )
        return result.rows[0]?.limits ?? {}
    }

    async storeToken(tenantId: string, token: string, expiresAt: Date, createdBy?: string): Promise<void> {
        await this.db.query(
            `INSERT INTO entitlement_tokens (tenant_id, token, expires_at, created_by)
             VALUES ($1, $2, $3, $4)`,
            [tenantId, token, expiresAt, createdBy ?? null]
        )
    }
}
