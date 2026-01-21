import type { FastifyInstance } from 'fastify'
import type { InventoryService } from '@application/core'
import type { InventoryItemRecord } from '@contracts/shared'
import { getUserContext, requireRole } from './assets.helpers.js'
import {
    inventoryScanSchema,
    inventorySessionCreateSchema,
    inventorySessionIdSchema,
    inventorySessionListSchema
} from './inventory.schemas.js'

interface InventoryRoutesOptions {
    inventoryService: InventoryService
}

export async function inventoryRoutes(
    fastify: FastifyInstance,
    opts: InventoryRoutesOptions
): Promise<void> {
    const inventoryService = opts.inventoryService

    fastify.post('/inventory/sessions', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = inventorySessionCreateSchema.parse(request.body)
        const session = await inventoryService.createSession(body, ctx)
        return reply.status(201).send({ data: session })
    })

    fastify.get('/inventory/sessions', async (request, reply) => {
        getUserContext(request)
        const query = inventorySessionListSchema.parse(request.query)
        const result = await inventoryService.listSessions(query)
        return reply.send({
            data: result.items,
            meta: { total: result.total, page: result.page, limit: result.limit }
        })
    })

    fastify.get('/inventory/sessions/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = inventorySessionIdSchema.parse(request.params)
        const session = await inventoryService.getSession(id)
        const items = await inventoryService.listItems(id)
        return reply.send({ data: { session, items } })
    })

    fastify.post('/inventory/sessions/:id/scan', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = inventorySessionIdSchema.parse(request.params)
        const body = inventoryScanSchema.parse(request.body)
        const item = await inventoryService.scanAsset({ ...body, sessionId: id }, ctx)
        return reply.send({ data: item })
    })

    fastify.post('/inventory/sessions/:id/close', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = inventorySessionIdSchema.parse(request.params)
        const result = await inventoryService.closeSession(id)
        return reply.send({ data: result })
    })

    fastify.get('/inventory/sessions/:id/report', async (request, reply) => {
        getUserContext(request)
        const { id } = inventorySessionIdSchema.parse(request.params)
        const session = await inventoryService.getSession(id)
        const items: InventoryItemRecord[] = await inventoryService.listItems(id)
        const counts = items.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1
            return acc
        }, {})
        return reply.send({ data: { session, counts } })
    })
}
