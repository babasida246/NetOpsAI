import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import {
    createBreakGlassEvent,
    createEvidenceCase,
    createJitGrant,
    createMaintenanceWindow,
    createPolicy,
    listBreakGlassEvents,
    listEvidenceCases,
    listJitGrants,
    listMaintenanceWindows,
    listPolicies,
    listApprovals,
    requestApproval,
    resolveApproval,
    updatePolicy
} from './governance.store.js'

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

function requireAdmin(authService: AuthService) {
    const auth = requireUser(authService)
    return async (request: FastifyRequest) => {
        await auth(request)
        if (request.user?.role !== 'admin' && request.user?.role !== 'super_admin') {
            throw new ForbiddenError('Admin access required')
        }
    }
}

export async function registerGovernanceRoutes(
    app: FastifyInstance,
    authService: AuthService,
    adminRepo: AdminRepository
): Promise<void> {
    const authenticateAdmin = requireAdmin(authService)

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
                resource: 'governance',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write governance audit log')
        }
    }

    app.get('/governance/policies', { preHandler: authenticateAdmin }, async (_request, reply) => {
        return reply.send(listPolicies())
    })

    app.post('/governance/policies', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as any
        const policy = createPolicy({
            name: body.name,
            environment: body.environment ?? 'all',
            allowList: body.allowList ?? [],
            denyList: body.denyList ?? [],
            dangerousList: body.dangerousList ?? [],
            requireApproval: body.requireApproval ?? false
        })
        await audit(request, 'policy_create', policy.id, { name: policy.name })
        return reply.send(policy)
    })

    app.post('/governance/policies/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const updates = request.body as any
        const policy = updatePolicy(id, updates)
        if (!policy) {
            return reply.code(404).send({ message: 'Policy not found' })
        }
        await audit(request, 'policy_update', policy.id, { name: policy.name })
        return reply.send(policy)
    })

    app.get('/governance/approvals', { preHandler: authenticateAdmin }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId?: string }
        return reply.send(listApprovals(deviceId))
    })

    app.post('/governance/approvals', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as { deviceId: string; ticketId: string; reason: string }
        const approval = requestApproval({
            deviceId: body.deviceId,
            ticketId: body.ticketId,
            reason: body.reason,
            requestedBy: request.user?.email || request.user?.sub || 'admin'
        })
        await audit(request, 'approval_request', approval.id, { deviceId: body.deviceId, ticketId: body.ticketId })
        return reply.send(approval)
    })

    app.post('/governance/approvals/:id/resolve', { preHandler: authenticateAdmin }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const body = request.body as { status: 'approved' | 'rejected' }
        const approval = resolveApproval(id, body.status, request.user?.email || request.user?.sub || 'admin')
        if (!approval) {
            return reply.code(404).send({ message: 'Approval not found' })
        }
        await audit(request, `approval_${body.status}`, approval.id, { deviceId: approval.deviceId, ticketId: approval.ticketId })
        return reply.send(approval)
    })

    app.get('/governance/maintenance-windows', { preHandler: authenticateAdmin }, async (_request, reply) => {
        return reply.send(listMaintenanceWindows())
    })

    app.post('/governance/maintenance-windows', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as { title: string; environment?: string; startAt: string; endAt: string }
        const window = createMaintenanceWindow({
            title: body.title,
            environment: (body.environment ?? 'all') as any,
            startAt: body.startAt,
            endAt: body.endAt,
            createdBy: request.user?.email || request.user?.sub || 'admin'
        })
        await audit(request, 'maintenance_create', window.id, { title: window.title })
        return reply.send(window)
    })

    app.get('/governance/jit-grants', { preHandler: authenticateAdmin }, async (_request, reply) => {
        return reply.send(listJitGrants())
    })

    app.post('/governance/jit-grants', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as { userId: string; role: string; expiresAt: string; reason: string }
        const grant = createJitGrant({
            userId: body.userId,
            role: body.role,
            expiresAt: body.expiresAt,
            reason: body.reason,
            createdBy: request.user?.email || request.user?.sub || 'admin'
        })
        await audit(request, 'jit_grant', grant.id, { userId: body.userId })
        return reply.send(grant)
    })

    app.get('/governance/break-glass', { preHandler: authenticateAdmin }, async (_request, reply) => {
        return reply.send(listBreakGlassEvents())
    })

    app.post('/governance/break-glass', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as { reason: string }
        const event = createBreakGlassEvent({
            userId: request.user?.sub || 'admin',
            reason: body.reason
        })
        await audit(request, 'break_glass', event.id, { reason: body.reason })
        return reply.send(event)
    })

    app.get('/governance/evidence', { preHandler: authenticateAdmin }, async (_request, reply) => {
        return reply.send(listEvidenceCases())
    })

    app.post('/governance/evidence', { preHandler: authenticateAdmin }, async (request, reply) => {
        const body = request.body as { deviceId: string; ticketId: string; summary: string; snapshotIds?: string[] }
    const evidence = createEvidenceCase({
        deviceId: body.deviceId,
        ticketId: body.ticketId,
        summary: body.summary,
        snapshotIds: body.snapshotIds ?? [],
        createdBy: request.user?.email || request.user?.sub || 'admin'
    })
        await audit(request, 'evidence_create', evidence.id, { deviceId: body.deviceId, ticketId: body.ticketId })
        return reply.send(evidence)
    })
}
