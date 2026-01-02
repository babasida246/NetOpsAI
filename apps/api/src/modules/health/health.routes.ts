/**
 * Health Check Routes
 */
import type { FastifyInstance } from 'fastify'
import { HealthService } from './health.service.js'
import { healthCheckSchema, readinessSchema, livenessSchema } from './health.schema.js'
import { zodToJsonSchema } from 'zod-to-json-schema'

export async function healthRoutes(
    fastify: FastifyInstance,
    healthService: HealthService
): Promise<void> {
    // GET /health - Full health check
    fastify.get('/health', {}, async (request, reply) => {
        const health = await healthService.getHealth()
        const statusCode = health.status === 'healthy' ? 200 : 503
        return reply.status(statusCode).send(health)
    })

    // GET /health/ready - Kubernetes readiness probe
    fastify.get('/health/ready', {}, async (request, reply) => {
        const readiness = await healthService.getReadiness()
        const statusCode = readiness.ready ? 200 : 503
        return reply.status(statusCode).send(readiness)
    })

    // GET /health/live - Kubernetes liveness probe
    fastify.get('/health/live', {}, async () => {
        return healthService.getLiveness()
    })
}


