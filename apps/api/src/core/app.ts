/**
 * Core Application Factory
 * 
 * This module creates and configures the Fastify application instance
 * with all plugins, middleware, and modules properly registered.
 */
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import multipart from '@fastify/multipart'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'

import { env } from '../config/env.js'
import { initI18n } from '../config/i18n.js'

// Core middleware and plugins
import { errorHandler } from './middleware/error.handler.js'
import {
    requestIdHook,
    contextHook,
    requestLogHook,
    responseTimeHook
} from './middleware/request.hooks.js'
import { registerSecurity } from './plugins/security.plugin.js'
import { registerDocs } from './plugins/docs.plugin.js'

// Modules
import { authModule } from '../modules/auth/auth.module.js'
import { AuthService } from '../modules/auth/auth.service.js'
import { UserRepository } from '../modules/auth/user.repository.js'
import { SessionRepository } from '../modules/auth/session.repository.js'
import { healthModule } from '../modules/health/health.module.js'
import { conversationsModule } from '../modules/conversations/conversations.module.js'
import { IntegratedChatService } from '../modules/chat/integrated-chat.service.js'
import { integratedChatRoutes } from '../modules/chat/integrated-chat.routes.js'
import { setupModule } from '../modules/setup/setup.module.js'
import { AdminRepository, adminRoutes } from '../modules/admin/index.js'
import { netopsRoutes } from '../modules/netops/index.js'
import { toolsRoutes } from '../modules/tools/tools.routes.js'
import { driversRoutes } from '../modules/drivers/index.js'
import { documentsRoutes } from '../modules/documents/index.js'
// Import full asset module from routes/v1 (includes cmdb, inventory, maintenance, reports)
import { registerAssetModule } from '../routes/v1/assets/assets.module.js'
import { registerQltsModule } from '../routes/v1/qlts/qlts.module.js'
import { createApiError, createErrorResponse } from '../shared/utils/response.utils.js'

export interface AppDependencies {
    db: Pool
    redis: Redis
    pgClient: Pool // Temporarily use Pool instead of PgClient due to import issue
}

