/**
 * Integrated Chat Routes with Stats and Management
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { IntegratedChatService } from './integrated-chat.service.js'
import { chatCompletionRequestSchema } from './chat.schema.js'
import type { ChatCompletionRequest } from './chat.schema.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'

// ============================================================================
// SCHEMAS
// ============================================================================

const sendMessageSchema = z.object({
    message: z.string().min(1),
    conversationId: z.string().uuid().optional(),
    model: z.string().default('openai/gpt-4o-mini'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().optional()
})

const statsQuerySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
})

const orchestrationRuleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    strategy: z.enum(['fallback', 'load_balance', 'cost_optimize', 'quality_first', 'custom']),
    modelSequence: z.array(z.string()).min(1),
    conditions: z.record(z.any()).optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).default(100)
})

const updateModelPrioritySchema = z.object({
    priority: z.number().int().min(0)
})

const updateModelSchema = z.object({
    description: z.string().optional(),
    tier: z.number().int().min(0).optional(),
    contextWindow: z.number().int().positive().optional(),
    maxTokens: z.number().int().positive().optional(),
    costPer1kInput: z.number().nonnegative().optional(),
    costPer1kOutput: z.number().nonnegative().optional(),
    enabled: z.boolean().optional(),
    supportsStreaming: z.boolean().optional(),
    supportsFunctions: z.boolean().optional(),
    supportsVision: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
    status: z.enum(['active', 'inactive', 'deprecated']).optional(),
    displayName: z.string().optional(),
    capabilities: z.record(z.any()).optional()
})

const updateProviderSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    apiEndpoint: z.string().url().optional(),
    apiKey: z.string().optional(),
    authType: z.string().optional(),
    capabilities: z.record(z.any()).optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    rateLimitPerMinute: z.number().int().positive().optional(),
    creditsRemaining: z.number().nonnegative().optional(),
    tokensUsed: z.number().int().nonnegative().optional(),
    lastUsageAt: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional()
})

const createModelSchema = updateModelSchema.extend({
    id: z.string().min(1),
    provider: z.string().min(1),
    tier: z.number().int().min(0).default(0),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).default(100),
    status: z.enum(['active', 'inactive', 'deprecated']).default('active')
})

const createProviderSchema = updateProviderSchema.extend({
    id: z.string().min(1),
    name: z.string().min(1),
    status: z.enum(['active', 'inactive', 'maintenance']).default('active')
})

const historyQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional()
})

const importOpenRouterModelSchema = z.object({
    modelId: z.string().min(1),
    priority: z.number().int().min(0).optional()
})

// ============================================================================
// ROUTES
// ============================================================================

export async function integratedChatRoutes(
    fastify: FastifyInstance,
    chatService: IntegratedChatService,
    authService: AuthService
): Promise<void> {
    const markLegacy = (reply: FastifyReply) => {
        reply.header('Deprecation', 'true')
        reply.header('Sunset', 'Tue, 30 Jun 2026 00:00:00 GMT')
        reply.header('Link', '</docs/api/MIGRATION.md>; rel="deprecation"')
    }

    // Authentication hook
    const authenticate = async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        request.user = authService.verifyAccessToken(token)
    }

    const requireAdmin = async (request: FastifyRequest) => {
        await authenticate(request)
        if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'super_admin')) {
            throw new ForbiddenError('Admin access required')
        }
    }

    // ========================================================================
    // CHAT ENDPOINTS
    // ========================================================================

    const sendMessageHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const data = sendMessageSchema.parse(request.body)
        const userId = request.user!.sub

        const messages: ChatCompletionRequest['messages'] = []
        if (data.systemPrompt) {
            messages.push({ role: 'system', content: data.systemPrompt })
        }
        messages.push({ role: 'user', content: data.message })

        const result = await chatService.chat(
            {
                model: data.model,
                messages,
                temperature: data.temperature,
                maxTokens: data.maxTokens,
                stream: false
            },
            {
                userId,
                conversationId: data.conversationId,
                saveToDb: true,
                trackUsage: true
            }
        )

        return reply.status(200).send({
            message: result.response.choices[0]?.message?.content || '',
            conversationId: result.conversationId,
            model: result.model,
            provider: result.provider,
            usage: result.usage,
            latencyMs: result.latencyMs
        })
    }

    const sendMessageSchemaJson = {
        tags: ['Chat'],
        summary: 'Send chat message',
        description: 'Send a chat message with automatic tracking and context management',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(sendMessageSchema),
        response: {
            200: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    conversationId: { type: 'string' },
                    model: { type: 'string' },
                    provider: { type: 'string' },
                    usage: {
                        type: 'object',
                        properties: {
                            promptTokens: { type: 'number' },
                            completionTokens: { type: 'number' },
                            totalTokens: { type: 'number' },
                            estimatedCost: { type: 'number' }
                        }
                    },
                    latencyMs: { type: 'number' }
                }
            }
        }
    }

    fastify.post('/chat/send', {
        schema: sendMessageSchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return sendMessageHandler(request, reply)
    })

    fastify.post('/chat/messages', {
        schema: sendMessageSchemaJson,
        preHandler: authenticate
    }, sendMessageHandler)

    /**
     * POST /api/chat/completions - Advanced chat completion (OpenAI compatible)
     */
    const completionHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const data = chatCompletionRequestSchema.parse(request.body)
        const userId = request.user!.sub

        const result = await chatService.chat(data, {
            userId,
            conversationId: data.conversationId,
            saveToDb: true,
            trackUsage: true
        })

        return reply.status(200).send(result.response)
    }

    const completionSchemaJson = {
        tags: ['Chat'],
        summary: 'Advanced chat completion',
        description: 'OpenAI-compatible chat completion endpoint with tracking',
        security: [{ bearerAuth: [] }]
    }

    fastify.post('/chat/completions', {
        schema: completionSchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return completionHandler(request, reply)
    })

    fastify.post('/completions', {
        schema: completionSchemaJson,
        preHandler: authenticate
    }, completionHandler)

    // ========================================================================
    // STATS ENDPOINTS
    // ========================================================================

    /**
     * GET /api/chat/stats/conversation/:id - Get conversation stats
     */
    const conversationStatsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const stats = await chatService.getConversationStats(id)
        return reply.status(200).send({ data: stats })
    }

    const conversationStatsSchema = {
        tags: ['Chat Stats'],
        summary: 'Get conversation statistics',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' }
            }
        }
    }

    fastify.get('/chat/stats/conversation/:id', {
        schema: conversationStatsSchema,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return conversationStatsHandler(request, reply)
    })

    fastify.get('/stats/chat/conversations/:id', {
        schema: conversationStatsSchema,
        preHandler: authenticate
    }, conversationStatsHandler)

    /**
     * GET /api/chat/stats/user - Get user token usage stats
     */
    const userStatsSchema = {
        tags: ['Chat Stats'],
        summary: 'Get user token usage statistics',
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(statsQuerySchema)
    }

    const userStatsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = statsQuerySchema.parse(request.query)
        const userId = request.user!.sub

        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined

        const stats = await chatService.getUserStats(userId, startDate, endDate)
        return reply.status(200).send({ data: stats })
    }

    fastify.get('/chat/stats/user', {
        schema: userStatsSchema,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return userStatsHandler(request, reply)
    })

    fastify.get('/stats/chat/user', {
        schema: userStatsSchema,
        preHandler: authenticate
    }, userStatsHandler)

    /**
     * GET /api/chat/stats/daily - Get daily usage summary
     */
    const dailySummarySchema = {
        tags: ['Chat Stats'],
        summary: 'Get daily usage summary',
        security: [{ bearerAuth: [] }]
    }

    const dailySummaryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user!.sub
        const summary = await chatService.getDailySummary(userId)
        return reply.status(200).send(summary)
    }

    fastify.get('/chat/stats/daily', {
        schema: dailySummarySchema,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return dailySummaryHandler(request, reply)
    })

    fastify.get('/stats/chat/daily', {
        schema: dailySummarySchema,
        preHandler: authenticate
    }, dailySummaryHandler)

    // ========================================================================
    // MODEL MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/models - List available models
     */
    const listModelsSchema = {
        tags: ['Models'],
        summary: 'List available AI models',
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            properties: {
                provider: { type: 'string' },
                tier: { type: 'integer' },
                enabled: { type: 'boolean' }
            }
        }
    }

    const listModelsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as any
        const enabledRaw = query.enabled
        const enabled = enabledRaw === undefined
            ? undefined
            : (enabledRaw === true || enabledRaw === 'true')

        const models = await chatService.listModels({
            provider: query.provider,
            tier: query.tier ? parseInt(query.tier) : undefined,
            enabled
        })
        return reply.status(200).send({ data: models })
    }

    fastify.get('/chat/models', {
        schema: listModelsSchema,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return listModelsHandler(request, reply)
    })

    fastify.get('/models', {
        schema: listModelsSchema,
        preHandler: authenticate
    }, listModelsHandler)

    /**
     * GET /api/chat/models/:id - Get model details
     */
    const getModelSchemaJson = {
        tags: ['Models'],
        summary: 'Get model details',
        security: [{ bearerAuth: [] }]
    }

    const getModelHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const model = await chatService.getModel(id)

        if (!model) {
            return reply.status(404).send({ error: 'Model not found' })
        }

        return reply.status(200).send(model)
    }

    fastify.get('/chat/models/:id', {
        schema: getModelSchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return getModelHandler(request, reply)
    })

    fastify.get('/models/:id', {
        schema: getModelSchemaJson,
        preHandler: authenticate
    }, getModelHandler)

    /**
     * PATCH /api/chat/models/:id/priority - Update model priority
     */
    const updateModelPrioritySchemaJson = {
        tags: ['Models'],
        summary: 'Update model priority',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(updateModelPrioritySchema)
    }

    const updateModelPriorityHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const { priority } = updateModelPrioritySchema.parse(request.body)

        await chatService.updateModelPriority(id, priority)
        return reply.status(200).send({ message: 'Model priority updated' })
    }

    fastify.patch('/chat/models/:id/priority', {
        schema: updateModelPrioritySchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return updateModelPriorityHandler(request, reply)
    })

    fastify.patch('/models/:id/priority', {
        schema: updateModelPrioritySchemaJson,
        preHandler: requireAdmin
    }, updateModelPriorityHandler)

    /**
     * PATCH /api/chat/models/:id - Update model metadata/config
     */
    const updateModelSchemaJson = {
        tags: ['Models'],
        summary: 'Update model config',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(updateModelSchema)
    }

    const updateModelHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const updates = updateModelSchema.parse(request.body)
        await chatService.updateModel(id, updates)
        return reply.status(200).send({ message: 'Model updated' })
    }

    fastify.patch('/chat/models/:id', {
        schema: updateModelSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return updateModelHandler(request, reply)
    })

    fastify.patch('/models/:id', {
        schema: updateModelSchemaJson,
        preHandler: requireAdmin
    }, updateModelHandler)

    /**
     * POST /api/chat/models - Create model
     */
    const createModelSchemaJson = {
        tags: ['Models'],
        summary: 'Create model',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createModelSchema)
    }

    const createModelHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const data = createModelSchema.parse(request.body)
        const created = await chatService.createModel(data)
        return reply.status(201).send(created)
    }

    fastify.post('/chat/models', {
        schema: createModelSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return createModelHandler(request, reply)
    })

    fastify.post('/models', {
        schema: createModelSchemaJson,
        preHandler: requireAdmin
    }, createModelHandler)

    /**
     * DELETE /api/chat/models/:id - Delete model
     */
    const deleteModelSchemaJson = {
        tags: ['Models'],
        summary: 'Delete model',
        security: [{ bearerAuth: [] }]
    }

    const deleteModelHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const deleted = await chatService.deleteModel(id)
        if (!deleted) {
            throw new NotFoundError('Model not found')
        }
        return reply.status(200).send({ message: 'Model deleted' })
    }

    fastify.delete('/chat/models/:id', {
        schema: deleteModelSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return deleteModelHandler(request, reply)
    })

    fastify.delete('/models/:id', {
        schema: deleteModelSchemaJson,
        preHandler: requireAdmin
    }, deleteModelHandler)

    /**
     * GET /api/chat/models/:id/history - Model usage history
     */
    const modelHistorySchemaJson = {
        tags: ['Models'],
        summary: 'Model usage history',
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(historyQuerySchema)
    }

    const modelHistoryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const query = historyQuerySchema.parse(request.query)
        const history = await chatService.getModelHistory(id, query.days)
        return reply.status(200).send({ data: history })
    }

    fastify.get('/chat/models/:id/history', {
        schema: modelHistorySchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return modelHistoryHandler(request, reply)
    })

    fastify.get('/models/:id/history', {
        schema: modelHistorySchemaJson,
        preHandler: authenticate
    }, modelHistoryHandler)

    /**
     * GET /api/chat/models/:id/performance - Get model performance
     */
    const modelPerformanceSchemaJson = {
        tags: ['Models'],
        summary: 'Get model performance metrics',
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            properties: {
                days: { type: 'integer', default: 7 }
            }
        }
    }

    const modelPerformanceHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const { days = 7 } = request.query as any

        const performance = await chatService.getModelPerformance(id, parseInt(days))
        return reply.status(200).send({ data: performance })
    }

    fastify.get('/chat/models/:id/performance', {
        schema: modelPerformanceSchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return modelPerformanceHandler(request, reply)
    })

    fastify.get('/models/:id/performance', {
        schema: modelPerformanceSchemaJson,
        preHandler: authenticate
    }, modelPerformanceHandler)

    // ========================================================================
    // PROVIDER MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/providers - List AI providers
     */
    const listProvidersSchemaJson = {
        tags: ['Providers'],
        summary: 'List AI providers',
        security: [{ bearerAuth: [] }]
    }

    const listProvidersHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
        const providers = await chatService.listProviders()
        return reply.status(200).send({ data: providers })
    }

    fastify.get('/chat/providers', {
        schema: listProvidersSchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return listProvidersHandler(request, reply)
    })

    fastify.get('/providers', {
        schema: listProvidersSchemaJson,
        preHandler: authenticate
    }, listProvidersHandler)

    /**
     * GET /api/chat/providers/:id/health - Health check provider
     */
    const providerHealthSchemaJson = {
        tags: ['Providers'],
        summary: 'Provider health check',
        security: [{ bearerAuth: [] }]
    }

    const providerHealthHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const health = await chatService.checkProviderHealth(id)
        return reply.status(200).send(health)
    }

    fastify.get('/chat/providers/:id/health', {
        schema: providerHealthSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return providerHealthHandler(request, reply)
    })

    fastify.get('/providers/:id/health', {
        schema: providerHealthSchemaJson,
        preHandler: requireAdmin
    }, providerHealthHandler)

    /**
     * GET /api/chat/providers/openrouter/models - List OpenRouter models (remote)
     */
    const openRouterRemoteModelsSchema = {
        tags: ['Providers'],
        summary: 'List OpenRouter remote models',
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            properties: {
                search: { type: 'string' },
                page: { type: 'integer', default: 1 },
                limit: { type: 'integer', default: 50 }
            }
        }
    }

    const openRouterRemoteModelsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { search, page = 1, limit = 50 } = request.query as { search?: string; page?: number; limit?: number }
        const models = await chatService.fetchOpenRouterModels(search, Number(page), Number(limit))
        return reply.status(200).send({ data: models, meta: { page: Number(page), limit: Number(limit) } })
    }

    fastify.get('/chat/providers/openrouter/models', {
        schema: openRouterRemoteModelsSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return openRouterRemoteModelsHandler(request, reply)
    })

    fastify.get('/providers/openrouter/remote-models', {
        schema: openRouterRemoteModelsSchema,
        preHandler: requireAdmin
    }, openRouterRemoteModelsHandler)

    /**
     * POST /api/chat/providers/openrouter/import-model - Import remote model into local config
     */
    const importOpenRouterSchemaJson = {
        tags: ['Providers'],
        summary: 'Import OpenRouter model into local model configs',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(importOpenRouterModelSchema)
    }

    const importOpenRouterHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const raw = (request.body ?? {}) as any
        const parsedBody = typeof raw === 'string' ? JSON.parse(raw) : raw
        const body = importOpenRouterModelSchema.parse(parsedBody)
        const model = await chatService.importOpenRouterModel(body.modelId, body.priority)
        return reply.status(201).send(model)
    }

    fastify.post('/chat/providers/openrouter/import-model', {
        schema: importOpenRouterSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return importOpenRouterHandler(request, reply)
    })

    fastify.post('/providers/openrouter/models/import', {
        schema: importOpenRouterSchemaJson,
        preHandler: requireAdmin
    }, importOpenRouterHandler)

    /**
     * GET /api/chat/providers/openrouter/account - OpenRouter account activity
     */
    const openRouterAccountSchema = {
        tags: ['Providers'],
        summary: 'OpenRouter account activity',
        security: [{ bearerAuth: [] }]
    }

    const openRouterAccountHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
        const data = await chatService.getOpenRouterAccountActivity()
        return reply.status(200).send(data)
    }

    fastify.get('/chat/providers/openrouter/account', {
        schema: openRouterAccountSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return openRouterAccountHandler(request, reply)
    })

    fastify.get('/providers/openrouter/account', {
        schema: openRouterAccountSchema,
        preHandler: requireAdmin
    }, openRouterAccountHandler)

    /**
     * GET /api/chat/providers/openrouter/credits - OpenRouter credit/usage
     */
    const openRouterCreditsSchema = {
        tags: ['Providers'],
        summary: 'OpenRouter credits/billing info',
        security: [{ bearerAuth: [] }]
    }

    const openRouterCreditsHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
        const data = await chatService.getOpenRouterCredits()
        return reply.status(200).send(data)
    }

    fastify.get('/chat/providers/openrouter/credits', {
        schema: openRouterCreditsSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return openRouterCreditsHandler(request, reply)
    })

    fastify.get('/providers/openrouter/credits', {
        schema: openRouterCreditsSchema,
        preHandler: requireAdmin
    }, openRouterCreditsHandler)

    /**
     * PATCH /api/chat/providers/:id - Update provider config/keys
     */
    const updateProviderSchemaJson = {
        tags: ['Providers'],
        summary: 'Update AI provider',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(updateProviderSchema)
    }

    const updateProviderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const updates = updateProviderSchema.parse(request.body)
        await chatService.updateProvider(id, updates)
        return reply.status(200).send({ message: 'Provider updated' })
    }

    fastify.patch('/chat/providers/:id', {
        schema: updateProviderSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return updateProviderHandler(request, reply)
    })

    fastify.patch('/providers/:id', {
        schema: updateProviderSchemaJson,
        preHandler: requireAdmin
    }, updateProviderHandler)

    /**
     * POST /api/chat/providers - Create provider
     */
    const createProviderSchemaJson = {
        tags: ['Providers'],
        summary: 'Create provider',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createProviderSchema)
    }

    const createProviderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const data = createProviderSchema.parse(request.body)
        const created = await chatService.createProvider(data)
        return reply.status(201).send(created)
    }

    fastify.post('/chat/providers', {
        schema: createProviderSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return createProviderHandler(request, reply)
    })

    fastify.post('/providers', {
        schema: createProviderSchemaJson,
        preHandler: requireAdmin
    }, createProviderHandler)

    /**
     * DELETE /api/chat/providers/:id - Delete provider
     */
    const deleteProviderSchemaJson = {
        tags: ['Providers'],
        summary: 'Delete provider',
        security: [{ bearerAuth: [] }]
    }

    const deleteProviderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const deleted = await chatService.deleteProvider(id)
        if (!deleted) {
            throw new NotFoundError('Provider not found')
        }
        return reply.status(200).send({ message: 'Provider deleted' })
    }

    fastify.delete('/chat/providers/:id', {
        schema: deleteProviderSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return deleteProviderHandler(request, reply)
    })

    fastify.delete('/providers/:id', {
        schema: deleteProviderSchemaJson,
        preHandler: requireAdmin
    }, deleteProviderHandler)

    /**
     * GET /api/chat/providers/:id/history - Provider usage history
     */
    const providerHistorySchemaJson = {
        tags: ['Providers'],
        summary: 'Provider usage history',
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(historyQuerySchema)
    }

    const providerHistoryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const query = historyQuerySchema.parse(request.query)
        const history = await chatService.getProviderHistory(id, query.days)
        return reply.status(200).send({ data: history })
    }

    fastify.get('/chat/providers/:id/history', {
        schema: providerHistorySchemaJson,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return providerHistoryHandler(request, reply)
    })

    fastify.get('/providers/:id/history', {
        schema: providerHistorySchemaJson,
        preHandler: authenticate
    }, providerHistoryHandler)

    /**
     * GET /api/chat/usage/logs - recent usage log entries
     */
    const usageLogsSchemaJson = {
        tags: ['Chat Stats'],
        summary: 'Recent usage log entries',
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(historyQuerySchema.pick({ limit: true }))
    }

    const usageLogsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = historyQuerySchema.pick({ limit: true }).parse(request.query)
        const logs = await chatService.listUsageLogs(query.limit)
        return reply.status(200).send({ data: logs })
    }

    fastify.get('/chat/usage/logs', {
        schema: usageLogsSchemaJson,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return usageLogsHandler(request, reply)
    })

    fastify.get('/usage/logs', {
        schema: usageLogsSchemaJson,
        preHandler: requireAdmin
    }, usageLogsHandler)

    // ========================================================================
    // ORCHESTRATION MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/orchestration - List orchestration rules
     */
    const orchestrationListSchema = {
        tags: ['Orchestration'],
        summary: 'List orchestration rules',
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            properties: {
                enabledOnly: { type: 'boolean', default: false }
            }
        }
    }

    const orchestrationListHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { enabledOnly = false } = request.query as any
        const enabledFlag = typeof enabledOnly === 'string' ? enabledOnly === 'true' : !!enabledOnly
        const rules = await chatService.getOrchestrationRules(enabledFlag)
        return reply.status(200).send({ data: rules })
    }

    fastify.get('/chat/orchestration', {
        schema: orchestrationListSchema,
        preHandler: authenticate
    }, async (request, reply) => {
        markLegacy(reply)
        return orchestrationListHandler(request, reply)
    })

    fastify.get('/orchestration/rules', {
        schema: orchestrationListSchema,
        preHandler: authenticate
    }, orchestrationListHandler)

    /**
     * POST /api/chat/orchestration - Create orchestration rule
     */
    const orchestrationCreateSchema = {
        tags: ['Orchestration'],
        summary: 'Create orchestration rule',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(orchestrationRuleSchema)
    }

    const orchestrationCreateHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const data = orchestrationRuleSchema.parse(request.body)
        const rule = await chatService.createOrchestrationRule(data)
        return reply.status(201).send(rule)
    }

    fastify.post('/chat/orchestration', {
        schema: orchestrationCreateSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return orchestrationCreateHandler(request, reply)
    })

    fastify.post('/orchestration/rules', {
        schema: orchestrationCreateSchema,
        preHandler: requireAdmin
    }, orchestrationCreateHandler)

    /**
     * PATCH /api/chat/orchestration/:id - Update orchestration rule
     */
    const orchestrationUpdateSchema = {
        tags: ['Orchestration'],
        summary: 'Update orchestration rule',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(orchestrationRuleSchema.partial())
    }

    const orchestrationUpdateHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const updates = orchestrationRuleSchema.partial().parse(request.body)

        await chatService.updateOrchestrationRule(id, updates)
        return reply.status(200).send({ message: 'Rule updated' })
    }

    fastify.patch('/chat/orchestration/:id', {
        schema: orchestrationUpdateSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return orchestrationUpdateHandler(request, reply)
    })

    fastify.patch('/orchestration/rules/:id', {
        schema: orchestrationUpdateSchema,
        preHandler: requireAdmin
    }, orchestrationUpdateHandler)

    /**
     * DELETE /api/chat/orchestration/:id - Delete orchestration rule
     */
    const orchestrationDeleteSchema = {
        tags: ['Orchestration'],
        summary: 'Delete orchestration rule',
        security: [{ bearerAuth: [] }]
    }

    const orchestrationDeleteHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        await chatService.deleteOrchestrationRule(id)
        return reply.status(200).send({ message: 'Rule deleted' })
    }

    fastify.delete('/chat/orchestration/:id', {
        schema: orchestrationDeleteSchema,
        preHandler: requireAdmin
    }, async (request, reply) => {
        markLegacy(reply)
        return orchestrationDeleteHandler(request, reply)
    })

    fastify.delete('/orchestration/rules/:id', {
        schema: orchestrationDeleteSchema,
        preHandler: requireAdmin
    }, orchestrationDeleteHandler)
}
