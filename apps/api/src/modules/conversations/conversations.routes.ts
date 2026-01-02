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
        request.user = authService.verifyAccessToken(token)
    }

    // GET /conversations - List conversations
    fastify.get('/conversations', {
        preHandler: authenticate
    }, async (request, reply) => {
        const query = listConversationsQuerySchema.parse(request.query)
        const { data, total } = await conversationRepo.findAll(request.user!.sub, query)
        const meta = calculatePagination(query.page, query.limit, total)

        return reply.status(200).send({ data, meta })
    })

    // POST /conversations - Create conversation
    fastify.post('/conversations', {
        preHandler: authenticate
    }, async (request, reply) => {
        const data = createConversationSchema.parse(request.body)
        const conversation = await conversationRepo.create(request.user!.sub, data)

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
        const conversation = await conversationRepo.findById(id, request.user!.sub)

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
        const conversation = await conversationRepo.update(id, request.user!.sub, data)

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
        const deleted = await conversationRepo.delete(id, request.user!.sub)

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
        const conv = await conversationRepo.findById(id, request.user!.sub)
        if (!conv) {
            throw new NotFoundError('Conversation not found')
        }

        const messages = await conversationRepo.findMessages(id, request.user!.sub, query)

        return reply.status(200).send({ data: messages })
    })

    // POST /conversations/:id/messages - Create message
    fastify.post('/conversations/:id/messages', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const data = createMessageSchema.parse(request.body)
        const message = await conversationRepo.createMessage(id, request.user!.sub, data)

        if (!message) {
            throw new NotFoundError('Conversation not found')
        }

        return reply.status(201).send(message)
    })
}


