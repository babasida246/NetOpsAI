/**
 * QLTS Module Registration
 * Simplified Asset Management System
 */
import type { FastifyInstance } from 'fastify'
import type { PgClient } from '@infra/postgres'
import { qltsRoutes } from '../../../modules/qlts/routes/index.js'

export interface QltsModuleDeps {
    pgClient: PgClient
}

export async function registerQltsModule(
    fastify: FastifyInstance,
    deps: QltsModuleDeps
): Promise<void> {
    try {
        fastify.log.info('Initializing QLTS module...')

        // Initialize repositories
        // Create temporary repository implementations
        class PurchasePlanRepoImpl {
            constructor(private pgClient: any) { }
            async findAll() { return [] }
            async findById(id: string) { return null }
            async create(data: any) { return { id: 'temp' } }
            async update(id: string, data: any) { return null }
            async delete(id: string) { return true }
        }

        class AssetIncreaseRepoImpl {
            constructor(private pgClient: any) { }
            async findAll() { return [] }
            async findById(id: string) { return null }
            async create(data: any) { return { id: 'temp' } }
            async update(id: string, data: any) { return null }
            async delete(id: string) { return true }
        }

        class ApprovalRepoImpl {
            constructor(private pgClient: any) { }
            async findAll() { return [] }
            async findById(id: string) { return null }
            async create(data: any) { return { id: 'temp' } }
            async update(id: string, data: any) { return null }
            async delete(id: string) { return true }
        }

        const purchasePlanRepo = new PurchasePlanRepoImpl(deps.pgClient)
        const assetIncreaseRepo = new AssetIncreaseRepoImpl(deps.pgClient)
        const approvalRepo = new ApprovalRepoImpl(deps.pgClient)

        fastify.log.info('QLTS repositories initialized')

        // Mock DI container for routes
        const diContainer = {
            resolve<T>(key: string): T {
                const registry: Record<string, any> = {
                    pgClient: deps.pgClient,
                    purchasePlanRepo,
                    assetIncreaseRepo,
                    approvalRepo
                }
                return registry[key] as T
            }
        }

        // Decorate fastify with diContainer
        fastify.decorate('diContainer', diContainer)

        fastify.log.info('DI container decorated')

        // Register QLTS routes under /v1/qlts
        await fastify.register(qltsRoutes, { prefix: '/v1/qlts' })

        fastify.log.info('QLTS module registered: /v1/qlts')
    } catch (error) {
        fastify.log.error({ error }, 'Failed to register QLTS module')
        throw error
    }
}
