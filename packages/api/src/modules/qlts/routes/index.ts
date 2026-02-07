import type { FastifyPluginAsync } from 'fastify'
import { purchasePlanRoutes } from './purchasePlans.js'
import { assetIncreaseRoutes } from './assetIncreases.js'

export const qltsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(purchasePlanRoutes, { prefix: '/purchase-plans' })
    fastify.register(assetIncreaseRoutes, { prefix: '/asset-increases' })
}
