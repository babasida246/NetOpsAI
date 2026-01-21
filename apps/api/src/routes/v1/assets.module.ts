import type { FastifyInstance } from 'fastify'
import type { PgClient } from '@infra/postgres'
import {
    AssetEventRepo,
    AssetRepo,
    AssignmentRepo,
    AttachmentRepo,
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
    WorkflowService
} from '@application/core'
import { assetsRoutes } from './assets.routes.js'
import { maintenanceRoutes } from './maintenance.routes.js'
import { catalogRoutes } from './catalogs.routes.js'
import { assetImportRoutes } from './assets.import.routes.js'
import { attachmentRoutes } from './attachments.routes.js'
import { inventoryRoutes } from './inventory.routes.js'
import { workflowRoutes } from './workflow.routes.js'
import { reminderRoutes } from './reminders.routes.js'
import { categorySpecRoutes } from './category-specs.routes.js'
import { reportsRoutes } from './reports.routes.js'
import { cmdbRoutes } from './cmdb.routes.js'
import { warehouseRoutes } from './warehouse.routes.js'
import { stockDocumentRoutes } from './stock-documents.routes.js'

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

    await fastify.register(assetsRoutes, { prefix: '/v1', assetService })
    await fastify.register(maintenanceRoutes, { prefix: '/v1', maintenanceService })
    await fastify.register(catalogRoutes, { prefix: '/v1', catalogService })
    await fastify.register(categorySpecRoutes, { prefix: '/v1', catalogService, categorySpecService })
    await fastify.register(assetImportRoutes, { prefix: '/v1', assetService })
    await fastify.register(attachmentRoutes, { prefix: '/v1', attachmentService })
    await fastify.register(inventoryRoutes, { prefix: '/v1', inventoryService })
    await fastify.register(workflowRoutes, { prefix: '/v1', workflowService })
    await fastify.register(reminderRoutes, { prefix: '/v1', reminderService })
    await fastify.register(reportsRoutes, { prefix: '/v1', stockReportService })
    await fastify.register(warehouseRoutes, { prefix: '/v1', catalogService: warehouseCatalogService, stockService })
    await fastify.register(stockDocumentRoutes, { prefix: '/v1', stockDocumentService })
    await fastify.register(cmdbRoutes, {
        prefix: '/v1',
        schemaService,
        ciService,
        relationshipService,
        serviceMappingService
    })
}
