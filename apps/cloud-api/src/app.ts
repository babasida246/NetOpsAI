/**
 * Fastify Application Setup
 */
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import type { PgClient } from '@infra/postgres'

import { env } from './config/env.js'
import { initI18n } from './config/i18n.js'
import { errorHandler, requestIdHook } from './shared/middleware/index.js'

// Modules
import { HealthService, healthRoutes, HealthController } from './modules/health/index.js'
import { UserRepository, SessionRepository, AuthService, authRoutes, AuthController } from './modules/auth/index.js'
import { ChatService, chatRoutes } from './modules/chat/index.js'
import { IntegratedChatService } from './modules/chat/integrated-chat.service.js'
import { integratedChatRoutes } from './modules/chat/integrated-chat.routes.js'
import { ConversationRepository, conversationRoutes } from './modules/conversations/index.js'
import { AdminRepository, adminRoutes } from './modules/admin/index.js'
import { netopsRoutes } from './modules/netops/index.js'
import { toolsRoutes } from './modules/tools/tools.routes.js'
import { registerAssetModule } from './routes/v1/assets/assets.module.js'
// import { registerQltsModule } from './routes/v1/qlts.module.js'  // Commented out missing module
import { registerMessagingHubModule } from './modules/messaging-hub/messaging-hub.module.js'
import { LicenseService, licenseRoutes } from './modules/licenses/index.js'
import { EntitlementRepository, EntitlementService, entitlementRoutes } from './modules/entitlements/index.js'
import { AccessoryService, accessoryRoutes } from './modules/accessories/index.js'
import { ConsumableService, consumableRoutes } from './modules/consumables/index.js'
import { ComponentService, componentRoutes } from './modules/components/index.js'
import { CheckoutService, checkoutRoutes } from './modules/checkout/index.js'
import { RequestsRepository, RequestsService, requestsRoutes } from './modules/requests/index.js'
import { AuditRepository, AuditService, auditRoutes } from './modules/audit/index.js'
import { LabelsRepository, LabelsService, labelsRoutes } from './modules/labels/index.js'
import { DepreciationRepository, DepreciationService, depreciationRoutes } from './modules/depreciation/index.js'
import { ReportsRepository, ReportsService, reportsRoutes, createReportsRepository, createReportsService } from './modules/reports/index.js'
import { registerTopologyModule } from './routes/v1/topology/topology.module.js'
import { EdgeRepository, EdgeService, edgeRoutes } from './modules/edge/index.js'

export interface AppDependencies {
    db: Pool
    redis: Redis
    pgClient: PgClient
}

