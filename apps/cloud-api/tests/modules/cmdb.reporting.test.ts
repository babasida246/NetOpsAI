/**
 * Tests for CMDB Reporting Routes
 * Replaces placeholder smoke test with real assertions covering
 * report endpoints, export formats, and error handling.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { cmdbRoutes } from '../../src/routes/v1/cmdb/cmdb.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type {
    CiService,
    RelationshipService,
    SchemaService,
    ServiceMappingService,
    CiInventoryReportService,
    RelationshipAnalyticsService,
    AuditTrailService
} from '@application/core'

describe('CMDB Report Routes', () => {
    let app: ReturnType<typeof Fastify>
    const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }

    // Mock report data
    const mockCiInventoryReport = {
        generatedAt: new Date().toISOString(),
        totalCis: 10,
        byType: [{ typeCode: 'SERVER', typeName: 'Server', count: 5 }],
        byStatus: [{ status: 'active', count: 8 }, { status: 'retired', count: 2 }],
        byEnvironment: [{ environment: 'prod', count: 6 }]
    }

    const mockRelAnalyticsReport = {
        generatedAt: new Date().toISOString(),
        totalRelationships: 15,
        byType: [{ typeCode: 'DEPENDS_ON', typeName: 'Depends On', count: 10 }],
        orphanedCis: 2,
        avgRelationshipsPerCi: 3
    }

    const mockAuditTrailReport = {
        generatedAt: new Date().toISOString(),
        totalEvents: 50,
        events: [{ ciId: 'ci-1', action: 'create', timestamp: new Date().toISOString() }]
    }

    let ciInventoryReportService: CiInventoryReportService
    let relationshipAnalyticsService: RelationshipAnalyticsService
    let auditTrailService: AuditTrailService

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        ciInventoryReportService = {
            generateCiInventoryReport: vi.fn().mockResolvedValue(mockCiInventoryReport)
        } as unknown as CiInventoryReportService

        relationshipAnalyticsService = {
            generateAnalyticsReport: vi.fn().mockResolvedValue(mockRelAnalyticsReport)
        } as unknown as RelationshipAnalyticsService

        auditTrailService = {
            generateAuditTrailReport: vi.fn().mockResolvedValue(mockAuditTrailReport)
        } as unknown as AuditTrailService

        // Minimal mocks for other required services
        const schemaService = {
            listTypes: vi.fn().mockResolvedValue([]),
            createType: vi.fn(),
            listTypeVersions: vi.fn().mockResolvedValue([]),
            createDraftVersion: vi.fn(),
            publishVersion: vi.fn(),
            listDefsByVersion: vi.fn().mockResolvedValue([]),
            addAttrDef: vi.fn(),
            updateAttrDef: vi.fn(),
            deleteAttrDef: vi.fn()
        } as unknown as SchemaService

        const ciService = {
            listCis: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
            createCi: vi.fn(),
            getCiDetail: vi.fn(),
            updateCi: vi.fn(),
            resolveCiByAsset: vi.fn()
        } as unknown as CiService

        const relationshipService = {
            getGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
            createRelationship: vi.fn(),
            retireRelationship: vi.fn(),
            listRelationshipTypes: vi.fn().mockResolvedValue([]),
            createRelationshipType: vi.fn()
        } as unknown as RelationshipService

        const serviceMappingService = {
            listServices: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
            createService: vi.fn(),
            getServiceDetail: vi.fn(),
            updateService: vi.fn(),
            addMember: vi.fn(),
            removeMember: vi.fn(),
            serviceImpact: vi.fn()
        } as unknown as ServiceMappingService

        await app.register(cmdbRoutes, {
            prefix: '/v1',
            schemaService,
            ciService,
            relationshipService,
            serviceMappingService,
            ciInventoryReportService,
            relationshipAnalyticsService,
            auditTrailService
        })
    })

    afterEach(async () => {
        await app.close()
    })

    // ── CI Inventory Report ──────────────────────────────────────────

    it('GET /cmdb/reports/ci-inventory returns report data', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/ci-inventory',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.data).toBeDefined()
        expect(body.data.totalCis).toBe(10)
        expect(body.data.byType).toHaveLength(1)
        expect(body.data.byStatus).toHaveLength(2)
        expect(ciInventoryReportService.generateCiInventoryReport).toHaveBeenCalledOnce()
    })

    // ── Relationship Analytics Report ────────────────────────────────

    it('GET /cmdb/reports/relationship-analytics returns report data', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/relationship-analytics',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.data).toBeDefined()
        expect(body.data.totalRelationships).toBe(15)
        expect(body.data.orphanedCis).toBe(2)
        expect(relationshipAnalyticsService.generateAnalyticsReport).toHaveBeenCalledOnce()
    })

    // ── Audit Trail Report ─────────────────────────────────────────

    it('GET /cmdb/reports/audit-trail returns report data', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/audit-trail',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.data).toBeDefined()
        expect(body.data.totalEvents).toBe(50)
        expect(body.data.events).toHaveLength(1)
        expect(auditTrailService.generateAuditTrailReport).toHaveBeenCalledOnce()
    })

    it('GET /cmdb/reports/audit-trail passes query params', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/audit-trail?ciId=ci-1&startDate=2024-01-01&endDate=2024-12-31',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        expect(auditTrailService.generateAuditTrailReport).toHaveBeenCalledWith(
            'ci-1',
            expect.any(Date),
            expect.any(Date)
        )
    })

    // ── Export Endpoint ─────────────────────────────────────────────

    it('GET /cmdb/reports/export/ci-inventory?format=json returns JSON', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/export/ci-inventory?format=json',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toContain('application/json')
    })

    it('GET /cmdb/reports/export/ci-inventory?format=csv returns CSV', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/export/ci-inventory?format=csv',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toContain('text/csv')
        expect(res.headers['content-disposition']).toContain('attachment')
    })

    it('rejects unsupported report type in export', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/export/nonexistent',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(400)
        expect(res.json().error).toBe('Unsupported report type')
    })

    it('rejects invalid export format', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/export/ci-inventory?format=xml',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(400)
        expect(res.json().error).toBe('Invalid export format')
    })

    // ── Error handling ──────────────────────────────────────────────

    it('returns 500 when report service throws', async () => {
        vi.mocked(ciInventoryReportService.generateCiInventoryReport).mockRejectedValueOnce(
            new Error('DB connection lost')
        )
        const res = await app.inject({
            method: 'GET',
            url: '/v1/cmdb/reports/ci-inventory',
            headers: viewerHeaders
        })
        expect(res.statusCode).toBe(500)
        expect(res.json().error).toBe('DB connection lost')
    })
})
