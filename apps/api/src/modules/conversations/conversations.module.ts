/**
 * Conversations Module
 * 
 * Module factory for conversations functionality
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'
import { ConversationRepository } from './conversations.repository.js'
import { conversationRoutes } from './conversations.routes.js'
import { AuthService } from '../auth/auth.service.js'
import { UserRepository } from '../auth/user.repository.js'
import { SessionRepository } from '../auth/session.repository.js'
import { env } from '../../config/env.js'

export function conversationsModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        console.log('Registering conversations module...')

        try {
            // Initialize repositories and services
            const conversationRepo = new ConversationRepository(deps.pgClient)
            const userRepository = new UserRepository(deps.pgClient)
            const sessionRepository = new SessionRepository(deps.redis)

            const authService = new AuthService(
                userRepository,
                sessionRepository,
                {
                    accessSecret: env.JWT_ACCESS_SECRET,
                    refreshSecret: env.JWT_REFRESH_SECRET,
                    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
                    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
                }
            )

            // Register routes
            await conversationRoutes(fastify, conversationRepo, authService)

            console.log('✅ Conversations module registered successfully')
        } catch (error) {
            console.error('❌ Failed to register conversations module:', error)
            throw error
        }
    }
}