/**
 * Integrated Chat Routes with Stats and Management
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { IntegratedChatService } from './integrated-chat.service.js'
import { chatCompletionRequestSchema } from './chat.schema.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
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

// ============================================================================
// ROUTES
// ============================================================================

export async function integratedChatRoutes(
    fastify: FastifyInstance,
    chatService: IntegratedChatService,
    authService: AuthService
): Promise<void> {
    // Authentication hook
    const authenticate = async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        request.user = authService.verifyAccessToken(token)
    }

    // ========================================================================
    // CHAT ENDPOINTS
    // ========================================================================

    /**
     * POST /api/chat/send - Send a chat message
     */
    fastify.post('/chat/send', {
        schema: {
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
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const data = sendMessageSchema.parse(request.body)
        const userId = request.user!.sub

        // Build messages array
        const messages: any[] = []
        if (data.systemPrompt) {
            messages.push({ role: 'system', content: data.systemPrompt })
        }
        messages.push({ role: 'user', content: data.message })

        // Send chat
        const result = await chatService.chat(
            {
                model: data.model,
                messages,
                temperature: data.temperature,
                maxTokens: data.maxTokens
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
    })

    /**
     * POST /api/chat/completions - Advanced chat completion (OpenAI compatible)
     */
    fastify.post('/chat/completions', {
        schema: {
            tags: ['Chat'],
            summary: 'Advanced chat completion',
            description: 'OpenAI-compatible chat completion endpoint with tracking',
            security: [{ bearerAuth: [] }]
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const data = chatCompletionRequestSchema.parse(request.body)
        const userId = request.user!.sub

        const result = await chatService.chat(data, {
            userId,
            conversationId: data.conversationId,
            saveToDb: true,
            trackUsage: true
        })

        return reply.status(200).send(result.response)
    })

    // ========================================================================
    // STATS ENDPOINTS
    // ========================================================================

    /**
     * GET /api/chat/stats/conversation/:id - Get conversation stats
     */
    fastify.get('/chat/stats/conversation/:id', {
        schema: {
            tags: ['Chat Stats'],
            summary: 'Get conversation statistics',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const stats = await chatService.getConversationStats(id)
        return reply.status(200).send({ data: stats })
    })

    /**
     * GET /api/chat/stats/user - Get user token usage stats
     */
    fastify.get('/chat/stats/user', {
        schema: {
            tags: ['Chat Stats'],
            summary: 'Get user token usage statistics',
            security: [{ bearerAuth: [] }],
            querystring: zodToJsonSchema(statsQuerySchema)
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const query = statsQuerySchema.parse(request.query)
        const userId = request.user!.sub

        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined

        const stats = await chatService.getUserStats(userId, startDate, endDate)
        return reply.status(200).send({ data: stats })
    })

    /**
     * GET /api/chat/stats/daily - Get daily usage summary
     */
    fastify.get('/chat/stats/daily', {
        schema: {
            tags: ['Chat Stats'],
            summary: 'Get daily usage summary',
            security: [{ bearerAuth: [] }]
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const userId = request.user!.sub
        const summary = await chatService.getDailySummary(userId)
        return reply.status(200).send(summary)
    })

    // ========================================================================
    // MODEL MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/models - List available models
     */
    fastify.get('/chat/models', {
        schema: {
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
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const query = request.query as any
        const models = await chatService.listModels({
            provider: query.provider,
            tier: query.tier ? parseInt(query.tier) : undefined,
            enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined
        })
        return reply.status(200).send({ data: models })
    })

    /**
     * GET /api/chat/models/:id - Get model details
     */
    fastify.get('/chat/models/:id', {
        schema: {
            tags: ['Models'],
            summary: 'Get model details',
            security: [{ bearerAuth: [] }]
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const model = await chatService.getModel(id)

        if (!model) {
            return reply.status(404).send({ error: 'Model not found' })
        }

        return reply.status(200).send(model)
    })

    /**
     * PATCH /api/chat/models/:id/priority - Update model priority
     */
    fastify.patch('/chat/models/:id/priority', {
        schema: {
            tags: ['Models'],
            summary: 'Update model priority',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(updateModelPrioritySchema)
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { priority } = updateModelPrioritySchema.parse(request.body)

        await chatService.updateModelPriority(id, priority)
        return reply.status(200).send({ message: 'Model priority updated' })
    })

    /**
     * GET /api/chat/models/:id/performance - Get model performance
     */
    fastify.get('/chat/models/:id/performance', {
        schema: {
            tags: ['Models'],
            summary: 'Get model performance metrics',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    days: { type: 'integer', default: 7 }
                }
            }
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { days = 7 } = request.query as any

        const performance = await chatService.getModelPerformance(id, parseInt(days))
        return reply.status(200).send({ data: performance })
    })

    // ========================================================================
    // PROVIDER MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/providers - List AI providers
     */
    fastify.get('/chat/providers', {
        schema: {
            tags: ['Providers'],
            summary: 'List AI providers',
            security: [{ bearerAuth: [] }]
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const providers = await chatService.listProviders()
        return reply.status(200).send({ data: providers })
    })

    // ========================================================================
    // ORCHESTRATION MANAGEMENT
    // ========================================================================

    /**
     * GET /api/chat/orchestration - List orchestration rules
     */
    fastify.get('/chat/orchestration', {
        schema: {
            tags: ['Orchestration'],
            summary: 'List orchestration rules',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    enabledOnly: { type: 'boolean', default: false }
                }
            }
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { enabledOnly = false } = request.query as any
        const rules = await chatService.getOrchestrationRules(enabledOnly === 'true')
        return reply.status(200).send({ data: rules })
    })

    /**
     * POST /api/chat/orchestration - Create orchestration rule
     */
    fastify.post('/chat/orchestration', {
        schema: {
            tags: ['Orchestration'],
            summary: 'Create orchestration rule',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(orchestrationRuleSchema)
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const data = orchestrationRuleSchema.parse(request.body)
        const rule = await chatService.createOrchestrationRule(data)
        return reply.status(201).send(rule)
    })

    /**
     * PATCH /api/chat/orchestration/:id - Update orchestration rule
     */
    fastify.patch('/chat/orchestration/:id', {
        schema: {
            tags: ['Orchestration'],
            summary: 'Update orchestration rule',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(orchestrationRuleSchema.partial())
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const updates = orchestrationRuleSchema.partial().parse(request.body)

        await chatService.updateOrchestrationRule(id, updates)
        return reply.status(200).send({ message: 'Rule updated' })
    })

    /**
     * DELETE /api/chat/orchestration/:id - Delete orchestration rule
     */
    fastify.delete('/chat/orchestration/:id', {
        schema: {
            tags: ['Orchestration'],
            summary: 'Delete orchestration rule',
            security: [{ bearerAuth: [] }]
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        await chatService.deleteOrchestrationRule(id)
        return reply.status(200).send({ message: 'Rule deleted' })
    })
}
