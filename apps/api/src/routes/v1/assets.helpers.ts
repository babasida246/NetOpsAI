import type { FastifyRequest } from 'fastify'
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/http-errors.js'

export function getHeader(request: FastifyRequest, name: string): string | undefined {
    const value = request.headers[name.toLowerCase()]
    if (Array.isArray(value)) return value[0]
    return value
}

export function getCorrelationId(request: FastifyRequest): string {
    const header = getHeader(request, 'x-correlation-id')
    if (header && header.trim().length > 0) return header
    const withCorrelation = request as FastifyRequest & { correlationId?: string }
    return withCorrelation.correlationId ?? String(request.id)
}

export function getUserContext(request: FastifyRequest): { userId: string; role: string; correlationId: string } {
    const userId = getHeader(request, 'x-user-id')
    if (!userId) {
        throw new UnauthorizedError('Missing x-user-id header')
    }
    const role = getHeader(request, 'x-user-role') ?? 'viewer'
    return { userId, role, correlationId: getCorrelationId(request) }
}

export function requireRole(request: FastifyRequest, allowed: string[]): { userId: string; correlationId: string } {
    const ctx = getUserContext(request)
    const elevated = ['admin', 'super_admin']
    if (!allowed.includes(ctx.role) && !elevated.includes(ctx.role)) {
        throw new ForbiddenError('Insufficient role for this action')
    }
    return { userId: ctx.userId, correlationId: ctx.correlationId }
}
