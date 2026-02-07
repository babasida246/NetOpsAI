/**
 * Auth Controller
 * 
 * Handles HTTP requests for authentication endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from './auth.service.js'
import type {
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    ChangePasswordRequest
} from './auth.schema.js'
import {
    createSuccessResponse,
    createApiError,
    extractUserContext
} from '../../shared/utils/response.utils.js'
import type { BaseController } from '../../shared/types/api.types.js'

export class AuthController implements BaseController {
    constructor(public readonly service: AuthService) { }

    /**
     * POST /api/v1/auth/login
     */
    async login(
        request: FastifyRequest<{ Body: LoginRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const { email, password } = request.body

        const result = await this.service.login(
            { email, password },
            {
                userAgent: request.headers['user-agent'],
                ip: request.ip
            }
        )

        const response = createSuccessResponse(result, request.id)
        reply.status(200).send(response)
    }

    /**
     * POST /api/v1/auth/register
     */
    async register(
        request: FastifyRequest<{ Body: RegisterRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const data = request.body

        const result = await this.service.register(data, {
            userAgent: request.headers['user-agent'],
            ip: request.ip
        })

        reply.status(201).send(createSuccessResponse(result, request.id))
    }

    /**
     * POST /api/v1/auth/refresh
     */
    async refresh(
        request: FastifyRequest<{ Body: RefreshTokenRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const { refreshToken } = request.body

        const result = await this.service.refreshToken({ refreshToken })

        reply.send(createSuccessResponse(result, request.id))
    }

    /**
     * POST /api/v1/auth/logout
     */
    async logout(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const userContext = extractUserContext(request)

        if (!userContext.userId) {
            throw createApiError.unauthorized()
        }

        await this.service.logout(userContext.userId)

        reply.send(createSuccessResponse({ message: 'Logged out successfully' }, request.id))
    }

    /**
     * GET /api/v1/auth/me
     */
    async getCurrentUser(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const userContext = extractUserContext(request)

        if (!userContext.userId) {
            throw createApiError.unauthorized()
        }

        const user = await this.service.getCurrentUser(userContext.userId)

        reply.send(createSuccessResponse(user, request.id))
    }

    /**
     * POST /api/v1/auth/change-password
     */
    async changePassword(
        request: FastifyRequest<{ Body: ChangePasswordRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const userContext = extractUserContext(request)

        if (!userContext.userId) {
            throw createApiError.unauthorized()
        }

        const { currentPassword, newPassword } = request.body

        await this.service.changePassword(userContext.userId, {
            currentPassword,
            newPassword,
            confirmPassword: newPassword  // Add required confirmPassword field
        })

        reply.send(createSuccessResponse({ message: 'Password changed successfully' }, request.id))
    }
}