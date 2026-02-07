/**
 * Health Module
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'
import { HealthService } from './health.service.js'
import { HealthController } from './health.controller.js'
import { registerHealthRoutes } from './health.routes.js'

export function healthModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        // Initialize service
        const healthService = new HealthService(deps.db, deps.redis)

        // Initialize controller
        const healthController = new HealthController(healthService)

        // Register routes
        await registerHealthRoutes(fastify, healthController)

        fastify.log.info('Health module registered successfully')
    }
}