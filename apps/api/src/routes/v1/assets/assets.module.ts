import type { FastifyInstance } from 'fastify'
import type { PgClient } from '@infra/postgres'
import {
    AssetEventRepo,
    AssetRepo,
    AssignmentRepo,
    AttachmentRepo,
    ApprovalRepo,
    AssetIncreaseRepo,
    CatalogRepo,
    CategorySpecRepo,
    CategorySpecVersionRepo,
    CiAttrValueRepo,
    CiRepo,
    CiSchemaRepo,
    CiTypeRepo,
    CiTypeVersionRepo,
    CmdbServiceRepo,
    InventoryRepo,
    MaintenanceRepo,
    MovementRepo,
    OpsEventRepo,
    PurchasePlanRepo,
    SparePartRepo,
    StockDocumentRepo,
    RelationshipRepo,
    RelationshipTypeRepo,
    ReminderRepo,
    StockRepo,
    StockReportRepo,
    WarehouseRepo,
    WarehouseUnitOfWork,
    WorkflowRepo
} from '@infra/postgres'
import {
    AssetService,
    AttachmentService,
    CatalogService,
    CiService,
    CategorySpecService,
    InventoryService,
    MaintenanceService,
    ReminderService,
    RelationshipService,
    SchemaService,
    ServiceMappingService,
    StockDocumentService,
    StockReportService,
    StockService,
    WarehouseCatalogService,
    WorkflowService,
    CiInventoryReportService,
    RelationshipAnalyticsService,
    AuditTrailService
} from '@application/core'
import { assetsRoutes } from './assets.routes.js'
import { catalogRoutes } from './catalogs.routes.js'
import { assetImportRoutes } from './assets.import.routes.js'
import { attachmentRoutes } from './attachments.routes.js'
import { categorySpecRoutes } from './category-specs.routes.js'
import { maintenanceRoutes } from '../maintenance/maintenance.routes.js'
import { inventoryRoutes } from '../inventory/inventory.routes.js'
import { workflowRoutes } from '../workflow/workflow.routes.js'
import { reminderRoutes } from '../reports/reminders.routes.js'
import { reportsRoutes } from '../reports/reports.routes.js'
import { cmdbRoutes } from '../cmdb/cmdb.routes.js'
import { warehouseRoutes } from '../warehouse/warehouse.routes.js'
import { stockDocumentRoutes } from '../warehouse/stock-documents.routes.js'
import { qltsRoutes } from '../../../modules/qlts/routes/index.js'

export interface AssetModuleDeps {
    pgClient: PgClient
}

