import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { EntitlementService } from './entitlement.service.js'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'

interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        id: string
        role: string
        tenantId?: string
    }
}

const requireRole = (roles: string[]) => async (request: AuthenticatedRequest) => {
    const role = request.user?.role
    if (!role || !roles.includes(role)) {
        throw new UnauthorizedError('Insufficient permissions')
    }
}

const requireTenant = (request: AuthenticatedRequest): string => {
    const tenantId = request.user?.tenantId
    if (!tenantId) {
        throw new UnauthorizedError('Tenant context missing')
    }
    return tenantId
}

export async function entitlementRoutes(
    fastify: FastifyInstance,
    service: EntitlementService
): Promise<void> {
    fastify.register(async (licenseApp) => {
        licenseApp.addHook('preHandler', fastify.authenticate)

        licenseApp.get('/status', {
            schema: {
                tags: ['License'],
                summary: 'Get license status and entitlements'
            }
        }, async (request: AuthenticatedRequest) => {
            const tenantId = requireTenant(request)
            return service.getSnapshot(tenantId)
        })

        licenseApp.post('/refresh', {
            schema: {
                tags: ['License'],
                summary: 'Refresh entitlement token'
            },
            preHandler: [requireRole(['admin', 'super_admin'])]
        }, async (request: AuthenticatedRequest) => {
            const tenantId = requireTenant(request)
            return service.refreshToken(tenantId, request.user?.id)
        })

        licenseApp.post('/rebind', {
            schema: {
                tags: ['License'],
                summary: 'Rebind entitlement token'
            },
            preHandler: [requireRole(['admin', 'super_admin'])]
        }, async (request: AuthenticatedRequest) => {
            const tenantId = requireTenant(request)
            return service.refreshToken(tenantId, request.user?.id)
        })
    }, { prefix: '/api/license' })
}
