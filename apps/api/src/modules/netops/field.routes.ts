import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { AdminRepository } from '../admin/admin.repository.js'
import {
    addNote,
    captureSnapshot,
    generateConnectivityPlan,
    generatePlaybook,
    getVisualizer,
    listNotes,
    listPlaybooks,
    listQuickChecks,
    listSnapshots,
    listSnippets,
    listFieldAudits,
    recordFieldAudit,
    runQuickCheck,
    type Vendor
} from './field.store.js'
import { listApprovals, requestApproval } from './governance.store.js'

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

export async function registerFieldRoutes(
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
                resource: 'field_kit',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write field audit log')
        }
    }

    app.post('/field/quick-check/run', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; vendor: Vendor; ticketId?: string }
        const ticketId = safeTicketId(body.ticketId)
        const snapshot = runQuickCheck({ deviceId: body.deviceId, vendor: body.vendor, ticketId })
        recordFieldAudit({
            deviceId: body.deviceId,
            type: 'FIELD_QUICK_CHECK_RUN',
            actor: request.user?.sub || 'unknown',
            detail: `Quick check ${snapshot.overallStatus}`,
            ticketId
        })
        await audit(request, 'quick_check_run', snapshot.id, { deviceId: body.deviceId, ticketId })
        return reply.send(snapshot)
    })

    app.get('/field/quick-check', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId: string }
        return reply.send(listQuickChecks(deviceId))
    })

    app.post('/field/playbook/generate', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { scenario: any; vendor: Vendor; deviceId: string; ticketId?: string }
        const playbook = generatePlaybook({ scenario: body.scenario, vendor: body.vendor, deviceId: body.deviceId })
        await audit(request, 'playbook_generate', playbook.id, { deviceId: body.deviceId, ticketId: safeTicketId(body.ticketId) })
        return reply.send(playbook)
    })

    app.get('/field/playbook', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId: string }
        return reply.send(listPlaybooks(deviceId))
    })

    app.get('/field/snippets', { preHandler: authenticate }, async (_request, reply) => {
        return reply.send(listSnippets())
    })

    app.get('/field/visualizer', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId: string }
        return reply.send(getVisualizer(deviceId))
    })

    app.post('/field/connectivity/generate', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; vendor: Vendor }
        return reply.send(generateConnectivityPlan(body))
    })

    app.post('/field/snapshot/capture', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; quickCheckId?: string; notes?: string; ticketId?: string }
        const snapshot = captureSnapshot(body)
        const ticketId = safeTicketId(body.ticketId)
        recordFieldAudit({
            deviceId: body.deviceId,
            type: 'FIELD_SNAPSHOT_CAPTURE',
            actor: request.user?.sub || 'unknown',
            detail: snapshot.summary,
            ticketId
        })
        await audit(request, 'snapshot_capture', snapshot.id, { deviceId: body.deviceId, ticketId })
        return reply.send(snapshot)
    })

    app.get('/field/snapshot', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId: string }
        return reply.send(listSnapshots(deviceId))
    })

    app.post('/field/notes', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; message: string; attachments?: string[]; ticketId?: string }
        const note = addNote({
            deviceId: body.deviceId,
            author: request.user?.email || request.user?.sub || 'field-tech',
            message: body.message,
            attachments: body.attachments
        })
        const ticketId = safeTicketId(body.ticketId)
        recordFieldAudit({
            deviceId: body.deviceId,
            type: 'FIELD_NOTE_ADD',
            actor: request.user?.sub || 'unknown',
            detail: 'Field note added',
            ticketId
        })
        await audit(request, 'note_add', note.id, { deviceId: body.deviceId, ticketId })
        return reply.send(note)
    })

    app.get('/field/notes', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId: string }
        return reply.send(listNotes(deviceId))
    })

    app.post('/field/approvals', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; reason: string; ticketId?: string }
        const approval = requestApproval({
            deviceId: body.deviceId,
            ticketId: safeTicketId(body.ticketId),
            requestedBy: request.user?.email || request.user?.sub || 'unknown',
            reason: body.reason
        })
        await audit(request, 'approval_request', approval.id, { deviceId: body.deviceId, ticketId: approval.ticketId })
        return reply.send(approval)
    })

    app.get('/field/approvals', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId?: string }
        return reply.send(listApprovals(deviceId))
    })

    app.post('/field/audit', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { deviceId: string; type: string; detail: string; ticketId?: string }
        const ticketId = safeTicketId(body.ticketId)
        const entry = recordFieldAudit({
            deviceId: body.deviceId,
            type: body.type,
            actor: request.user?.sub || 'unknown',
            detail: body.detail,
            ticketId
        })
        await audit(request, 'field_audit', entry.id, { deviceId: body.deviceId, ticketId })
        return reply.send(entry)
    })

    app.get('/field/audit', { preHandler: authenticate }, async (request, reply) => {
        const { deviceId } = request.query as { deviceId?: string }
        return reply.send(listFieldAudits(deviceId))
    })
}
