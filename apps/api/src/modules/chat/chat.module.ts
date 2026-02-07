/**
 * Chat Module
 * 
 * Module factory for chat functionality
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'
import { ChatService } from './chat.service.js'
import { chatRoutes } from './chat.routes.js'
import { AuthService } from '../auth/auth.service.js'
import { UserRepository } from '../auth/user.repository.js'
import { SessionRepository } from '../auth/session.repository.js'
import { env } from '../../config/env.js'

export function chatModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        console.log('Registering chat module...')

        try {
            // Initialize services
            const chatService = new ChatService()

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
            await chatRoutes(fastify, chatService, authService)

            console.log('✅ Chat module registered successfully')
        } catch (error) {
            console.error('❌ Failed to register chat module:', error)
            throw error
        }
    }
}