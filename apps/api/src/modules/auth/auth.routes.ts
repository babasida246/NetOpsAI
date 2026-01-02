/**
 * Authentication Routes
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service.js'
import {
    loginRequestSchema, loginResponseSchema,
    registerRequestSchema, registerResponseSchema,
    refreshTokenRequestSchema, refreshTokenResponseSchema,
    logoutRequestSchema, changePasswordRequestSchema,
    currentUserSchema, type JwtPayload
} from './auth.schema.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'

// Extend FastifyRequest to include user
declare module 'fastify' {
    interface FastifyRequest {
        user?: JwtPayload
    }
}

export async function authRoutes(
    fastify: FastifyInstance,
    authService: AuthService
): Promise<void> {
    // Authentication hook for protected routes
    const authenticate = async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        request.user = authService.verifyAccessToken(token)
    }

    // POST /auth/login
    fastify.post('/auth/login', {
    }, async (request, reply) => {
        const data = loginRequestSchema.parse(request.body)
        const result = await authService.login(data, {
            userAgent: request.headers['user-agent'],
            ip: request.ip
        })
        return reply.status(200).send(result)
    })

    // POST /auth/register
    fastify.post('/auth/register', {
    }, async (request, reply) => {
        const data = registerRequestSchema.parse(request.body)
        const result = await authService.register(data)
        return reply.status(201).send(result)
    })

    // POST /auth/refresh
    fastify.post('/auth/refresh', {
    }, async (request, reply) => {
        const data = refreshTokenRequestSchema.parse(request.body)
        const result = await authService.refreshToken(data)
        return reply.status(200).send(result)
    })

    // POST /auth/logout
    fastify.post('/auth/logout', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { refreshToken } = logoutRequestSchema.parse(request.body)
        await authService.logout(request.user!.sub, refreshToken)
        return reply.status(200).send({ success: true, message: 'Logged out successfully' })
    })

    // GET /auth/me
    fastify.get('/auth/me', {
        preHandler: authenticate
    }, async (request, reply) => {
        const user = await authService.getCurrentUser(request.user!.sub)
        return reply.status(200).send(user)
    })

    // POST /auth/change-password
    fastify.post('/auth/change-password', {
        preHandler: authenticate
    }, async (request, reply) => {
        const data = changePasswordRequestSchema.parse(request.body)
        await authService.changePassword(request.user!.sub, data)
        return reply.status(200).send({ success: true, message: 'Password changed successfully' })
    })
}


