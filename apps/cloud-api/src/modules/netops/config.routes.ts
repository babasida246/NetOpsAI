import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import {
    createBaseline,
    listBaselines,
    listDrifts,
    recordDrift
} from './config.store.js'

type UserContext = { sub: string; role?: string; email?: string }

function requireUser(authService: AuthService) {
    return async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }
        const token = authHeader.substring(7)
        const payload = authService.verifyAccessToken(token) as UserContext
        request.user = {
            id: payload.sub,
            sub: payload.sub,
            email: payload.email ?? '',
            role: payload.role ?? 'user'
        }
    }
}

export async function registerConfigRoutes(
    app: FastifyInstance,
    authService: AuthService,
    adminRepo: AdminRepository
): Promise<void> {
    const authenticate = requireUser(authService)

    const audit = async (
        request: FastifyRequest,
        action: string,
        resourceId: string | undefined,
        details: Record<string, any>
    ) => {
        try {
            await adminRepo.createAuditLog({
                userId: request.user?.sub,
                action,
                resource: 'config_baseline',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write config baseline audit log')
        }
    }

    app.get('/config/baselines', { preHandler: authenticate }, async (_request, reply) => {
        return reply.send(listBaselines())
    })

    app.post('/config/baselines', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; name: string; config: string }
        const baseline = createBaseline({
            deviceId: body.deviceId,
            name: body.name,
            config: body.config,
            createdBy: request.user?.sub || 'system'
        })
        await audit(request, 'baseline_create', baseline.id, { deviceId: body.deviceId })
        return reply.send(baseline)
    })

    app.get('/config/drift', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId?: string }
        return reply.send(listDrifts(deviceId))
    })

    app.post('/config/drift/scan', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; currentConfig: string }
        const drift = recordDrift(body)
        if (drift) {
            await audit(request, 'drift_detected', drift.id, { deviceId: body.deviceId })
        }
        return reply.send({ drift })
    })
}
