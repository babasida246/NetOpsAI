import type { FastifyInstance } from 'fastify'
import type { AssetService } from '@application/core'
import {
    assetCreateSchema,
    assetIdParamsSchema,
    assetSearchSchema,
    assetUpdateSchema,
    assignmentSchema,
    moveSchema,
    returnSchema,
    statusSchema,
    timelineSchema
} from './assets.schemas.js'
import type { AssetRecord } from '@contracts/shared'
import { getUserContext, requireRole } from './assets.helpers.js'

interface AssetRoutesOptions {
    assetService: AssetService
}

function csvEscape(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/\"/g, '""')}"`
    }
    return value
}

function toCsv(items: AssetRecord[]): string {
    const headers = [
        'asset_code',
        'status',
        'model',
        'vendor',
        'location',
        'serial_no',
        'mgmt_ip',
        'warranty_end'
    ]
    const lines = items.map(item => ([
        item.assetCode,
        item.status,
        item.modelName ?? '',
        item.vendorName ?? '',
        item.locationName ?? '',
        item.serialNo ?? '',
        item.mgmtIp ?? '',
        item.warrantyEnd ? item.warrantyEnd.toISOString().slice(0, 10) : ''
    ]).map(value => csvEscape(String(value))).join(','))
    return [headers.join(','), ...lines].join('\n')
}

export async function assetsRoutes(fastify: FastifyInstance, opts: AssetRoutesOptions): Promise<void> {
    const assetService = opts.assetService

    fastify.get('/assets', async (request, reply) => {
        getUserContext(request)
        const filters = assetSearchSchema.parse(request.query)
        const { export: exportType, ...searchFilters } = filters
        const result = await assetService.searchAssets(searchFilters)

        if (exportType === 'csv') {
            const csv = toCsv(await assetService.exportAssetsCsvData(searchFilters))
            return reply.type('text/csv').send(csv)
        }

        return reply.send({
            data: result.items,
            meta: { total: result.total, page: result.page, limit: result.limit }
        })
    })

    fastify.get('/assets/export', async (request, reply) => {
        getUserContext(request)
        const filters = assetSearchSchema.parse(request.query)
        const { export: _export, ...searchFilters } = filters
        const csv = toCsv(await assetService.exportAssetsCsvData(searchFilters))
        return reply.type('text/csv').send(csv)
    })

    fastify.post('/assets', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = assetCreateSchema.parse(request.body)
        const created = await assetService.createAsset({
            ...body,
            status: body.status ?? 'in_stock'
        }, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.get('/assets/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = assetIdParamsSchema.parse(request.params)
        const detail = await assetService.getAssetDetail(id)
        return reply.send({ data: detail })
    })

    fastify.put('/assets/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = assetUpdateSchema.parse(request.body)
        const updated = await assetService.updateAsset(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.post('/assets/:id/assign', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = assignmentSchema.parse(request.body)
        const result = await assetService.assignAsset(id, body, ctx)
        return reply.send({ data: result })
    })

    fastify.post('/assets/:id/return', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = returnSchema.parse(request.body)
        const result = await assetService.returnAsset(id, body.note, ctx)
        return reply.send({ data: result })
    })

    fastify.post('/assets/:id/move', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = moveSchema.parse(request.body)
        const result = await assetService.moveAsset(id, body.locationId, ctx)
        return reply.send({ data: result })
    })

    fastify.post('/assets/:id/status', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = assetIdParamsSchema.parse(request.params)
        const body = statusSchema.parse(request.body)
        const result = await assetService.changeStatus(id, body.status, ctx)
        return reply.send({ data: result })
    })

    fastify.get('/assets/:id/timeline', async (request, reply) => {
        getUserContext(request)
        const { id } = assetIdParamsSchema.parse(request.params)
        const query = timelineSchema.parse(request.query)
        const result = await assetService.listTimeline(id, query.page ?? 1, query.limit ?? 20)
        return reply.send({ data: result.items, meta: { page: result.page, limit: result.limit } })
    })
}