export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: {
            level: env.LOG_LEVEL,
            transport: env.NODE_ENV === 'development'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined
        },
        requestIdHeader: 'x-request-id',
        genReqId: () => crypto.randomUUID(),
        disableRequestLogging: false
    })

    // ==================== Plugins ====================

    // CORS
    await fastify.register(cors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })

    // Security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: false
    })

    // Rate limiting (optional)
    if (env.ENABLE_RATE_LIMIT === 'true') {
        await fastify.register(rateLimit, {
            max: env.RATE_LIMIT_MAX,
            timeWindow: env.RATE_LIMIT_WINDOW_MS
        })
        fastify.log.info(`Rate limiting enabled: ${env.RATE_LIMIT_MAX} requests per ${env.RATE_LIMIT_WINDOW_MS}ms`)
    } else {
        fastify.log.info('Rate limiting disabled')
    }

    // Multipart uploads
    await fastify.register(multipart)

    // Initialize i18n
    await initI18n()
    fastify.log.info('i18n initialized with languages: en, vi')

    // Middleware to detect language from header
    fastify.addHook('onRequest', async (request, reply) => {
        const lang = request.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en'
        request.language = ['en', 'vi'].includes(lang) ? lang : 'en'
    })

    // Swagger/OpenAPI
    await fastify.register(swagger, {
        refResolver: {
            buildLocalReference(json, _baseUri, _fragment, i) {
                // Avoid duplicate $id collisions when using zod/json-schema converters
                return `def-${i}`
            }
        },
        openapi: {
            info: {
                title: 'Gateway API',
                description: 'Clean, standardized REST API for LLM Gateway',
                version: '2.0.0'
            },
            servers: [
                { url: `http://localhost:${env.PORT}`, description: 'Development' }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            tags: [
                { name: 'Health', description: 'Health check endpoints' },
                { name: 'Authentication', description: 'User authentication' },
                { name: 'Chat', description: 'Chat completion endpoints' },
                { name: 'Conversations', description: 'Conversation management' },
                { name: 'Models', description: 'Model registry and capabilities' },
                { name: 'Providers', description: 'AI providers and credentials' },
                { name: 'Orchestration', description: 'Routing and orchestration rules' },
                { name: 'Chat Stats', description: 'Usage and performance statistics' },
                { name: 'Admin - Users', description: 'User management (admin only)' },
                { name: 'Admin - System', description: 'System administration' },
                { name: 'Admin - Audit', description: 'Audit logs' },
                { name: 'NetOps', description: 'Network operations and device management' },
                { name: 'Assets', description: 'IT asset management' },
                { name: 'Maintenance', description: 'Asset maintenance tickets' },
                { name: 'Accessories', description: 'IT accessories management' },
                { name: 'Accessory Categories', description: 'Accessory categories' },
                { name: 'Accessory Manufacturers', description: 'Accessory manufacturers' },
                { name: 'Consumables', description: 'IT consumables management' },
                { name: 'Consumable Categories', description: 'Consumable categories' },
                { name: 'Consumable Manufacturers', description: 'Consumable manufacturers' },
                { name: 'Components', description: 'IT components management (RAM, SSD, CPU, etc.)' },
                { name: 'Component Categories', description: 'Component categories' },
                { name: 'Component Manufacturers', description: 'Component manufacturers' },
                { name: 'Checkouts', description: 'Asset checkout/checkin management' },
                { name: 'Requests', description: 'Asset request and approval workflow' },
                { name: 'Approval Templates', description: 'Approval chain templates' },
                { name: 'Audits', description: 'Asset audit/inventory check management' },
                { name: 'Audit Items', description: 'Audit item tracking' },
                { name: 'Audit Discrepancies', description: 'Audit discrepancy management' },
                { name: 'Audit Unregistered Assets', description: 'Unregistered assets found during audit' },
                { name: 'Audit Auditors', description: 'Auditor assignment management' },
                { name: 'Label Templates', description: 'Label template management' },
                { name: 'Print Jobs', description: 'Print job management' },
                { name: 'Labels', description: 'Label generation and preview' },
                { name: 'Label Settings', description: 'Label system settings' },
                { name: 'Depreciation', description: 'Asset depreciation management' }
            ]
        },
    })

    // Swagger UI
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
            persistAuthorization: true
        },
        staticCSP: true
    })

    // ==================== Shared Schemas ====================

    // Error response schema (referenced by routes)
    fastify.addSchema({
        $id: 'http://localhost/schemas/error-response',
        type: 'object',
        properties: {
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'object' }
                },
                required: ['code', 'message']
            },
            requestId: { type: 'string' }
        },
        required: ['error']
    })

    // ==================== Hooks ====================

    // Request ID hook
    fastify.addHook('onRequest', requestIdHook)

    // Error handler
    fastify.setErrorHandler(errorHandler)

    // ==================== Services & Routes ====================

    // Health
    const healthService = new HealthService(deps.db, deps.redis)
    const healthController = new HealthController(healthService)
    await healthRoutes(fastify, healthController)

    // Auth
    const userRepo = new UserRepository(deps.db)
    const sessionRepo = new SessionRepository(deps.redis)
    const authService = new AuthService(userRepo, sessionRepo, {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
    })
    const authController = new AuthController(authService)
    fastify.decorate('authenticate', async function (request: any, reply: any) {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                error: { code: 'AUTHENTICATION_ERROR', message: 'Missing or invalid authorization header' },
                meta: { timestamp: new Date().toISOString(), requestId: request.id }
            })
        }

        const token = authHeader.substring(7)
        try {
            const payload = authService.verifyAccessToken(token)
            request.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                tenantId: payload.tenantId ?? null,
                permissions: []
            }
        } catch (error) {
            return reply.status(401).send({
                success: false,
                error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid or expired token' },
                meta: { timestamp: new Date().toISOString(), requestId: request.id }
            })
        }
    })
    await authRoutes(fastify, authController)

    // Chat
    // Register legacy `chatRoutes` under `/legacy` to avoid duplicate
    // route registrations with `integratedChatRoutes`.
    const chatService = new ChatService()
    await fastify.register(async (legacyApp) => {
        await chatRoutes(legacyApp, chatService, authService)
    }, { prefix: '/legacy' })

    // Integrated Chat (with tracking and management)
    const integratedChatService = new IntegratedChatService(deps.db, deps.redis)
    await integratedChatRoutes(fastify, integratedChatService, authService)

    // Conversations
    const conversationRepo = new ConversationRepository(deps.db)
    await conversationRoutes(fastify, conversationRepo, authService)

    // Messaging Hub (ChatOps)
    await fastify.register(async (hubApp) => {
        await registerMessagingHubModule(hubApp, { db: deps.db, redis: deps.redis })
    }, { prefix: '/api/v1' })

    // Admin
    const adminRepo = new AdminRepository(deps.db)
    await adminRoutes(fastify, adminRepo, authService)

    const entitlementRepository = new EntitlementRepository(deps.db)
    const entitlementService = new EntitlementService(entitlementRepository)

    // NetOps
    await fastify.register(async (netopsApp) => {
        await netopsRoutes(netopsApp, deps.db, authService, entitlementService)
    }, { prefix: '/netops' })

    // Tools
    await fastify.register(async (toolsApp) => {
        await toolsRoutes(toolsApp, authService, deps.db, entitlementService)
    })

    // Assets
    fastify.log.info('[DEBUG] About to register Asset module...')
    try {
        await registerAssetModule(fastify, { pgClient: deps.pgClient })
        fastify.log.info('[DEBUG] Asset module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Asset module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // QLTS (Simplified Asset Management) - Module temporarily disabled
    // fastify.log.info('[DEBUG] About to register QLTS module...')
    // try {
    //     await registerQltsModule(fastify, { pgClient: deps.pgClient })
    //     fastify.log.info('[DEBUG] QLTS module registered successfully')
    // } catch (error) {
    //     fastify.log.error('[ERROR] Failed to register QLTS module:', { error: error instanceof Error ? error.message : String(error) })
    //     throw error
    // }

    // Licenses
    fastify.log.info('[DEBUG] About to register Licenses module...')
    try {
        const licenseService = new LicenseService(deps.db)
        await licenseRoutes(fastify, licenseService, authService, entitlementService)
        fastify.log.info('[DEBUG] Licenses module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Licenses module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Entitlements (Feature Licensing)
    fastify.log.info('[DEBUG] About to register Entitlements module...')
    try {
        await entitlementRoutes(fastify, entitlementService)
        fastify.log.info('[DEBUG] Entitlements module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Entitlements module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Edge Connector
    fastify.log.info('[DEBUG] About to register Edge module...')
    try {
        const edgeRepository = new EdgeRepository(deps.db)
        const edgeService = new EdgeService(edgeRepository)
        await edgeRoutes(fastify, edgeService)
        fastify.log.info('[DEBUG] Edge module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Edge module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Accessories
    fastify.log.info('[DEBUG] About to register Accessories module...')
    try {
        const accessoryService = new AccessoryService(deps.db)
        await accessoryRoutes(fastify, accessoryService, authService)
        fastify.log.info('[DEBUG] Accessories module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Accessories module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Consumables
    fastify.log.info('[DEBUG] About to register Consumables module...')
    try {
        const consumableService = new ConsumableService(deps.db)
        await consumableRoutes(fastify, consumableService, authService)
        fastify.log.info('[DEBUG] Consumables module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Consumables module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Components
    fastify.log.info('[DEBUG] About to register Components module...')
    try {
        const componentService = new ComponentService(deps.db)
        await componentRoutes(fastify, componentService, authService)
        fastify.log.info('[DEBUG] Components module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Components module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Checkouts
    fastify.log.info('[DEBUG] About to register Checkouts module...')
    try {
        const checkoutService = new CheckoutService(deps.db)
        await checkoutRoutes(fastify, checkoutService, authService)
        fastify.log.info('[DEBUG] Checkouts module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Checkouts module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Requests
    fastify.log.info('[DEBUG] About to register Requests module...')
    try {
        const requestsRepository = new RequestsRepository(deps.db)
        const requestsService = new RequestsService(requestsRepository)
        await fastify.register(async (requestsApp) => {
            await requestsRoutes(requestsApp, { requestsService })
        }, { prefix: '/api/v1' })
        fastify.log.info('[DEBUG] Requests module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Requests module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Audits
    fastify.log.info('[DEBUG] About to register Audits module...')
    try {
        const auditRepository = new AuditRepository(deps.db)
        const auditService = new AuditService(auditRepository)
        await fastify.register(async (auditApp) => {
            await auditRoutes(auditApp, { auditService })
        }, { prefix: '/api/v1' })
        fastify.log.info('[DEBUG] Audits module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Audits module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Labels
    fastify.log.info('[DEBUG] About to register Labels module...')
    try {
        const labelsRepository = new LabelsRepository(deps.db)
        const labelsService = new LabelsService(labelsRepository)
        await fastify.register(async (labelsApp) => {
            await labelsRoutes(labelsApp, { labelsService })
        }, { prefix: '/api/v1' })
        fastify.log.info('[DEBUG] Labels module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Labels module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Depreciation
    fastify.log.info('[DEBUG] About to register Depreciation module...')
    try {
        const depreciationRepository = new DepreciationRepository(deps.db)
        const depreciationService = new DepreciationService(depreciationRepository)
        await fastify.register(async (depreciationApp) => {
            await depreciationRoutes(depreciationApp, { depreciationService })
        }, { prefix: '/api/v1' })
        fastify.log.info('[DEBUG] Depreciation module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Depreciation module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Reports & Alerts
    fastify.log.info('[DEBUG] About to register Reports module...')
    try {
        const reportsRepository = createReportsRepository(deps.db)
        const reportsService = createReportsService(reportsRepository, deps.db)
        await fastify.register(async (reportsApp) => {
            await reportsRoutes(reportsApp, { service: reportsService })
        }, { prefix: '/api/v1' })
        fastify.log.info('[DEBUG] Reports module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Reports module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // Topology Discovery
    fastify.log.info('[DEBUG] About to register Topology module...')
    try {
        await registerTopologyModule(fastify, { pgClient: deps.pgClient, db: deps.db, entitlementService })
        fastify.log.info('[DEBUG] Topology module registered successfully')
    } catch (error) {
        fastify.log.error(`[ERROR] Failed to register Topology module: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }

    // ==================== Docs Routes ====================

    fastify.get('/openapi.json', {
        schema: { hide: true }
    }, async () => fastify.swagger())

    // ==================== Root Route ====================

    fastify.get('/', {
        schema: {
            hide: true
        }
    }, async () => ({
        name: 'Gateway API',
        version: '2.0.0',
        docs: '/docs'
    }))

    return fastify
}
