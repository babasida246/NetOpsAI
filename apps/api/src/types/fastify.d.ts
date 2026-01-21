/**
 * Type declarations for Fastify extensions
 */
import 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        language?: string
        user?: {
            id: string
            email: string
            role: string
            tier?: string
        }
    }
}
