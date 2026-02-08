import jwt from 'jsonwebtoken'
import type { EntitlementSnapshot, EntitlementTokenResult } from './entitlement.types.js'
import { EntitlementRepository } from './entitlement.repository.js'
import { env } from '../../config/env.js'

export class EntitlementService {
    constructor(private repository: EntitlementRepository) { }

    async getSnapshot(tenantId: string): Promise<EntitlementSnapshot> {
        const subscription = await this.repository.getTenantSubscription(tenantId)
        const features = await this.repository.getTenantFeatures(tenantId)
        const limits = await this.repository.getTenantLimits(tenantId)

        return {
            tenantId,
            plan: {
                code: subscription?.plan_code ?? 'basic',
                name: subscription?.plan_name ?? 'Basic',
                status: subscription?.status ?? 'active',
                endsAt: subscription?.ends_at ? subscription.ends_at.toISOString() : null
            },
            features,
            limits
        }
    }

    async refreshToken(tenantId: string, createdBy?: string): Promise<EntitlementTokenResult> {
        const snapshot = await this.getSnapshot(tenantId)
        const issuedAt = new Date()
        const expiresAt = new Date(issuedAt.getTime() + env.LICENSE_TOKEN_TTL_HOURS * 60 * 60 * 1000)

        const token = jwt.sign(
            {
                tenantId,
                features: snapshot.features,
                limits: snapshot.limits,
                type: 'entitlement'
            },
            env.LICENSE_SIGNING_SECRET,
            { expiresIn: `${env.LICENSE_TOKEN_TTL_HOURS}h` }
        )

        await this.repository.storeToken(tenantId, token, expiresAt, createdBy)

        return {
            token,
            expiresAt: expiresAt.toISOString(),
            snapshot: {
                ...snapshot,
                issuedAt: issuedAt.toISOString(),
                expiresAt: expiresAt.toISOString()
            }
        }
    }

    async hasFeature(tenantId: string, featureKey: string): Promise<boolean> {
        const features = await this.repository.getTenantFeatures(tenantId)
        return features.includes(featureKey)
    }
}
