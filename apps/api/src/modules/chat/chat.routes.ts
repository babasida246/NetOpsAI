/**
 * Chat Routes
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ChatService } from './chat.service.js'
import {
    chatCompletionRequestSchema,
    chatCompletionResponseSchema,
    modelInfoSchema
} from './chat.schema.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import type { AuthService } from '../auth/auth.service.js'
import { z } from 'zod'

export async function chatRoutes(
    fastify: FastifyInstance,
    chatService: ChatService,
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

    // POST /chat/completions - OpenAI compatible endpoint
    fastify.post('/chat/completions', {
        preHandler: authenticate
    }, async (request, reply) => {
        const data = chatCompletionRequestSchema.parse(request.body)

        if (data.stream) {
            // Streaming response
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Request-Id': request.id
            })

            try {
                for await (const chunk of chatService.createStreamingCompletion(data)) {
                    reply.raw.write(chunk)
                }
                reply.raw.write('data: [DONE]\n\n')
            } catch (error) {
                const errorData = JSON.stringify({
                    error: {
                        message: error instanceof Error ? error.message : 'Unknown error',
                        type: 'server_error'
                    }
                })
                reply.raw.write(`data: ${errorData}\n\n`)
            } finally {
                reply.raw.end()
            }
            return
        }

        // Non-streaming response
        const result = await chatService.createCompletion(data)
        return reply.status(200).send(result)
    })

    // GET /chat/models - List available models
    fastify.get('/chat/models', {
        preHandler: authenticate
    }, async (request, reply) => {
        const models = await chatService.getModels()
        return reply.status(200).send({
            object: 'list',
            data: models
        })
    })

    // GET /models - Alias for compatibility
    fastify.get('/models', {
        preHandler: authenticate
    }, async (request, reply) => {
        const models = await chatService.getModels()
        return reply.status(200).send({
            object: 'list',
            data: models
        })
    })

    // GET /stats/chat/daily - Chat stats
    fastify.get('/stats/chat/daily', {
        preHandler: authenticate
    }, async (request, reply) => {
        // Return basic stats for now
        return reply.status(200).send({
            success: true,
            data: {
                totalTokens: 0,
                totalMessages: 0,
                totalCost: 0,
                tokensToday: 0,
                date: new Date().toISOString().split('T')[0]
            }
        })
    })
}


