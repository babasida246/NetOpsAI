import type { FastifyInstance } from 'fastify'
import type { WorkflowService } from '@application/core'
import { NotFoundError } from '../../../shared/errors/http-errors.js'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'
import {
    workflowCreateSchema,
    workflowIdParamsSchema,
    workflowListSchema,
    workflowRejectSchema
} from './workflow.schemas.js'

interface WorkflowRoutesOptions {
    workflowService: WorkflowService
}

export async function workflowRoutes(
    fastify: FastifyInstance,
    opts: WorkflowRoutesOptions
): Promise<void> {
    const workflowService = opts.workflowService
    const privilegedRoles = new Set(['it_asset_manager', 'admin', 'super_admin'])

    fastify.post('/workflows', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = workflowCreateSchema.parse(request.body)
        const requestRecord = await workflowService.submitRequest(body, ctx)
        return reply.status(201).send({ data: requestRecord })
    })

    fastify.get('/workflows', async (request, reply) => {
        const ctx = getUserContext(request)
        const query = workflowListSchema.parse(request.query)
        const isPrivileged = privilegedRoles.has(ctx.role)
        const filters = isPrivileged ? query : { ...query, requestedBy: ctx.userId }
        const result = await workflowService.listRequests(filters)
        return reply.send({
            data: result.items,
            meta: { total: result.total, page: result.page, limit: result.limit }
        })
    })

    fastify.get('/workflows/:id', async (request, reply) => {
        const ctx = getUserContext(request)
        const { id } = workflowIdParamsSchema.parse(request.params)
        const record = await workflowService.getRequest(id)
        const isPrivileged = privilegedRoles.has(ctx.role)
        if (!isPrivileged && record.requestedBy !== ctx.userId) {
            throw new NotFoundError('Workflow request not found')
        }
        return reply.send({ data: record })
    })

    fastify.post('/workflows/:id/approve', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = workflowIdParamsSchema.parse(request.params)
        const updated = await workflowService.approveRequest(id, ctx)
        return reply.send({ data: updated })
    })

    fastify.post('/workflows/:id/reject', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = workflowIdParamsSchema.parse(request.params)
        const body = workflowRejectSchema.parse(request.body)
        const updated = await workflowService.rejectRequest(id, body.reason, ctx)
        return reply.send({ data: updated })
    })

    fastify.post('/workflows/:id/execute', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = workflowIdParamsSchema.parse(request.params)
        const updated = await workflowService.executeRequest(id, ctx)
        return reply.send({ data: updated })
    })
}
