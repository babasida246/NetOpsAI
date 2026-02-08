/**
 * Auth Module
 * 
 * Module factory for authentication functionality
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { UserRepository } from './user.repository.js'
import { SessionRepository } from './session.repository.js'
import { registerAuthRoutes } from './auth.routes.js'
import { env } from '../../config/env.js'

export function authModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        console.log('Registering auth module...')

        try {
            // Initialize repositories
            console.log('Creating repositories...')
            const userRepo = new UserRepository(deps.db)
            const sessionRepo = new SessionRepository(deps.redis)

            // Initialize service
            console.log('Creating auth service...')
            const authService = new AuthService(userRepo, sessionRepo, {
                accessSecret: env.JWT_ACCESS_SECRET,
                refreshSecret: env.JWT_REFRESH_SECRET,
                accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
                refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
            })

            // Initialize controller
            console.log('Creating auth controller...')
            const authController = new AuthController(authService)

            // Register authentication middleware
            console.log('Registering auth middleware...')
            fastify.decorate('authenticate', async function (request: any, reply: any) {
                try {
                    const authHeader = request.headers.authorization
                    if (!authHeader) {
                        return reply.status(401).send({
                            success: false,
                            error: {
                                code: 'AUTHENTICATION_ERROR',
                                message: 'Missing or invalid authorization header'
                            },
                            meta: {
                                timestamp: new Date().toISOString(),
                                requestId: request.id
                            }
                        })
                    }

                    if (!authHeader.startsWith('Bearer ')) {
                        return reply.status(401).send({
                            success: false,
                            error: {
                                code: 'AUTHENTICATION_ERROR',
                                message: 'Bearer token required'
                            },
                            meta: {
                                timestamp: new Date().toISOString(),
                                requestId: request.id
                            }
                        })
                    }

                    const token = authHeader.substring(7)
                    if (!token) {
                        return reply.status(401).send({
                            success: false,
                            error: {
                                code: 'AUTHENTICATION_ERROR',
                                message: 'Token is required'
                            },
                            meta: {
                                timestamp: new Date().toISOString(),
                                requestId: request.id
                            }
                        })
                    }

                    // Verify token using the service
                    const payload = authService.verifyAccessToken(token)

                    // Set user context in request (matching extractUserContext expectations)
                    request.user = {
                        id: payload.sub,
                        email: payload.email,
                        role: payload.role,
                        tenantId: payload.tenantId ?? null,
                        permissions: []
                    }

                    console.log('Authentication successful for user:', payload.email)
                } catch (error: any) {
                    console.log('Authentication failed:', error.message)
                    return reply.status(401).send({
                        success: false,
                        error: {
                            code: 'AUTHENTICATION_ERROR',
                            message: 'Invalid or expired token'
                        },
                        meta: {
                            timestamp: new Date().toISOString(),
                            requestId: request.id
                        }
                    })
                }
            })

            // Register routes
            console.log('Registering auth routes...')
            await registerAuthRoutes(fastify, authController)

            fastify.log.info('Auth module registered successfully')
            console.log('Auth module registered successfully')
        } catch (error) {
            console.error('Error in auth module registration:', error)
            throw error
        }
    }
}