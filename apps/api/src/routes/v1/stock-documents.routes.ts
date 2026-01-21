import type { FastifyInstance } from 'fastify'
import type { StockDocumentService } from '@application/core'
import { getUserContext, requireRole } from './assets.helpers.js'
import {
    stockDocumentCreateSchema,
    stockDocumentIdParamsSchema,
    stockDocumentListSchema,
    stockDocumentUpdateSchema,
    stockLedgerSchema
} from './maintenance-warehouse.schemas.js'

interface StockDocumentRoutesOptions {
    stockDocumentService: StockDocumentService
}

function generateStockDocCode(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(100000 + Math.random() * 900000)
    return `SD-${year}-${random}`
}

export async function stockDocumentRoutes(
    fastify: FastifyInstance,
    opts: StockDocumentRoutesOptions
): Promise<void> {
    const { stockDocumentService } = opts

    fastify.get('/stock-documents', async (request, reply) => {
        getUserContext(request)
        const query = stockDocumentListSchema.parse(request.query)
        const result = await stockDocumentService.listDocuments(query)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })

    fastify.get('/stock-documents/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = stockDocumentIdParamsSchema.parse(request.params)
        const detail = await stockDocumentService.getDocument(id)
        return reply.send({ data: detail })
    })

    fastify.post('/stock-documents', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = stockDocumentCreateSchema.parse(request.body)
        const code = body.code?.trim() || generateStockDocCode()
        const docDate = body.docDate?.trim() || undefined
        const detail = await stockDocumentService.createDocument({
            docType: body.docType,
            code,
            warehouseId: body.warehouseId ?? null,
            targetWarehouseId: body.targetWarehouseId ?? null,
            docDate,
            refType: body.refType ?? null,
            refId: body.refId ?? null,
            note: body.note ?? null
        }, body.lines, ctx)
        return reply.status(201).send({ data: detail })
    })

    fastify.put('/stock-documents/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = stockDocumentIdParamsSchema.parse(request.params)
        const body = stockDocumentUpdateSchema.parse(request.body)
        const docDate = body.docDate?.trim() || undefined
        const detail = await stockDocumentService.updateDocument(id, {
            docDate,
            note: body.note ?? null,
            warehouseId: body.warehouseId ?? null,
            targetWarehouseId: body.targetWarehouseId ?? null,
            correlationId: ctx.correlationId
        }, body.lines, ctx)
        return reply.send({ data: detail })
    })

    fastify.post('/stock-documents/:id/post', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = stockDocumentIdParamsSchema.parse(request.params)
        const posted = await stockDocumentService.postDocument(id, ctx)
        return reply.send({ data: posted })
    })

    fastify.post('/stock-documents/:id/cancel', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = stockDocumentIdParamsSchema.parse(request.params)
        const canceled = await stockDocumentService.cancelDocument(id, ctx)
        return reply.send({ data: canceled })
    })

    fastify.get('/stock/ledger', async (request, reply) => {
        getUserContext(request)
        const query = stockLedgerSchema.parse(request.query)
        const result = await stockDocumentService.listMovements(query)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })
}