export async function createApp(deps: AppDependencies): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: {
            level: env.LOG_LEVEL,
            transport: env.NODE_ENV === 'development'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined
        },
        requestIdHeader: 'x-request-id',
        genReqId: () => randomUUID(),
        disableRequestLogging: false
    })

    // ==================== Core Plugins ====================

    // Security
    await registerSecurity(fastify, {
        cors: {
            origin: true,
            credentials: true
        },
        rateLimit: {
            enabled: env.ENABLE_RATE_LIMIT === 'true',
            max: env.RATE_LIMIT_MAX,
            timeWindow: env.RATE_LIMIT_WINDOW_MS
        },
        helmet: {
            contentSecurityPolicy: false
        }
    })

    // File uploads
    await fastify.register(multipart)

    // Documentation
    await registerDocs(fastify, {
        title: 'Gateway API',
        description: 'Clean, standardized REST API for IT Asset Management',
        version: '2.0.0',
        servers: [
            { url: 'http://localhost:3000', description: 'Development server' },
            { url: 'https://api.gateway.local', description: 'Production server' }
        ]
    })

    // ==================== Internationalization ====================

    await initI18n()
    fastify.log.info('i18n initialized with languages: en, vi')

    // ==================== Hooks & Middleware ====================

    // Request hooks
    fastify.addHook('onRequest', requestIdHook)
    fastify.addHook('onRequest', contextHook)
    fastify.addHook('onRequest', requestLogHook)
    fastify.addHook('preValidation', responseTimeHook)

    // Error handler
    fastify.setErrorHandler(errorHandler)
    fastify.setNotFoundHandler((request, reply) => {
        const requestId = typeof request.id === 'string' ? request.id : randomUUID()
        const apiError = createApiError.notFound('Resource')
        reply.status(404).send(createErrorResponse(apiError, requestId))
    })

    // ==================== API Modules ====================

    // Setup module (public access for first-time setup)
    try {
        console.log('🔧 Registering setup module...')
        // Register with both /api/setup and /api/v1/setup for compatibility
        await fastify.register(setupModule, {
            prefix: '/api/setup',
            pgClient: deps.pgClient
        })
        await fastify.register(setupModule, {
            prefix: '/api/v1/setup',
            pgClient: deps.pgClient
        })
        console.log('✅ Setup module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register setup module:', error)
        throw error
    }

    // Core modules
    await fastify.register(healthModule(deps), { prefix: '/api/v1' })
    await fastify.register(authModule(deps), { prefix: '/api/v1' })

    const sharedAuthService = new AuthService(
        new UserRepository(deps.db),
        new SessionRepository(deps.redis),
        {
            accessSecret: env.JWT_ACCESS_SECRET,
            refreshSecret: env.JWT_REFRESH_SECRET,
            accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
            refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
        }
    )

    try {
        console.log('🔧 Registering conversations module...')
        await fastify.register(conversationsModule(deps), { prefix: '/api/v1' })
        console.log('✅ Conversations module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register conversations module:', error)
        throw error
    }

    try {
        console.log('🔧 Registering integrated chat module...')
        const integratedChatService = new IntegratedChatService(deps.db, deps.redis)
        await fastify.register(async (chatApp) => {
            await integratedChatRoutes(chatApp, integratedChatService, sharedAuthService)
        }, { prefix: '/api/v1' })
        console.log('✅ Integrated chat module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register integrated chat module:', error)
        throw error
    }

    try {
        console.log('🔧 Registering admin module...')
        const adminRepo = new AdminRepository(deps.db)
        await fastify.register(async (adminApp) => {
            await adminRoutes(adminApp, adminRepo, sharedAuthService)
        }, { prefix: '/api/v1' })
        console.log('✅ Admin module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register admin module:', error)
        throw error
    }

    try {
        console.log('🔧 Registering drivers & documents modules...')
        await fastify.register(async (knowledgeApp) => {
            await driversRoutes(knowledgeApp, { db: deps.db, authService: sharedAuthService })
            await documentsRoutes(knowledgeApp, { db: deps.db, authService: sharedAuthService })
        }, { prefix: '/api/v1' })
        console.log('✅ Drivers & documents modules registered successfully')
    } catch (error) {
        console.error('❌ Failed to register drivers & documents modules:', error)
        throw error
    }

    try {
        console.log('🔧 Registering tools module...')
        await fastify.register(async (toolsApp) => {
            await toolsRoutes(toolsApp, sharedAuthService, deps.db)
        }, { prefix: '/api' })
        // Register under /api/v1 for consistency with the rest of the platform.
        await fastify.register(async (toolsApp) => {
            await toolsRoutes(toolsApp, sharedAuthService, deps.db)
        }, { prefix: '/api/v1' })
        console.log('✅ Tools module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register tools module:', error)
        throw error
    }

    try {
        console.log('🔧 Registering netops module...')
        await fastify.register(async (netopsApp) => {
            await netopsRoutes(netopsApp, deps.db, sharedAuthService)
        }, { prefix: '/api/netops' })
        console.log('✅ NetOps module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register netops module:', error)
        throw error
    }

    try {
        console.log('🔧 Registering QLTS module...')
        await fastify.register(async (qltsApp) => {
            await registerQltsModule(qltsApp, { pgClient: deps.pgClient })
        }, { prefix: '/api' })
        console.log('✅ QLTS module registered successfully')
    } catch (error) {
        console.error('❌ Failed to register QLTS module:', error)
        throw error
    }

    // Full asset module - includes assets, cmdb, inventory, maintenance, reports, warehouse, etc.
    try {
        console.log('🔧 Registering asset module...')
        await registerAssetModule(fastify, { pgClient: deps.pgClient })
        console.log('✅ Asset module registered successfully')
    } catch (error) {
        console.error('❌ Asset module registration failed:', error)
        throw error
    }

    // ==================== Utility Routes ====================

    // OpenAPI spec
    fastify.get('/openapi.json', {
        schema: { hide: true }
    }, async () => fastify.swagger())

    // Root route
    fastify.get('/', {
        schema: {
            hide: true,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        version: { type: 'string' },
                        docs: { type: 'string' },
                        timestamp: { type: 'string' }
                    }
                }
            }
        }
    }, async () => ({
        name: 'Gateway API',
        version: '2.0.0',
        docs: '/docs',
        timestamp: new Date().toISOString()
    }))

    // Health check
    fastify.get('/health', {
        schema: {
            tags: ['Health'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                        uptime: { type: 'number' }
                    }
                }
            }
        }
    }, async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }))

    fastify.post('/health', async (request, reply) => {
        const requestId = typeof request.id === 'string' ? request.id : randomUUID()
        const apiError = {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed'
        }
        reply.status(405).send(createErrorResponse(apiError, requestId))
    })

    return fastify
}
