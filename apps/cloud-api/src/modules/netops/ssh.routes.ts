import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import {
    closeSession,
    exportSessionText,
    getSessionLog,
    listSessions,
    openSession,
    purgeIdleSessions,
    sendCommand,
    type SshCommandPolicy
} from './ssh.store.js'
import { hasApproved, resolvePolicyForEnvironment } from './governance.store.js'

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

function safeTicketId(ticketId?: string): string {
    return ticketId?.trim() || 'UNASSIGNED'
}

export async function registerSshRoutes(
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
                resource: 'ssh',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write ssh audit log')
        }
    }

    app.get('/ssh/sessions', { preHandler: authenticate }, async (_request, reply) => {
        purgeIdleSessions()
        return reply.send(listSessions())
    })

    app.post('/ssh/sessions', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as {
            deviceId: string
            deviceName: string
            host: string
            port: number
            user: string
            authType: 'password' | 'key'
            idleTimeoutSec?: number
            ticketId?: string
        }
        const session = openSession(body)
        await audit(request, 'ssh_open', session.id, {
            deviceId: body.deviceId,
            ticketId: safeTicketId(body.ticketId)
        })
        return reply.send(session)
    })

    app.delete('/ssh/sessions/:id', { preHandler: authenticate }, async (request, reply) => {
        const { id } = request.params as { id: string }
        closeSession(id)
        await audit(request, 'ssh_close', id, {})
        return reply.send({ success: true })
    })

    app.post('/ssh/sessions/:id/command', { preHandler: authenticate }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const body = request.body as {
            command: string
            policy?: SshCommandPolicy
            ticketId?: string
            deviceId?: string
        }
        const ticketId = safeTicketId(body.ticketId)
        const env = body.policy?.environment || 'dev'
        const resolved = resolvePolicyForEnvironment(env as any)
        const policy: SshCommandPolicy = body.policy ?? {
            environment: env,
            allowList: resolved.allowList,
            denyList: resolved.denyList,
            dangerousList: resolved.dangerousList
        }
        const requiresApproval = env === 'prod' || resolved.requireApproval

        if (requiresApproval && !hasApproved(body.deviceId || '', ticketId)) {
            throw new ForbiddenError('Approval required for production commands')
        }

        const { result, blocked } = sendCommand(id, body.command, policy)
        await audit(request, blocked ? 'ssh_command_blocked' : 'ssh_command', id, {
            command: body.command,
            deviceId: body.deviceId,
            ticketId
        })
        return reply.send(result)
    })

    app.get('/ssh/sessions/:id/log', { preHandler: authenticate }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { format } = request.query as { format?: string }
        if (format === 'text') {
            return reply.type('text/plain').send(exportSessionText(id))
        }
        return reply.send(getSessionLog(id))
    })
}
