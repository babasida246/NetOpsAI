import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { inventoryRoutes } from '../../src/routes/v1/inventory/inventory.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { InventoryService } from '@application/core'
import type { InventoryItemRecord, InventorySessionRecord } from '@contracts/shared'

describe('inventory routes', () => {
    let app: ReturnType<typeof Fastify>
    let inventoryService: InventoryService

    const session: InventorySessionRecord = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cycle count',
        status: 'draft',
        createdAt: new Date(),
        createdBy: 'user-1',
        correlationId: 'corr-1',
        locationId: null,
        startedAt: null,
        closedAt: null
    }

    const item: InventoryItemRecord = {
        id: 'item-1',
        sessionId: session.id,
        assetId: null,
        expectedLocationId: null,
        scannedLocationId: null,
        scannedAt: new Date(),
        status: 'unknown',
        note: null
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        inventoryService = {
            createSession: vi.fn().mockResolvedValue(session),
            listSessions: vi.fn().mockResolvedValue({ items: [session], total: 1, page: 1, limit: 20 }),
            getSession: vi.fn().mockResolvedValue(session),
            listItems: vi.fn().mockResolvedValue([item]),
            scanAsset: vi.fn().mockResolvedValue(item),
            closeSession: vi.fn().mockResolvedValue({ session, counts: { unknown: 1 } })
        } as unknown as InventoryService

        await app.register(inventoryRoutes, { prefix: '/v1', inventoryService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists inventory sessions', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/inventory/sessions',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
    })

    it('rejects session creation without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/inventory/sessions',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { name: 'Cycle count' }
        })

        expect(response.statusCode).toBe(403)
    })

    it('scans asset with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/v1/inventory/sessions/${session.id}/scan`,
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { assetCode: 'ASSET-1' }
        })

        expect(response.statusCode).toBe(200)
    })
})
