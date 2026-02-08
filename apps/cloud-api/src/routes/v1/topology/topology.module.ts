import type { FastifyInstance } from 'fastify'
import type { PgClient } from '@infra/postgres'
import type { EntitlementService } from '../../../modules/entitlements/entitlement.service.js'
import { topologyRoutes } from './topology.routes.js'

export interface TopologyModuleDeps {
    pgClient: PgClient
    db: any
    entitlementService: EntitlementService
}

export async function registerTopologyModule(
    fastify: FastifyInstance,
    deps: TopologyModuleDeps
): Promise<void> {
    await fastify.register(topologyRoutes, {
        prefix: '/api/v1',
        pgClient: deps.pgClient,
        db: deps.db,
        entitlementService: deps.entitlementService
    })
}
