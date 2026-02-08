import type { FastifyInstance } from 'fastify'
import type { CatalogService } from '@application/core'
import { AppError } from '@domain/core'
import { getUserContext, requireRole } from './assets.helpers.js'
import {
    catalogIdParamsSchema,
    categoryCreateSchema,
    categoryUpdateSchema,
    locationCreateSchema,
    locationUpdateSchema,
    modelCreateSchema,
    modelSearchQuerySchema,
    modelUpdateSchema,
    vendorCreateSchema,
    vendorUpdateSchema
} from './catalogs.schemas.js'

interface CatalogRoutesOptions {
    catalogService: CatalogService
}

export async function catalogRoutes(
    fastify: FastifyInstance,
    opts: CatalogRoutesOptions
): Promise<void> {
    const catalogService = opts.catalogService

    fastify.get('/assets/catalogs', async (request, reply) => {
        getUserContext(request)
        const catalogs = await catalogService.listCatalogs()
        return reply.send({ data: catalogs })
    })

    fastify.get('/assets/catalogs/categories', async (request, reply) => {
        getUserContext(request)
        const categories = await catalogService.listCategories()
        return reply.send({ data: categories })
    })

    fastify.post('/assets/catalogs/categories', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const body = categoryCreateSchema.parse(request.body)
        const result = await catalogService.createCategory(body, ctx)
        return reply.status(201).send({ data: result.category })
    })

    fastify.put('/assets/catalogs/categories/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        const body = categoryUpdateSchema.parse(request.body)
        const updated = await catalogService.updateCategory(id, body)
        return reply.send({ data: updated })
    })

    fastify.delete('/assets/catalogs/categories/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        await catalogService.deleteCategory(id)
        return reply.send({ data: { id } })
    })

    fastify.get('/assets/catalogs/vendors', async (request, reply) => {
        getUserContext(request)
        const vendors = await catalogService.listVendors()
        return reply.send({ data: vendors })
    })

    fastify.post('/assets/catalogs/vendors', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const body = vendorCreateSchema.parse(request.body)
        const created = await catalogService.createVendor(body)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/assets/catalogs/vendors/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        const body = vendorUpdateSchema.parse(request.body)
        const updated = await catalogService.updateVendor(id, body)
        return reply.send({ data: updated })
    })

    fastify.delete('/assets/catalogs/vendors/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        await catalogService.deleteVendor(id)
        return reply.send({ data: { id } })
    })

    fastify.post('/assets/catalogs/models', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const body = modelCreateSchema.parse(request.body)
        const created = await catalogService.createModel(body)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/assets/catalogs/models/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        const body = modelUpdateSchema.parse(request.body)
        const updated = await catalogService.updateModel(id, body)
        return reply.send({ data: updated })
    })

    fastify.delete('/assets/catalogs/models/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        await catalogService.deleteModel(id)
        return reply.send({ data: { id } })
    })

    fastify.get('/assets/catalogs/locations', async (request, reply) => {
        getUserContext(request)
        const locations = await catalogService.listLocations()
        return reply.send({ data: locations })
    })

    fastify.get('/asset-models', async (request, reply) => {
        getUserContext(request)
        const query = modelSearchQuerySchema.parse(request.query)
        let specFilters: Record<string, unknown> | undefined
        if (query.specFilters) {
            try {
                const parsed = JSON.parse(query.specFilters) as Record<string, unknown>
                specFilters = parsed && typeof parsed === 'object' ? parsed : undefined
            } catch {
                throw AppError.badRequest('Invalid specFilters JSON')
            }
        }
        const models = await catalogService.searchModels({
            categoryId: query.categoryId,
            specFilters
        })
        return reply.send({ data: models })
    })

    fastify.post('/assets/catalogs/locations', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const body = locationCreateSchema.parse(request.body)
        const created = await catalogService.createLocation(body)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/assets/catalogs/locations/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        const body = locationUpdateSchema.parse(request.body)
        const updated = await catalogService.updateLocation(id, body)
        return reply.send({ data: updated })
    })

    fastify.delete('/assets/catalogs/locations/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const { id } = catalogIdParamsSchema.parse(request.params)
        await catalogService.deleteLocation(id)
        return reply.send({ data: { id } })
    })
}
