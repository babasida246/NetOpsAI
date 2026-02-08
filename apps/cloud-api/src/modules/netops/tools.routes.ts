import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import { lintConfig, renderConfig } from './config.generator.js'
import { hasApproved, resolvePolicyForEnvironment } from './governance.store.js'
import {
    enforceReason,
    enforceChangeControls,
    isWriteRisk,
    normalizeRiskLevel,
    redactSensitive,
    requirePermission,
    sanitizeRecord
} from '../../shared/security/netops-guard.js'

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
            riskLevel?: string
            reason?: string
            changeRequestId?: string
            dryRun?: boolean
            rollbackPlan?: string
            precheck?: string[]
            postcheck?: string[]
            maintenanceWindowId?: string
            breakGlass?: boolean
        }
        const env = body.config?.metadata?.environment || 'dev'
        const policy = resolvePolicyForEnvironment(env as any)
        const riskLevel = normalizeRiskLevel(body.riskLevel)
        if (riskLevel === 'R0_READ') {
            throw new BadRequestError('Config push requires a write risk level')
        }
        enforceReason(riskLevel, body.reason)

        if (isWriteRisk(riskLevel)) {
            requirePermission(request.user ?? {}, 'netops.change.execute')
        } else {
            requirePermission(request.user ?? {}, 'netops.read')
        }

        const requiresApproval = env === 'prod' || policy.requireApproval || riskLevel === 'R2_CHANGE' || riskLevel === 'R3_DANGEROUS'
        const ticketId = safeTicketId(body.ticketId)

        const approvalGranted = requiresApproval ? hasApproved(body.deviceId, ticketId) : true

        enforceChangeControls({
            level: riskLevel,
            changeRequestId: body.changeRequestId,
            approvalGranted,
            dryRun: body.dryRun,
            rollbackPlan: body.rollbackPlan,
            precheck: body.precheck,
            postcheck: body.postcheck,
            maintenanceWindowId: body.maintenanceWindowId,
            breakGlass: body.breakGlass,
            requireMaintenanceWindow: env === 'prod',
            breakGlassAllowed: body.breakGlass === true && request.user?.role === 'super_admin'
        })

        if (!body.commands || body.commands.length === 0) {
            throw new BadRequestError('Commands are required')
        }

        const allowList = policy.allowList ?? []
        if (allowList.length === 0) {
            throw new ForbiddenError('Command allowlist is empty')
        }

        const isAllowed = (command: string) => allowList.some((rule) => command.toLowerCase().includes(rule.toLowerCase()))
        const isDenied = (command: string) => policy.denyList.some((rule) => command.toLowerCase().includes(rule.toLowerCase()))

        for (const command of body.commands) {
            if (!isAllowed(command) || isDenied(command)) {
                await audit(request, 'config_push_blocked', body.deviceId, sanitizeRecord({ env, ticketId, command }))
                throw new ForbiddenError('Command blocked by policy')
            }
        }

        if (body.dryRun === true) {
            await audit(request, 'config_push_dry_run', body.deviceId, sanitizeRecord({
                env,
                ticketId,
                commandCount: body.commands.length,
                riskLevel
            }))
            return reply.send({
                status: 'dry_run',
                details: ['Dry-run only. No config applied.']
            })
        }

        if (requiresApproval && !approvalGranted) {
            await audit(request, 'config_push_blocked', body.deviceId, { env, ticketId })
            throw new ForbiddenError('Approval required before pushing config')
        }

        const dangerousCommand = body.commands.find((cmd) =>
            policy.dangerousList.some((rule) => cmd.toLowerCase().includes(rule.toLowerCase()))
        )

        if (dangerousCommand && env === 'prod' && !approvalGranted) {
            await audit(request, 'config_push_blocked', body.deviceId, sanitizeRecord({ env, ticketId, command: dangerousCommand }))
            throw new ForbiddenError('Dangerous command requires approval')
        }

        await audit(request, 'config_push', body.deviceId, {
            env,
            ticketId,
            commandCount: body.commands.length,
            riskLevel,
            sample: redactSensitive(body.commands[0] ?? '')
        })

        return reply.send({
            status: 'success',
            details: ['Config push accepted (mock).']
        })
    })
}
