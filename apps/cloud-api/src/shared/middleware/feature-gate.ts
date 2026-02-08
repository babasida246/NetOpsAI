import type { FastifyReply, FastifyRequest } from 'fastify'
import type { EntitlementService } from '../../modules/entitlements/entitlement.service.js'
import { ForbiddenError, UnauthorizedError } from '../errors/http-errors.js'

export function createFeatureGate(entitlementService: EntitlementService, featureKey: string) {
    return async function requireFeature(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
        const user = request.user
        if (!user) {
            throw new UnauthorizedError('Authentication required')
        }
        const tenantId = (user as { tenantId?: string | null }).tenantId
        if (!tenantId) {
            throw new UnauthorizedError('Tenant context missing')
        }
        const hasFeature = await entitlementService.hasFeature(tenantId, featureKey)
        if (!hasFeature) {
            throw new ForbiddenError(`Feature not entitled: ${featureKey}`)
        }
    }
}
