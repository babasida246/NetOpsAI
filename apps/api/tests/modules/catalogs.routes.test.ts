import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { catalogRoutes } from '../../src/routes/v1/assets/catalogs.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { CatalogService } from '@application/core'

describe('catalog routes', () => {
    let app: ReturnType<typeof Fastify>
    let catalogService: CatalogService
    const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
    const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }
    const catalogAdminHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'catalog_admin' }
    const categoryId = '11111111-1111-1111-1111-111111111111'
    const vendorId = '22222222-2222-2222-2222-222222222222'
    const modelId = '33333333-3333-3333-3333-333333333333'
    const locationId = '44444444-4444-4444-4444-444444444444'

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        catalogService = {
            listCatalogs: vi.fn().mockResolvedValue({
                categories: [],
                locations: [],
                vendors: [],
                models: []
            }),
            createCategory: vi.fn().mockResolvedValue({ category: { id: categoryId, name: 'Laptop', createdAt: new Date() } }),
            updateCategory: vi.fn().mockResolvedValue({ id: categoryId, name: 'Laptop', createdAt: new Date() }),
            deleteCategory: vi.fn().mockResolvedValue(undefined),
            createVendor: vi.fn().mockResolvedValue({ id: vendorId, name: 'Dell', createdAt: new Date() }),
            updateVendor: vi.fn().mockResolvedValue({ id: vendorId, name: 'Dell', createdAt: new Date() }),
            deleteVendor: vi.fn().mockResolvedValue(undefined),
            createModel: vi.fn().mockResolvedValue({ id: modelId, model: 'X1', spec: {}, createdAt: new Date() }),
            updateModel: vi.fn().mockResolvedValue({ id: modelId, model: 'X1', spec: {}, createdAt: new Date() }),
            deleteModel: vi.fn().mockResolvedValue(undefined),
            searchModels: vi.fn().mockResolvedValue([]),
            createLocation: vi.fn().mockResolvedValue({ id: locationId, name: 'HQ', path: '/l1', createdAt: new Date() }),
            updateLocation: vi.fn().mockResolvedValue({ id: locationId, name: 'HQ', path: '/l1', createdAt: new Date() }),
            deleteLocation: vi.fn().mockResolvedValue(undefined)
        } as unknown as CatalogService

        await app.register(catalogRoutes, { prefix: '/v1', catalogService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists catalogs with user context', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets/catalogs',
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toBeDefined()
    })

    it('rejects missing user id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets/catalogs'
        })

        expect(response.statusCode).toBe(401)
    })

    it('creates category with catalog admin role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/categories',
            headers: catalogAdminHeaders,
            payload: { name: 'Laptop' }
        })

        expect(response.statusCode).toBe(201)
        expect((catalogService.createCategory as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
    })

    it('rejects write for viewer role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/vendors',
            headers: viewerHeaders,
            payload: { name: 'Dell' }
        })

        expect(response.statusCode).toBe(403)
    })

    it('updates category', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/v1/assets/catalogs/categories/${categoryId}`,
            headers: managerHeaders,
            payload: { name: 'Updated' }
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.updateCategory).toHaveBeenCalledWith(categoryId, { name: 'Updated' })
    })

    it('deletes category', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/v1/assets/catalogs/categories/${categoryId}`,
            headers: managerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.deleteCategory).toHaveBeenCalledWith(categoryId)
    })

    it('creates vendor', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/vendors',
            headers: managerHeaders,
            payload: { name: 'Dell', email: 'support@dell.com' }
        })

        expect(response.statusCode).toBe(201)
        expect(catalogService.createVendor).toHaveBeenCalled()
    })

    it('updates vendor', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/v1/assets/catalogs/vendors/${vendorId}`,
            headers: managerHeaders,
            payload: { phone: '123' }
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.updateVendor).toHaveBeenCalledWith(vendorId, { phone: '123' })
    })

    it('deletes vendor', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/v1/assets/catalogs/vendors/${vendorId}`,
            headers: managerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.deleteVendor).toHaveBeenCalledWith(vendorId)
    })

    it('creates model', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/models',
            headers: managerHeaders,
            payload: { model: 'X1', spec: {} }
        })

        expect(response.statusCode).toBe(201)
        expect(catalogService.createModel).toHaveBeenCalled()
    })

    it('updates model', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/v1/assets/catalogs/models/${modelId}`,
            headers: managerHeaders,
            payload: { brand: 'Lenovo' }
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.updateModel).toHaveBeenCalledWith(modelId, { brand: 'Lenovo' })
    })

    it('deletes model', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/v1/assets/catalogs/models/${modelId}`,
            headers: managerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.deleteModel).toHaveBeenCalledWith(modelId)
    })

    it('creates location', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/locations',
            headers: managerHeaders,
            payload: { name: 'HQ' }
        })

        expect(response.statusCode).toBe(201)
        expect(catalogService.createLocation).toHaveBeenCalled()
    })

    it('updates location', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/v1/assets/catalogs/locations/${locationId}`,
            headers: managerHeaders,
            payload: { name: 'Branch' }
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.updateLocation).toHaveBeenCalledWith(locationId, { name: 'Branch' })
    })

    it('deletes location', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/v1/assets/catalogs/locations/${locationId}`,
            headers: managerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(catalogService.deleteLocation).toHaveBeenCalledWith(locationId)
    })
})
