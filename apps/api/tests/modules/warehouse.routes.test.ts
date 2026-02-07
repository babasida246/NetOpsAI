import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import { warehouseRoutes } from '../../src/routes/v1/warehouse/warehouse.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { StockService, WarehouseCatalogService } from '@application/core'
import type { SparePartRecord, StockViewRecord, WarehouseRecord } from '@contracts/shared'

describe('warehouse routes', () => {
    let app: ReturnType<typeof Fastify>
    let catalogService: WarehouseCatalogService
    let stockService: StockService

    const warehouse: WarehouseRecord = {
        id: '123e4567-e89b-12d3-a456-426614174010',
        code: 'WH-01',
        name: 'Main Warehouse',
        locationId: null,
        createdAt: new Date()
    }

    const part: SparePartRecord = {
        id: '123e4567-e89b-12d3-a456-426614174020',
        partCode: 'PART-01',
        name: 'Cooling Fan',
        category: null,
        uom: 'pcs',
        manufacturer: null,
        model: null,
        spec: {},
        minLevel: 1,
        createdAt: new Date()
    }

    const stockView: StockViewRecord = {
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        warehouseName: warehouse.name,
        partId: part.id,
        partCode: part.partCode,
        partName: part.name,
        onHand: 10,
        reserved: 2,
        available: 8,
        uom: part.uom,
        minLevel: 1
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        catalogService = {
            listWarehouses: vi.fn().mockResolvedValue([warehouse]),
            createWarehouse: vi.fn().mockResolvedValue(warehouse),
            updateWarehouse: vi.fn().mockResolvedValue(warehouse),
            listParts: vi.fn().mockResolvedValue({ items: [part], total: 1, page: 1, limit: 20 }),
            createPart: vi.fn().mockResolvedValue(part),
            updatePart: vi.fn().mockResolvedValue(part)
        } as unknown as WarehouseCatalogService

        stockService = {
            listView: vi.fn().mockResolvedValue({ items: [stockView], total: 1, page: 1, limit: 20 })
        } as unknown as StockService

        await app.register(warehouseRoutes, { prefix: '/v1', catalogService, stockService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists warehouses', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/warehouses',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })

    it('rejects warehouse create without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/warehouses',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { code: 'WH-02', name: 'Secondary' }
        })

        expect(response.statusCode).toBe(403)
    })

    it('creates warehouses with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/warehouses',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { code: 'WH-02', name: 'Secondary' }
        })

        expect(response.statusCode).toBe(201)
    })

    it('lists spare parts', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/spare-parts',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })

    it('lists stock view', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/stock/view',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })
})
