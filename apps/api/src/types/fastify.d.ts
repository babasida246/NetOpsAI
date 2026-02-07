/**
 * Type declarations for Fastify extensions
 */
import 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        language?: string
        user?: {
            id: string
            sub?: string  // Add sub property for compatibility
            email: string
            role: string
            tier?: string
            permissions?: string[]
        }
        userContext?: {
            userId: string
            roles: string[]
            permissions: string[]
        }
    }

    interface FastifyInstance {
        authenticate?: any
        httpErrors?: any
        diContainer?: {
            resolve<T>(name: string): T
        }
    }

    interface FastifyReply {
        addHook?: (name: string, handler: (...args: any[]) => void) => void
    }
}

// Add module for @infra/postgres types
declare module '@infra/postgres' {
    export type PgClient = any
    export type AssetIncreaseRepo = any
    export type ApprovalRepo = any
    export type PurchasePlanRepo = any
}

declare module '@infra-postgres/shared' {
    export type PurchasePlanRepo = any
    export type ApprovalRepo = any
}
