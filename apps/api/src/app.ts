/**
 * Fastify Application Setup
 */
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'

import { env } from './config/env.js'
import { errorHandler, requestIdHook } from './shared/middleware/index.js'

// Modules
import { HealthService, healthRoutes } from './modules/health/index.js'
import { UserRepository, SessionRepository, AuthService, authRoutes } from './modules/auth/index.js'
import { ChatService, chatRoutes } from './modules/chat/index.js'
import { IntegratedChatService } from './modules/chat/integrated-chat.service.js'
import { integratedChatRoutes } from './modules/chat/integrated-chat.routes.js'
import { ConversationRepository, conversationRoutes } from './modules/conversations/index.js'
import { AdminRepository, adminRoutes } from './modules/admin/index.js'
import { netopsRoutes } from './modules/netops/index.js'

export interface AppDependencies {
    db: Pool
    redis: Redis
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

    // Rate limiting
    await fastify.register(rateLimit, {
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW_MS
    })

    // Swagger/OpenAPI
    // TEMPORARY: Disabled to fix schema validation errors
    /*
    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'Gateway API',
                description: 'Clean, standardized REST API for LLM Gateway',
                version: '2.0.0'
            },
            servers: [
                { url: `http://localhost:${env.PORT}`, description: 'Development' },
                { url: 'https://api.example.com', description: 'Production' }
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
                { name: 'Admin - Users', description: 'User management (admin only)' },
                { name: 'Admin - System', description: 'System administration' },
                { name: 'Admin - Audit', description: 'Audit logs' },
                { name: 'NetOps', description: 'Network operations and device management' }
            ]
        }
    })
    */

    // Swagger UI
    // TEMPORARY: Disabled to fix schema validation errors
    // await fastify.register(swaggerUi, {
    //     routePrefix: '/docs',
    //     uiConfig: {
    //         docExpansion: 'list',
    //         deepLinking: true,
    //         persistAuthorization: true
    //     },
    //     staticCSP: true
    // })

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
    await healthRoutes(fastify, healthService)

    // Auth
    const userRepo = new UserRepository(deps.db)
    const sessionRepo = new SessionRepository(deps.redis)
    const authService = new AuthService(userRepo, sessionRepo, {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
    })
    await authRoutes(fastify, authService)

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

    // Admin
    const adminRepo = new AdminRepository(deps.db)
    await adminRoutes(fastify, adminRepo, authService)

    // NetOps
    await fastify.register(async (netopsApp) => {
        await netopsRoutes(netopsApp, deps.db, authService)
    }, { prefix: '/netops' })

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
