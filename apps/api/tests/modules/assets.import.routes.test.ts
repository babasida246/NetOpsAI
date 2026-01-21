import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { assetImportRoutes } from '../../src/routes/v1/assets.import.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { AssetService } from '@application/core'

describe('asset import routes', () => {
    let app: ReturnType<typeof Fastify>
    let assetService: AssetService

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        assetService = {
            bulkImportPreview: vi.fn().mockResolvedValue({ items: [], total: 0, validCount: 0, invalidCount: 0 }),
            bulkImportCommit: vi.fn().mockResolvedValue({ created: 0, updated: 0, skipped: 0 })
        } as unknown as AssetService

        await app.register(assetImportRoutes, { prefix: '/v1', assetService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('rejects preview without manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/import/preview',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { rows: [] }
        })

        expect(response.statusCode).toBe(403)
    })

    it('previews import with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/import/preview',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: {
                rows: [{ assetCode: 'ASSET-1', modelId: '123e4567-e89b-12d3-a456-426614174000' }]
            }
        })

        expect(response.statusCode).toBe(200)
    })
})
