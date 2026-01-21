import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { assetsRoutes } from '../../src/routes/v1/assets.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { AssetRecord, AssetAssignmentRecord } from '@contracts/shared'
import type { AssetService } from '@application/core'

describe('assets routes', () => {
    let app: ReturnType<typeof Fastify>
    let assetService: AssetService
    const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
    const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }

    const asset: AssetRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        assetCode: 'ASSET-1',
        status: 'in_stock',
        modelId: '123e4567-e89b-12d3-a456-426614174099',
        serialNo: null,
        macAddress: null,
        mgmtIp: null,
        hostname: null,
        vlanId: null,
        switchName: null,
        switchPort: null,
        locationId: null,
        purchaseDate: null,
        warrantyEnd: null,
        vendorId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
    }

    const assignment: AssetAssignmentRecord = {
        id: 'assign-1',
        assetId: asset.id,
        assigneeType: 'person',
        assigneeId: 'user-1',
        assigneeName: 'User 1',
        assignedAt: new Date(),
        returnedAt: null,
        note: null
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        assetService = {
            searchAssets: vi.fn().mockResolvedValue({ items: [asset], total: 1, page: 1, limit: 20 }),
            exportAssetsCsvData: vi.fn().mockResolvedValue([asset]),
            createAsset: vi.fn().mockResolvedValue(asset),
            getAssetDetail: vi.fn().mockResolvedValue({ asset, assignments: [assignment], maintenance: [] }),
            updateAsset: vi.fn().mockResolvedValue(asset),
            assignAsset: vi.fn().mockResolvedValue({ asset, assignment }),
            returnAsset: vi.fn().mockResolvedValue({ asset, assignment }),
            moveAsset: vi.fn().mockResolvedValue(asset),
            changeStatus: vi.fn().mockResolvedValue(asset),
            listTimeline: vi.fn().mockResolvedValue({ items: [], page: 1, limit: 20 })
        } as unknown as AssetService

        await app.register(assetsRoutes, { prefix: '/v1', assetService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists assets', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets',
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })

    it('rejects writes without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets',
            headers: viewerHeaders,
            payload: { assetCode: 'ASSET-2' }
        })

        expect(response.statusCode).toBe(403)
    })

    it('creates assets with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets',
            headers: managerHeaders,
            payload: { assetCode: 'ASSET-2', modelId: asset.modelId }
        })

        expect(response.statusCode).toBe(201)
    })

    it('returns asset detail', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/v1/assets/${asset.id}`,
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.asset.id).toBe(asset.id)
    })

    it('updates asset data', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/v1/assets/${asset.id}`,
            headers: managerHeaders,
            payload: { hostname: 'asset-1' }
        })

        expect(response.statusCode).toBe(200)
        expect(assetService.updateAsset).toHaveBeenCalledWith(
            asset.id,
            { hostname: 'asset-1' },
            expect.objectContaining({ userId: 'user-1' })
        )
    })

    it('assigns asset with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/v1/assets/${asset.id}/assign`,
            headers: managerHeaders,
            payload: { assigneeType: 'person', assigneeId: 'user-2', assigneeName: 'User 2' }
        })

        expect(response.statusCode).toBe(200)
        expect(assetService.assignAsset).toHaveBeenCalled()
    })

    it('returns asset with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/v1/assets/${asset.id}/return`,
            headers: managerHeaders,
            payload: { note: 'Returned' }
        })

        expect(response.statusCode).toBe(200)
        expect(assetService.returnAsset).toHaveBeenCalledWith(
            asset.id,
            'Returned',
            expect.objectContaining({ userId: 'user-1' })
        )
    })

    it('moves asset with manager role', async () => {
        const locationId = '123e4567-e89b-12d3-a456-426614174111'
        const response = await app.inject({
            method: 'POST',
            url: `/v1/assets/${asset.id}/move`,
            headers: managerHeaders,
            payload: { locationId }
        })

        expect(response.statusCode).toBe(200)
        expect(assetService.moveAsset).toHaveBeenCalledWith(
            asset.id,
            locationId,
            expect.objectContaining({ userId: 'user-1' })
        )
    })

    it('updates status with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/v1/assets/${asset.id}/status`,
            headers: managerHeaders,
            payload: { status: 'in_use' }
        })

        expect(response.statusCode).toBe(200)
    })

    it('returns asset timeline', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/v1/assets/${asset.id}/timeline?page=1&limit=10`,
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(assetService.listTimeline).toHaveBeenCalled()
    })

    it('exports assets as csv', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets?export=csv',
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(response.headers['content-type']).toContain('text/csv')
        expect(response.body).toContain('asset_code')
        expect(response.body).toContain(asset.assetCode)
    })

    it('exports assets from export endpoint', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets/export',
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(response.headers['content-type']).toContain('text/csv')
    })
})
