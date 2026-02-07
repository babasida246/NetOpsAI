import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import { lintConfig, renderConfig } from './config.generator.js'
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

export async function registerToolsRoutes(
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
                resource: 'config_tools',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write config tools audit log')
        }
    }

    app.post('/tools/config/generate', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { vendor: 'mikrotik' | 'cisco'; config: any }
        const result = renderConfig(body.config, body.vendor)
        const lintFindings = lintConfig(body.config, body.vendor)
        await audit(request, 'config_generate', undefined, { vendor: body.vendor })
        return reply.send({ ...result, lintFindings })
    })

    app.post('/tools/config/lint', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { vendor: 'mikrotik' | 'cisco'; config: any }
        const findings = lintConfig(body.config, body.vendor)
        await audit(request, 'config_lint', undefined, { vendor: body.vendor })
        return reply.send({ findings })
    })

    app.post('/tools/config/push', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as {
            deviceId: string
            vendor: 'mikrotik' | 'cisco'
            commands: string[]
            config?: { metadata?: { environment?: 'dev' | 'staging' | 'prod' } }
            ticketId?: string
        }
        const env = body.config?.metadata?.environment || 'dev'
        const policy = resolvePolicyForEnvironment(env as any)
        const requiresApproval = env === 'prod' || policy.requireApproval
        const ticketId = safeTicketId(body.ticketId)

        if (requiresApproval && !hasApproved(body.deviceId, ticketId)) {
            await audit(request, 'config_push_blocked', body.deviceId, { env, ticketId })
            throw new ForbiddenError('Approval required before pushing config')
        }

        const dangerousCommand = body.commands.find((cmd) =>
            policy.dangerousList.some((rule) => cmd.toLowerCase().includes(rule.toLowerCase()))
        )

        if (dangerousCommand && env === 'prod' && !hasApproved(body.deviceId, ticketId)) {
            await audit(request, 'config_push_blocked', body.deviceId, { env, ticketId, command: dangerousCommand })
            throw new ForbiddenError('Dangerous command requires approval')
        }

        await audit(request, 'config_push', body.deviceId, {
            env,
            ticketId,
            commandCount: body.commands.length
        })

        return reply.send({
            status: 'success',
            details: ['Config push accepted (mock).']
        })
    })
}
