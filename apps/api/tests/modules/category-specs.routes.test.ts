import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import { categorySpecRoutes } from '../../src/routes/v1/category-specs.routes.js'
import { catalogRoutes } from '../../src/routes/v1/catalogs.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import { CatalogService, CategorySpecService } from '@application/core'
import { FakeCatalogRepo, FakeSpecRepo, FakeSpecVersionRepo } from './category-specs.fakes.js'

const adminHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'catalog_admin' }
const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }
const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }

describe('category spec routes', () => {
    let app: ReturnType<typeof Fastify>
    let catalogService: CatalogService
    let categorySpecService: CategorySpecService

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)
        const catalogs = new FakeCatalogRepo()
        const versions = new FakeSpecVersionRepo()
        const specs = new FakeSpecRepo(catalogs, versions)
        catalogService = new CatalogService(catalogs, specs, versions)
        categorySpecService = new CategorySpecService(catalogs, specs, versions)
        await app.register(categorySpecRoutes, { prefix: '/v1', catalogService, categorySpecService })
        await app.register(catalogRoutes, { prefix: '/v1', catalogService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('creates category with template', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/asset-categories',
            headers: adminHeaders,
            payload: { name: 'RAM' }
        })

        expect(response.statusCode).toBe(201)
        const body = response.json()
        expect(body.data.category.name).toBe('RAM')
        expect(body.data.specDefs.length).toBeGreaterThan(0)
    })

    it('lists spec defs for category', async () => {
        const create = await app.inject({
            method: 'POST',
            url: '/v1/asset-categories',
            headers: adminHeaders,
            payload: { name: 'RAM' }
        })
        const categoryId = create.json().data.category.id as string

        const response = await app.inject({
            method: 'GET',
            url: `/v1/asset-categories/${categoryId}/spec-defs`,
            headers: viewerHeaders
        })

        expect(response.statusCode).toBe(200)
        expect(response.json().data.length).toBeGreaterThan(0)
    })

    it('rejects schema edits for non catalog admin', async () => {
        const create = await app.inject({
            method: 'POST',
            url: '/v1/asset-categories',
            headers: adminHeaders,
            payload: { name: 'RAM' }
        })
        const categoryId = create.json().data.category.id as string

        const response = await app.inject({
            method: 'POST',
            url: `/v1/asset-categories/${categoryId}/spec-versions`,
            headers: managerHeaders
        })

        expect(response.statusCode).toBe(403)
    })

    it('rejects invalid model spec', async () => {
        const create = await app.inject({
            method: 'POST',
            url: '/v1/asset-categories',
            headers: adminHeaders,
            payload: { name: 'RAM' }
        })
        const categoryId = create.json().data.category.id as string

        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/models',
            headers: managerHeaders,
            payload: { model: 'DIMM', categoryId, spec: {} }
        })

        expect(response.statusCode).toBe(400)
    })

    it('accepts valid model spec', async () => {
        const create = await app.inject({
            method: 'POST',
            url: '/v1/asset-categories',
            headers: adminHeaders,
            payload: { name: 'RAM' }
        })
        const categoryId = create.json().data.category.id as string

        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/catalogs/models',
            headers: managerHeaders,
            payload: { model: 'DIMM', categoryId, spec: { memorySizeGb: 16 } }
        })

        expect(response.statusCode).toBe(201)
    })
})
