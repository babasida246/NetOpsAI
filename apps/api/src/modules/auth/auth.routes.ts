/**
 * Auth Routes
 * 
 * Defines authentication endpoints and their configurations
 */
import type { FastifyInstance } from 'fastify'
import type { AuthController } from './auth.controller.js'

export async function registerAuthRoutes(
    fastify: FastifyInstance,
    controller: AuthController
): Promise<void> {

    console.log('Registering auth routes...')

    // Simple test route first
    fastify.get('/auth/test', async () => {
        console.log('Test route called!')
        return { message: 'Auth routes work!' }
    })

    // POST /auth/login
    fastify.post('/auth/login', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                },
                required: ['email', 'password']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                                expiresIn: { type: 'number' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        email: { type: 'string' },
                                        name: { type: 'string' },
                                        role: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        },
                        meta: { type: 'object' }
                    },
                    required: ['success', 'data', 'meta']
                }
            }
        },
        config: {
            rateLimit: {
                max: 5,
                timeWindow: 60000 // 1 minute
            }
        }
    }, controller.login.bind(controller))

    console.log('Auth routes registered successfully')

    // POST /auth/register
    fastify.post('/auth/register', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string', minLength: 2 },
                    confirmPassword: { type: 'string' }
                },
                required: ['email', 'password', 'name', 'confirmPassword']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                        meta: { type: 'object' }
                    }
                }
            }
        },
        config: {
            rateLimit: {
                max: 3,
                timeWindow: 300000 // 5 minutes
            }
        }
    }, controller.register.bind(controller))

    // POST /auth/refresh
    fastify.post('/auth/refresh', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    refreshToken: { type: 'string' }
                },
                required: ['refreshToken']
            }
        },
        config: {
            rateLimit: {
                max: 10,
                timeWindow: 60000 // 1 minute
            }
        }
    }, controller.refresh.bind(controller))

    // POST /auth/logout
    fastify.post('/auth/logout', {
        preHandler: [fastify.authenticate]
    }, controller.logout.bind(controller))

    // GET /auth/me
    fastify.get('/auth/me', {
        preHandler: [fastify.authenticate]
    }, controller.getCurrentUser.bind(controller))

    // GET /users/me - Alias for compatibility
    fastify.get('/users/me', {
        preHandler: [fastify.authenticate]
    }, controller.getCurrentUser.bind(controller))

    // POST /auth/change-password
    fastify.post('/auth/change-password', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                    confirmPassword: { type: 'string' }
                },
                required: ['currentPassword', 'newPassword', 'confirmPassword']
            }
        },
        preHandler: [fastify.authenticate],
        config: {
            rateLimit: {
                max: 3,
                timeWindow: 300000 // 5 minutes
            }
        }
    }, controller.changePassword.bind(controller))
}