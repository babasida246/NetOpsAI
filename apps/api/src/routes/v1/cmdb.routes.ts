import type { FastifyInstance } from 'fastify'
import type {
    CiService,
    RelationshipService,
    SchemaService,
    ServiceMappingService
} from '@application/core'
import { getUserContext, requireRole } from './assets.helpers.js'
import {
    cmdbAttrDefCreateSchema,
    cmdbAttrDefIdParamsSchema,
    cmdbAttrDefUpdateSchema,
    cmdbCiCreateSchema,
    cmdbCiIdParamsSchema,
    cmdbCiListQuerySchema,
    cmdbCiUpdateSchema,
    cmdbGraphQuerySchema,
    cmdbRelationshipCreateSchema,
    cmdbRelationshipIdParamsSchema,
    cmdbRelationshipTypeCreateSchema,
    cmdbServiceCreateSchema,
    cmdbServiceIdParamsSchema,
    cmdbServiceListQuerySchema,
    cmdbServiceMemberCreateSchema,
    cmdbServiceMemberIdParamsSchema,
    cmdbServiceUpdateSchema,
    cmdbTypeCreateSchema,
    cmdbTypeIdParamsSchema,
    cmdbVersionIdParamsSchema
} from './cmdb.schemas.js'

interface CmdbRoutesOptions {
    schemaService: SchemaService
    ciService: CiService
    relationshipService: RelationshipService
    serviceMappingService: ServiceMappingService
}

export async function cmdbRoutes(
    fastify: FastifyInstance,
    opts: CmdbRoutesOptions
): Promise<void> {
    const { schemaService, ciService, relationshipService, serviceMappingService } = opts

    fastify.get('/cmdb/types', async (request, reply) => {
        getUserContext(request)
        const types = await schemaService.listTypes()
        return reply.send({ data: types })
    })

    fastify.post('/cmdb/types', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const body = cmdbTypeCreateSchema.parse(request.body)
        const created = await schemaService.createType(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.get('/cmdb/types/:id/versions', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbTypeIdParamsSchema.parse(request.params)
        const versions = await schemaService.listTypeVersions(id)
        return reply.send({ data: versions })
    })

    fastify.post('/cmdb/types/:id/versions', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const { id } = cmdbTypeIdParamsSchema.parse(request.params)
        const result = await schemaService.createDraftVersion(id, ctx)
        return reply.status(201).send({ data: result })
    })

    fastify.post('/cmdb/versions/:versionId/publish', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const { versionId } = cmdbVersionIdParamsSchema.parse(request.params)
        const result = await schemaService.publishVersion(versionId, ctx)
        return reply.send({ data: result })
    })

    fastify.get('/cmdb/versions/:versionId/attr-defs', async (request, reply) => {
        getUserContext(request)
        const { versionId } = cmdbVersionIdParamsSchema.parse(request.params)
        const defs = await schemaService.listDefsByVersion(versionId)
        return reply.send({ data: defs })
    })

    fastify.post('/cmdb/versions/:versionId/attr-defs', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const { versionId } = cmdbVersionIdParamsSchema.parse(request.params)
        const body = cmdbAttrDefCreateSchema.parse(request.body)
        const created = await schemaService.addAttrDef(versionId, body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.put('/cmdb/attr-defs/:id', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const { id } = cmdbAttrDefIdParamsSchema.parse(request.params)
        const body = cmdbAttrDefUpdateSchema.parse(request.body)
        const updated = await schemaService.updateAttrDef(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.delete('/cmdb/attr-defs/:id', async (request, reply) => {
        const ctx = requireRole(request, ['catalog_admin'])
        const { id } = cmdbAttrDefIdParamsSchema.parse(request.params)
        await schemaService.deleteAttrDef(id, ctx)
        return reply.send({ data: { id } })
    })

    fastify.get('/cmdb/cis', async (request, reply) => {
        getUserContext(request)
        const query = cmdbCiListQuerySchema.parse(request.query)
        const result = await ciService.listCis(query)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })

    fastify.post('/cmdb/cis', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = cmdbCiCreateSchema.parse(request.body)
        const { attributes, ...payload } = body
        const created = await ciService.createCi(payload, attributes, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.get('/cmdb/cis/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const detail = await ciService.getCiDetail(id)
        return reply.send({ data: detail })
    })

    fastify.put('/cmdb/cis/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const body = cmdbCiUpdateSchema.parse(request.body)
        const { attributes, ...patch } = body
        const updated = await ciService.updateCi(id, patch, attributes, ctx)
        return reply.send({ data: updated })
    })

    fastify.get('/cmdb/cis/:id/graph', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const query = cmdbGraphQuerySchema.parse(request.query)
        const graph = await relationshipService.getGraph(id, query.depth ?? 1, query.direction ?? 'both')
        return reply.send({ data: graph })
    })

    fastify.get('/cmdb/relationship-types', async (request, reply) => {
        getUserContext(request)
        const types = await relationshipService.listRelationshipTypes()
        return reply.send({ data: types })
    })

    fastify.post('/cmdb/relationship-types', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = cmdbRelationshipTypeCreateSchema.parse(request.body)
        const created = await relationshipService.createRelationshipType(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.post('/cmdb/relationships', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = cmdbRelationshipCreateSchema.parse(request.body)
        const created = await relationshipService.createRelationship(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.delete('/cmdb/relationships/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbRelationshipIdParamsSchema.parse(request.params)
        const updated = await relationshipService.retireRelationship(id, ctx)
        return reply.send({ data: updated })
    })

    fastify.get('/cmdb/services', async (request, reply) => {
        getUserContext(request)
        const query = cmdbServiceListQuerySchema.parse(request.query)
        const result = await serviceMappingService.listServices(query)
        return reply.send({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } })
    })

    fastify.post('/cmdb/services', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = cmdbServiceCreateSchema.parse(request.body)
        const created = await serviceMappingService.createService(body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.get('/cmdb/services/:id', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbServiceIdParamsSchema.parse(request.params)
        const detail = await serviceMappingService.getServiceDetail(id)
        return reply.send({ data: detail })
    })

    fastify.put('/cmdb/services/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbServiceIdParamsSchema.parse(request.params)
        const body = cmdbServiceUpdateSchema.parse(request.body)
        const updated = await serviceMappingService.updateService(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.post('/cmdb/services/:id/members', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbServiceIdParamsSchema.parse(request.params)
        const body = cmdbServiceMemberCreateSchema.parse(request.body)
        const created = await serviceMappingService.addMember(id, body, ctx)
        return reply.status(201).send({ data: created })
    })

    fastify.delete('/cmdb/services/:id/members/:memberId', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id, memberId } = cmdbServiceMemberIdParamsSchema.parse(request.params)
        await serviceMappingService.removeMember(id, memberId, ctx)
        return reply.send({ data: { memberId } })
    })

    fastify.get('/cmdb/services/:id/impact', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbServiceIdParamsSchema.parse(request.params)
        const query = cmdbGraphQuerySchema.parse(request.query)
        const graph = await serviceMappingService.serviceImpact(id, query.depth ?? 1, query.direction ?? 'downstream')
        return reply.send({ data: graph })
    })
}
