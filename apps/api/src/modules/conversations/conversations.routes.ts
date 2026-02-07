/**
 * Conversations Routes
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ConversationRepository } from './conversations.repository.js'
import {
    conversationSchema,
    createConversationSchema,
    updateConversationSchema,
    messageSchema,
    createMessageSchema,
    listConversationsQuerySchema,
    listMessagesQuerySchema
} from './conversations.schema.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { z } from 'zod'
import { UnauthorizedError, NotFoundError } from '../../shared/errors/http-errors.js'
import { calculatePagination } from '../../shared/utils/helpers.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import type { AuthService } from '../auth/auth.service.js'

export async function conversationRoutes(
    fastify: FastifyInstance,
    conversationRepo: ConversationRepository,
    authService: AuthService
): Promise<void> {
    // Authentication hook
    const authenticate = async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        request.user = { ...authService.verifyAccessToken(token), id: authService.verifyAccessToken(token).sub }
    }

    // GET /conversations - List conversations
    fastify.get('/conversations', {
        preHandler: authenticate
    }, async (request, reply) => {
        const query = listConversationsQuerySchema.parse(request.query)
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const { data, total } = await conversationRepo.findAll(userSub, query)
        const meta = calculatePagination(query.page, query.limit, total)

        return reply.status(200).send({ data, meta })
    })

    // POST /conversations - Create conversation
    fastify.post('/conversations', {
        preHandler: authenticate
    }, async (request, reply) => {
        const data = createConversationSchema.parse(request.body)
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const conversation = await conversationRepo.create(userSub, data)

        return reply.status(201).send(conversation)
    })

    // GET /conversations/:id - Get conversation
    fastify.get('/conversations/:id', {
        schema: {
            tags: ['Conversations'],
            summary: 'Get conversation',
            description: 'Get conversation by ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                },
                required: ['id']
            },
            response: {
                200: zodToJsonSchema(conversationSchema, 'Conversation'),
                401: {},
                404: {}
            }
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const conversation = await conversationRepo.findById(id, userSub)

        if (!conversation) {
            throw new NotFoundError('Conversation not found')
        }

        return reply.status(200).send(conversation)
    })

    // PATCH /conversations/:id - Update conversation
    fastify.patch('/conversations/:id', {
        schema: {
            tags: ['Conversations'],
            summary: 'Update conversation',
            description: 'Update conversation by ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                },
                required: ['id']
            },
            body: zodToJsonSchema(updateConversationSchema, 'UpdateConversationRequest'),
            response: {
                200: zodToJsonSchema(conversationSchema, 'Conversation'),
                401: {},
                404: {}
            }
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const data = updateConversationSchema.parse(request.body)
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const conversation = await conversationRepo.update(id, userSub, data)

        if (!conversation) {
            throw new NotFoundError('Conversation not found')
        }

        return reply.status(200).send(conversation)
    })

    // DELETE /conversations/:id - Delete conversation
    fastify.delete('/conversations/:id', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const deleted = await conversationRepo.delete(id, userSub)

        if (!deleted) {
            throw new NotFoundError('Conversation not found')
        }

        return reply.status(200).send({ success: true, message: 'Conversation deleted' })
    })

    // GET /conversations/:id/messages - List messages
    fastify.get('/conversations/:id/messages', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const query = listMessagesQuerySchema.parse(request.query)

        // Verify conversation exists
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const conv = await conversationRepo.findById(id, userSub)
        if (!conv) {
            throw new NotFoundError('Conversation not found')
        }

        const messages = await conversationRepo.findMessages(id, userSub, query)

        return reply.status(200).send({ data: messages })
    })

    // POST /conversations/:id/messages - Create message
    fastify.post('/conversations/:id/messages', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const data = createMessageSchema.parse(request.body)
        const userSub = request.user?.sub
        if (!userSub) {
            return reply.status(401).send({ error: 'User not authenticated' })
        }

        const message = await conversationRepo.createMessage(id, userSub, data)

        if (!message) {
            throw new NotFoundError('Conversation not found')
        }

        return reply.status(201).send(message)
    })
}


