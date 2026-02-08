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
        tenantId?: string | null
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
                role: payload.role,
                tenantId: payload.tenantId ?? null
            }
        } catch (error) {
            throw new UnauthorizedError('Invalid or expired token')
        }
    }
}

export function extractUserContext(request: FastifyRequest): { userId?: string; userRole?: string; userEmail?: string; tenantId?: string | null } {
    const authenticatedRequest = request as AuthenticatedRequest

    if (authenticatedRequest.user) {
        return {
            userId: authenticatedRequest.user.id,
            userRole: authenticatedRequest.user.role,
            userEmail: authenticatedRequest.user.email,
            tenantId: authenticatedRequest.user.tenantId ?? null
        }
    }

    return {}
}