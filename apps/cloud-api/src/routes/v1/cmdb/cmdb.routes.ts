import type { FastifyInstance } from 'fastify'
import type {
    CiService,
    RelationshipService,
    SchemaService,
    ServiceMappingService,
    CiInventoryReportService,
    RelationshipAnalyticsService,
    AuditTrailService
} from '@application/core'
import {
    exportCiInventoryReportToCSV,
    exportRelationshipAnalyticsToCSV,
    exportAuditTrailToCSV,
    exportCiInventoryReportToPDF,
    exportRelationshipAnalyticsToPDF,
    exportAuditTrailToPDF
} from '@application/core'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'
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
    cmdbRelationshipTypeIdParamsSchema,
    cmdbRelationshipTypeUpdateSchema,
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
    ciInventoryReportService: CiInventoryReportService
    relationshipAnalyticsService: RelationshipAnalyticsService
    auditTrailService: AuditTrailService
}

export async function cmdbRoutes(
    fastify: FastifyInstance,
    opts: CmdbRoutesOptions
): Promise<void> {
    const { schemaService, ciService, relationshipService, serviceMappingService, ciInventoryReportService, relationshipAnalyticsService, auditTrailService } = opts

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

    // Get full CMDB topology graph
    fastify.get('/cmdb/graph', async (request, reply) => {
        getUserContext(request)
        const query = cmdbGraphQuerySchema.parse(request.query)
        const graph = await relationshipService.getFullGraph(query.depth ?? 2, query.direction ?? 'both')
        return reply.send({ data: graph })
    })

    // Get dependency path for a CI (upstream or downstream)
    fastify.get('/cmdb/cis/:id/dependency-path', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const direction = (request.query as any).direction ?? 'downstream'
        const path = await relationshipService.getDependencyPath(id, direction)
        return reply.send({ data: path })
    })

    // Get impact analysis - what breaks if this CI fails
    fastify.get('/cmdb/cis/:id/impact', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const impact = await relationshipService.getImpactAnalysis(id)
        return reply.send({ data: impact })
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

    fastify.put('/cmdb/relationship-types/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbRelationshipTypeIdParamsSchema.parse(request.params)
        const body = cmdbRelationshipTypeUpdateSchema.parse(request.body)
        const updated = await relationshipService.updateRelationshipType(id, body, ctx)
        return reply.send({ data: updated })
    })

    fastify.delete('/cmdb/relationship-types/:id', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbRelationshipTypeIdParamsSchema.parse(request.params)
        await relationshipService.deleteRelationshipType(id, ctx)
        return reply.status(204).send()
    })

    fastify.get('/cmdb/cis/:id/relationships', async (request, reply) => {
        getUserContext(request)
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        // TODO: Implement listCiRelationships method - using listRelationshipTypes for now
        const relationships = await relationshipService.listRelationshipTypes()
        return reply.send({ data: relationships })
    })

    fastify.post('/cmdb/cis/:id/relationships', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const { id } = cmdbCiIdParamsSchema.parse(request.params)
        const body = cmdbRelationshipCreateSchema.parse(request.body)
        const created = await relationshipService.createRelationship({ ...body, fromCiId: id }, ctx)
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

    // Reports endpoints
    fastify.get('/cmdb/reports/ci-inventory', async (request, reply) => {
        getUserContext(request)
        try {
            const report = await ciInventoryReportService.generateCiInventoryReport()
            return reply.send({ data: report })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            return reply.status(500).send({ error: message })
        }
    })

    fastify.get('/cmdb/reports/relationship-analytics', async (request, reply) => {
        getUserContext(request)
        try {
            const report = await relationshipAnalyticsService.generateAnalyticsReport()
            return reply.send({ data: report })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            return reply.status(500).send({ error: message })
        }
    })

    fastify.get('/cmdb/reports/audit-trail', async (request, reply) => {
        getUserContext(request)
        try {
            const query = (request.query as any) || {}
            const ciId = query.ciId as string | undefined
            const startDate = query.startDate ? new Date(query.startDate) : undefined
            const endDate = query.endDate ? new Date(query.endDate) : undefined

            const report = await auditTrailService.generateAuditTrailReport(ciId, startDate, endDate)
            return reply.send({ data: report })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            return reply.status(500).send({ error: message })
        }
    })

    fastify.get('/cmdb/reports/export/:reportType', async (request, reply) => {
        getUserContext(request)
        try {
            const { reportType } = request.params as { reportType: string }
            const format = (request.query as any)?.format ?? 'json' // json, csv, pdf

            // Supported report types
            const supportedReports = ['ci-inventory', 'relationship-analytics', 'audit-trail']
            if (!supportedReports.includes(reportType)) {
                return reply.status(400).send({ error: 'Unsupported report type' })
            }

            // Generate report based on type
            let reportData: any
            switch (reportType) {
                case 'ci-inventory':
                    reportData = await ciInventoryReportService.generateCiInventoryReport()
                    break
                case 'relationship-analytics':
                    reportData = await relationshipAnalyticsService.generateAnalyticsReport()
                    break
                case 'audit-trail':
                    reportData = await auditTrailService.generateAuditTrailReport()
                    break
            }

            // Export based on format
            switch (format) {
                case 'json':
                    return reply.type('application/json').send(reportData)
                case 'csv': {
                    let csvContent: string
                    switch (reportType) {
                        case 'ci-inventory':
                            csvContent = exportCiInventoryReportToCSV(reportData)
                            break
                        case 'relationship-analytics':
                            csvContent = exportRelationshipAnalyticsToCSV(reportData)
                            break
                        case 'audit-trail':
                            csvContent = exportAuditTrailToCSV(reportData)
                            break
                        default:
                            csvContent = ''
                    }
                    return reply
                        .type('text/csv')
                        .header('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.csv"`)
                        .send(csvContent)
                }
                case 'pdf': {
                    let pdfContent: Buffer
                    switch (reportType) {
                        case 'ci-inventory':
                            pdfContent = await exportCiInventoryReportToPDF(reportData)
                            break
                        case 'relationship-analytics':
                            pdfContent = await exportRelationshipAnalyticsToPDF(reportData)
                            break
                        case 'audit-trail':
                            pdfContent = await exportAuditTrailToPDF(reportData)
                            break
                        default:
                            pdfContent = Buffer.from('')
                    }
                    return reply
                        .type('application/pdf')
                        .header('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.pdf"`)
                        .send(pdfContent)
                }
                default:
                    return reply.status(400).send({ error: 'Invalid export format' })
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            return reply.status(500).send({ error: message })
        }
    })
}
