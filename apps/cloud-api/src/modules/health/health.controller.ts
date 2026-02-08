/**
 * Health Controller
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { HealthService } from './health.service.js'
import { createSuccessResponse } from '../../shared/utils/response.utils.js'
import type { BaseController } from '../../shared/types/api.types.js'

export class HealthController implements BaseController {
    constructor(public readonly service: HealthService) { }

    /**
     * GET /api/v1/health
     */
    async check(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const health = await this.service.check()
        reply.send(createSuccessResponse(health, request.id))
    }

    /**
     * GET /api/v1/health/detailed
     */
    async detailed(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const health = await this.service.detailedCheck()

        const statusCode = health.status === 'healthy' ? 200 : 503

        reply.status(statusCode).send(createSuccessResponse(health, request.id))
    }
}