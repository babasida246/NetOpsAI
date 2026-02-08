/**
 * Authentication Middleware
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from './auth.service.js'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'

interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        id: string
        email: string
        role: string
    }
}

export function createAuthMiddleware(authService: AuthService) {
    return async function authenticate(
        request: AuthenticatedRequest,
        reply: FastifyReply
    ): Promise<void> {
        const authorization = request.headers.authorization

        if (!authorization) {
            throw new UnauthorizedError('Authorization header required')
        }

        const token = authorization.replace('Bearer ', '')
        if (!token) {
            throw new UnauthorizedError('Bearer token required')
        }

        try {
            const payload = authService.verifyAccessToken(token)

            // Attach user context to request
            request.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role
            }
        } catch (error) {
            throw new UnauthorizedError('Invalid or expired token')
        }
    }
}

export function extractUserContext(request: FastifyRequest): { userId?: string; userRole?: string; userEmail?: string } {
    const authenticatedRequest = request as AuthenticatedRequest

    if (authenticatedRequest.user) {
        return {
            userId: authenticatedRequest.user.id,
            userRole: authenticatedRequest.user.role,
            userEmail: authenticatedRequest.user.email
        }
    }

    return {}
}