export async function registerAssetModule(
    fastify: FastifyInstance,
    deps: AssetModuleDeps
): Promise<void> {
    const assetRepo = new AssetRepo(deps.pgClient)
    const assignmentRepo = new AssignmentRepo(deps.pgClient)
    const maintenanceRepo = new MaintenanceRepo(deps.pgClient)
    const assetEventRepo = new AssetEventRepo(deps.pgClient)
    const catalogRepo = new CatalogRepo(deps.pgClient)
    const categorySpecRepo = new CategorySpecRepo(deps.pgClient)
    const categorySpecVersionRepo = new CategorySpecVersionRepo(deps.pgClient)
    const opsEventRepo = new OpsEventRepo(deps.pgClient)
    const attachmentRepo = new AttachmentRepo(deps.pgClient)
    const inventoryRepo = new InventoryRepo(deps.pgClient)
    const workflowRepo = new WorkflowRepo(deps.pgClient)
    const reminderRepo = new ReminderRepo(deps.pgClient)
    const purchasePlanRepo = new PurchasePlanRepo(deps.pgClient)
    const assetIncreaseRepo = new AssetIncreaseRepo(deps.pgClient)
    const approvalRepo = new ApprovalRepo(deps.pgClient)
    const stockReportRepo = new StockReportRepo(deps.pgClient)
    const warehouseRepo = new WarehouseRepo(deps.pgClient)
    const sparePartRepo = new SparePartRepo(deps.pgClient)
    const stockRepo = new StockRepo(deps.pgClient)
    const movementRepo = new MovementRepo(deps.pgClient)
    const stockDocumentRepo = new StockDocumentRepo(deps.pgClient)
    const warehouseUnitOfWork = new WarehouseUnitOfWork(deps.pgClient)
    const ciTypeRepo = new CiTypeRepo(deps.pgClient)
    const ciTypeVersionRepo = new CiTypeVersionRepo(deps.pgClient)
    const ciSchemaRepo = new CiSchemaRepo(deps.pgClient)
    const ciRepo = new CiRepo(deps.pgClient)
    const ciAttrValueRepo = new CiAttrValueRepo(deps.pgClient)
    const relTypeRepo = new RelationshipTypeRepo(deps.pgClient)
    const relRepo = new RelationshipRepo(deps.pgClient)
    const cmdbServiceRepo = new CmdbServiceRepo(deps.pgClient)

    const assetService = new AssetService(assetRepo, assignmentRepo, assetEventRepo, maintenanceRepo)
    const maintenanceService = new MaintenanceService(assetRepo, assignmentRepo, maintenanceRepo, assetEventRepo)
    const catalogService = new CatalogService(catalogRepo, categorySpecRepo, categorySpecVersionRepo, undefined, opsEventRepo)
    const categorySpecService = new CategorySpecService(catalogRepo, categorySpecRepo, categorySpecVersionRepo, opsEventRepo)
    const attachmentService = new AttachmentService(assetRepo, attachmentRepo, assetEventRepo)
    const inventoryService = new InventoryService(inventoryRepo, assetRepo, assetEventRepo)
    const workflowService = new WorkflowService(workflowRepo, assetService, maintenanceService, assetEventRepo)
    const reminderService = new ReminderService(assetRepo, reminderRepo)
    const stockReportService = new StockReportService(stockReportRepo)
    const warehouseCatalogService = new WarehouseCatalogService(warehouseRepo, sparePartRepo, opsEventRepo)
    const stockService = new StockService(stockRepo)
    const stockDocumentService = new StockDocumentService(
        stockDocumentRepo,
        stockRepo,
        movementRepo,
        warehouseUnitOfWork,
        opsEventRepo
    )
    const schemaService = new SchemaService(ciTypeRepo, ciTypeVersionRepo, ciSchemaRepo, ciRepo, ciAttrValueRepo, opsEventRepo)
    const ciService = new CiService(ciRepo, ciTypeVersionRepo, ciSchemaRepo, ciAttrValueRepo, opsEventRepo)
    const relationshipService = new RelationshipService(relTypeRepo, relRepo, ciRepo, opsEventRepo)
    const serviceMappingService = new ServiceMappingService(cmdbServiceRepo, relationshipService, opsEventRepo)

    // Report services
    // Create a mock relTypeRepo for CiInventoryReportService
    const mockRelTypeRepo = {
        findAll: () => Promise.resolve([]),
        findById: () => Promise.resolve(null),
        create: () => Promise.resolve({
            id: 'mock-id',
            code: 'mock-code',
            name: 'mock-name',
            reverseName: null,
            allowedFromTypeId: null,
            allowedToTypeId: null
        }),
        update: () => Promise.resolve(null),
        delete: () => Promise.resolve(true),
        list: () => Promise.resolve([]),
        getById: () => Promise.resolve(null)
    }
    const ciInventoryReportService = new CiInventoryReportService(ciRepo, relRepo, mockRelTypeRepo)
    const relationshipAnalyticsService = new RelationshipAnalyticsService(relRepo, ciRepo)
    const auditTrailService = new AuditTrailService(opsEventRepo)

    await fastify.register(assetsRoutes, { prefix: '/api/v1', assetService, pgClient: deps.pgClient })
    await fastify.register(maintenanceRoutes, { prefix: '/api/v1', maintenanceService })
    await fastify.register(catalogRoutes, { prefix: '/api/v1', catalogService })
    await fastify.register(categorySpecRoutes, { prefix: '/api/v1', catalogService, categorySpecService })
    await fastify.register(assetImportRoutes, { prefix: '/api/v1', assetService })
    await fastify.register(attachmentRoutes, { prefix: '/api/v1', attachmentService })
    await fastify.register(inventoryRoutes, { prefix: '/api/v1', inventoryService })
    await fastify.register(workflowRoutes, { prefix: '/api/v1', workflowService })
    await fastify.register(reminderRoutes, { prefix: '/api/v1', reminderService })
    await fastify.register(reportsRoutes, { prefix: '/api/v1', stockReportService })
    await fastify.register(warehouseRoutes, { prefix: '/api/v1', catalogService: warehouseCatalogService, stockService })
    await fastify.register(stockDocumentRoutes, { prefix: '/api/v1', stockDocumentService })
    await fastify.register(cmdbRoutes, {
        prefix: '/api/v1',
        schemaService,
        ciService,
        relationshipService,
        serviceMappingService,
        ciInventoryReportService,
        relationshipAnalyticsService,
        auditTrailService
    })

    await fastify.register(async (qltsApp) => {
        qltsApp.decorate('diContainer', {
            resolve<T>(key: string): T {
                const registry: Record<string, unknown> = {
                    pgClient: deps.pgClient,
                    purchasePlanRepo,
                    assetIncreaseRepo,
                    approvalRepo
                }
                return registry[key] as T
            }
        })

        await qltsApp.register(qltsRoutes, { prefix: '/api/v1/assets' })
    })
}
