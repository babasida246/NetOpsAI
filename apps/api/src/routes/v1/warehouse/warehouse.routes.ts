import type { FastifyInstance } from 'fastify'
import type { StockService, WarehouseCatalogService } from '@application/core'
import {
    sparePartCreateSchema,
    sparePartIdParamsSchema,
    sparePartListSchema,
    sparePartUpdateSchema,
    stockViewSchema,
    warehouseCreateSchema,
    warehouseIdParamsSchema,
    warehouseUpdateSchema
} from '../maintenance/maintenance-warehouse.schemas.js'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'

interface WarehouseRoutesOptions {
    catalogService: WarehouseCatalogService
    stockService: StockService
}

export async function warehouseRoutes(
    fastify: FastifyInstance,
    opts: WarehouseRoutesOptions
): Promise<void> {
    const { catalogService, stockService } = opts

    fastify.get('/warehouses', async (request, reply) => {
        getUserContext(request)
        const records = await catalogService.listWarehouses()
        return reply.send({ data: records })
    })

    fastify.post('/warehouses', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = warehouseCreateSchema.parse(request.body)
        const created = await catalogService.createWarehouse(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/warehouses/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = warehouseIdParamsSchema.parse(request.params)
        const body = warehouseUpdateSchema.parse(request.body)
        const updated = await catalogService.updateWarehouse(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.get('/spare-parts', async (request, reply) => {
        getUserContext(request)
        const query = sparePartListSchema.parse(request.query)
        const result = await catalogService.listParts(query)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })

    fastify.post('/spare-parts', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = sparePartCreateSchema.parse(request.body)
        const created = await catalogService.createPart(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/spare-parts/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = sparePartIdParamsSchema.parse(request.params)
        const body = sparePartUpdateSchema.parse(request.body)
        const updated = await catalogService.updatePart(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.get('/stock/view', async (request, reply) => {
        const ctx = getUserContext(request)
        const query = stockViewSchema.parse(request.query)
        const result = await stockService.listView({
            warehouseId: query.warehouseId,
            q: query.q,
            belowMin: query.belowMin,
            page: query.page,
            limit: query.limit
        }, ctx)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })
}
