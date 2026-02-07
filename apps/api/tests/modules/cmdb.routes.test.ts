import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { cmdbRoutes } from '../../src/routes/v1/cmdb/cmdb.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type {
    CiService,
    RelationshipService,
    SchemaService,
    ServiceMappingService
} from '@application/core'

describe('cmdb routes', () => {
    let app: ReturnType<typeof Fastify>
    let schemaService: SchemaService
    let ciService: CiService
    let relationshipService: RelationshipService
    let serviceMappingService: ServiceMappingService
    const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
    const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }
    const catalogHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'catalog_admin' }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        schemaService = {
            listTypes: vi.fn().mockResolvedValue([{ id: 'type-1', code: 'APP', name: 'Application', createdAt: new Date() }]),
            createType: vi.fn().mockResolvedValue({ id: 'type-1', code: 'APP', name: 'Application', createdAt: new Date() }),
            listTypeVersions: vi.fn().mockResolvedValue([]),
            createDraftVersion: vi.fn().mockResolvedValue({ version: { id: 'ver-1', typeId: 'type-1', version: 1, status: 'draft', createdAt: new Date() }, defs: [] }),
            publishVersion: vi.fn().mockResolvedValue({ version: { id: 'ver-1', typeId: 'type-1', version: 1, status: 'active', createdAt: new Date() }, warnings: [] }),
            listDefsByVersion: vi.fn().mockResolvedValue([]),
            addAttrDef: vi.fn().mockResolvedValue({ id: 'def-1', versionId: 'ver-1', key: 'owner', label: 'Owner', fieldType: 'string', required: false, unit: null, enumValues: null, pattern: null, minValue: null, maxValue: null, stepValue: null, minLen: null, maxLen: null, defaultValue: null, isSearchable: false, isFilterable: false, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
            updateAttrDef: vi.fn().mockResolvedValue({ id: 'def-1', versionId: 'ver-1', key: 'owner', label: 'Owner', fieldType: 'string', required: false, unit: null, enumValues: null, pattern: null, minValue: null, maxValue: null, stepValue: null, minLen: null, maxLen: null, defaultValue: null, isSearchable: false, isFilterable: false, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
            deleteAttrDef: vi.fn().mockResolvedValue(undefined)
        } as unknown as SchemaService

        const ciDetail = {
            ci: { id: 'ci-1', typeId: 'type-1', name: 'App', ciCode: 'APP-1', status: 'active', environment: 'prod', createdAt: new Date(), updatedAt: new Date() },
            attributes: [],
            schema: [],
            version: { id: 'ver-1', typeId: 'type-1', version: 1, status: 'active', createdAt: new Date() }
        }

        ciService = {
            listCis: vi.fn().mockResolvedValue({ items: [ciDetail.ci], total: 1, page: 1, limit: 20 }),
            createCi: vi.fn().mockResolvedValue(ciDetail),
            getCiDetail: vi.fn().mockResolvedValue(ciDetail),
            updateCi: vi.fn().mockResolvedValue(ciDetail),
            resolveCiByAsset: vi.fn().mockResolvedValue(null)
        } as unknown as CiService

        relationshipService = {
            getGraph: vi.fn().mockResolvedValue({ nodes: [ciDetail.ci], edges: [] }),
            createRelationship: vi.fn().mockResolvedValue({ id: 'rel-1', relTypeId: 'type-1', fromCiId: 'ci-1', toCiId: 'ci-2', status: 'active', sinceDate: null, note: null, createdAt: new Date() }),
            retireRelationship: vi.fn().mockResolvedValue({ id: 'rel-1', relTypeId: 'type-1', fromCiId: 'ci-1', toCiId: 'ci-2', status: 'retired', sinceDate: null, note: null, createdAt: new Date() }),
            listRelationshipTypes: vi.fn().mockResolvedValue([{ id: 'rel-type-1', code: 'DEPENDS_ON', name: 'Depends On', reverseName: null, allowedFromTypeId: null, allowedToTypeId: null }]),
            createRelationshipType: vi.fn().mockResolvedValue({ id: 'rel-type-1', code: 'DEPENDS_ON', name: 'Depends On', reverseName: null, allowedFromTypeId: null, allowedToTypeId: null })
        } as unknown as RelationshipService

        serviceMappingService = {
            listServices: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
            createService: vi.fn().mockResolvedValue({ id: 'svc-1', code: 'SVC', name: 'Service', criticality: null, owner: null, sla: null, status: null, createdAt: new Date() }),
            getServiceDetail: vi.fn().mockResolvedValue({ service: { id: 'svc-1', code: 'SVC', name: 'Service', criticality: null, owner: null, sla: null, status: null, createdAt: new Date() }, members: [] }),
            updateService: vi.fn().mockResolvedValue({ id: 'svc-1', code: 'SVC', name: 'Service', criticality: null, owner: null, sla: null, status: null, createdAt: new Date() }),
            addMember: vi.fn().mockResolvedValue({ id: 'mem-1', serviceId: 'svc-1', ciId: 'ci-1', role: null, createdAt: new Date() }),
            removeMember: vi.fn().mockResolvedValue(undefined),
            serviceImpact: vi.fn().mockResolvedValue({ nodes: [ciDetail.ci], edges: [] })
        } as unknown as ServiceMappingService

        await app.register(cmdbRoutes, {
            prefix: '/v1',
            schemaService,
            ciService,
            relationshipService,
            serviceMappingService
        })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists cmdb types', async () => {
        const response = await app.inject({ method: 'GET', url: '/v1/cmdb/types', headers: viewerHeaders })
        expect(response.statusCode).toBe(200)
        expect(response.json().data).toHaveLength(1)
    })

    it('blocks type creation without catalog_admin', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/cmdb/types',
            headers: viewerHeaders,
            payload: { code: 'APP', name: 'Application' }
        })
        expect(response.statusCode).toBe(403)
    })

    it('creates CI with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/cmdb/cis',
            headers: managerHeaders,
            payload: { typeId: '123e4567-e89b-12d3-a456-426614174000', name: 'App', ciCode: 'APP-1' }
        })
        expect(response.statusCode).toBe(201)
    })

    it('returns CI detail', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/cis/123e4567-e89b-12d3-a456-426614174000',
            headers: viewerHeaders
        })
        expect(response.statusCode).toBe(200)
    })

    it('creates relationships with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/cmdb/relationships',
            headers: managerHeaders,
            payload: {
                relTypeId: '123e4567-e89b-12d3-a456-426614174001',
                fromCiId: '123e4567-e89b-12d3-a456-426614174002',
                toCiId: '123e4567-e89b-12d3-a456-426614174003'
            }
        })
        expect(response.statusCode).toBe(201)
    })

    it('lists relationship types', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/relationship-types',
            headers: viewerHeaders
        })
        expect(response.statusCode).toBe(200)
        expect(response.json().data).toHaveLength(1)
    })

    it('creates services with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/cmdb/services',
            headers: managerHeaders,
            payload: { code: 'SVC', name: 'Service' }
        })
        expect(response.statusCode).toBe(201)
    })

    it('returns service impact', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/services/123e4567-e89b-12d3-a456-426614174000/impact',
            headers: viewerHeaders
        })
        expect(response.statusCode).toBe(200)
    })

    it('creates types with catalog_admin', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/cmdb/types',
            headers: catalogHeaders,
            payload: { code: 'APP', name: 'Application' }
        })
        expect(response.statusCode).toBe(201)
    })
})
