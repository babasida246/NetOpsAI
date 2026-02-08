/**
 * Health Routes
 */
import type { FastifyInstance } from 'fastify'
import type { HealthController } from './health.controller.js'

export async function registerHealthRoutes(
    fastify: FastifyInstance,
    controller: HealthController
): Promise<void> {

    // GET /health
    fastify.get('/health', {
        schema: {
            tags: ['Health'],
            description: 'Basic health check',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                status: { type: 'string' },
                                timestamp: { type: 'string' },
                                uptime: { type: 'number' }
                            }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: { type: 'string' },
                                requestId: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, controller.check.bind(controller))

    // GET /health/detailed
    fastify.get('/health/detailed', {
        schema: {
            tags: ['Health'],
            description: 'Detailed health check including dependencies',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: { type: 'string' },
                                requestId: { type: 'string' }
                            }
                        }
                    }
                },
                503: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        error: { type: 'object' },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: { type: 'string' },
                                requestId: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, controller.detailed.bind(controller))
}


