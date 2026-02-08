import type { FastifyInstance } from 'fastify'
import type { MaintenanceService } from '@application/core'
import {
    assetIdParamsSchema,
    maintenanceListSchema,
    maintenanceOpenSchema,
    maintenanceUpdateSchema
} from '../assets/assets.schemas.js'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'

interface MaintenanceRoutesOptions {
    maintenanceService: MaintenanceService
}

export async function maintenanceRoutes(
    fastify: FastifyInstance,
    opts: MaintenanceRoutesOptions
): Promise<void> {
    const maintenanceService = opts.maintenanceService

    fastify.get('/maintenance', async (request, reply) => {
        getUserContext(request)
        const query = maintenanceListSchema.parse(request.query)
        const result = await maintenanceService.listTickets(query)
        return reply.send({
            data: result.items,
            meta: { total: result.total, page: result.page, limit: result.limit }
        })
    })

    fastify.post('/maintenance', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = maintenanceOpenSchema.parse(request.body)
        const { assetId, ...payload } = body
        const ticket = await maintenanceService.openTicket(assetId, payload, ctx)
        return reply.status(201).send({ data: ticket })
    })

    fastify.put('/maintenance/:id/status', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = maintenanceUpdateSchema.parse(request.body)
        const updated = await maintenanceService.updateTicketStatus(id, body.status, {
            diagnosis: body.diagnosis,
            resolution: body.resolution,
            closedAt: body.closedAt
        }, ctx)
        return reply.send({ data: updated })
    })
}
