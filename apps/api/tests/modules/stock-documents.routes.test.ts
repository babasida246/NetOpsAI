import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import { stockDocumentRoutes } from '../../src/routes/v1/stock-documents.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { StockDocumentService } from '@application/core'
import type { StockDocumentDetail, StockDocumentLineRecord, StockDocumentRecord, StockMovementRecord } from '@contracts/shared'

describe('stock document routes', () => {
    let app: ReturnType<typeof Fastify>
    let stockDocumentService: StockDocumentService

    const document: StockDocumentRecord = {
        id: '123e4567-e89b-12d3-a456-426614174100',
        docType: 'receipt',
        code: 'SD-2025-000001',
        status: 'draft',
        warehouseId: null,
        targetWarehouseId: null,
        docDate: '2025-01-01',
        refType: null,
        refId: null,
        note: null,
        createdBy: 'user-1',
        approvedBy: null,
        correlationId: 'corr-1',
        createdAt: new Date(),
        updatedAt: new Date()
    }

    const line: StockDocumentLineRecord = {
        id: '123e4567-e89b-12d3-a456-426614174101',
        documentId: document.id,
        partId: '123e4567-e89b-12d3-a456-426614174200',
        qty: 2,
        unitCost: 10,
        serialNo: null,
        note: null,
        adjustDirection: null
    }

    const detail: StockDocumentDetail = {
        document,
        lines: [line]
    }

    const movement: StockMovementRecord = {
        id: '123e4567-e89b-12d3-a456-426614174150',
        warehouseId: '123e4567-e89b-12d3-a456-426614174010',
        partId: line.partId,
        movementType: 'in',
        qty: 2,
        unitCost: 10,
        refType: 'stock_document',
        refId: document.id,
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        createdAt: new Date()
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        stockDocumentService = {
            listDocuments: vi.fn().mockResolvedValue({ items: [document], total: 1, page: 1, limit: 20 }),
            getDocument: vi.fn().mockResolvedValue(detail),
            createDocument: vi.fn().mockResolvedValue(detail),
            updateDocument: vi.fn().mockResolvedValue(detail),
            postDocument: vi.fn().mockResolvedValue({ ...document, status: 'posted' }),
            cancelDocument: vi.fn().mockResolvedValue({ ...document, status: 'canceled' }),
            listMovements: vi.fn().mockResolvedValue({ items: [movement], total: 1, page: 1, limit: 20 })
        } as unknown as StockDocumentService

        await app.register(stockDocumentRoutes, { prefix: '/v1', stockDocumentService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists stock documents', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/stock-documents',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })

    it('rejects create without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/stock-documents',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { docType: 'receipt', lines: [{ partId: line.partId, qty: 1 }] }
        })

        expect(response.statusCode).toBe(403)
    })

    it('creates stock documents with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/stock-documents',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { docType: 'receipt', lines: [{ partId: line.partId, qty: 1 }] }
        })

        expect(response.statusCode).toBe(201)
    })

    it('posts stock documents', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/v1/stock-documents/${document.id}/post`,
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.status).toBe('posted')
    })

    it('lists stock ledger', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/stock/ledger',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })
})
