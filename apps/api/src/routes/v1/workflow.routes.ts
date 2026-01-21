import type { FastifyInstance } from 'fastify'
import type { WorkflowService } from '@application/core'
import { getUserContext, requireRole } from './assets.helpers.js'
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

    fastify.post('/workflows', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = workflowCreateSchema.parse(request.body)
        const requestRecord = await workflowService.submitRequest(body, ctx)
        return reply.status(201).send({ data: requestRecord })
    })

    fastify.get('/workflows', async (request, reply) => {
        getUserContext(request)
        const query = workflowListSchema.parse(request.query)
        const result = await workflowService.listRequests(query)
        return reply.send({
            data: result.items,
            meta: { total: result.total, page: result.page, limit: result.limit }
        })
    })

    fastify.get('/workflows/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = workflowIdParamsSchema.parse(request.params)
        const record = await workflowService.getRequest(id)
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
