import type { FastifyInstance, FastifyRequest } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { PgClient } from '@infra/postgres'
import { ToolRegistry } from '@tools/registry'
import { registerNetTools } from '@mcp/net-tools'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'
import { AdminRepository } from '../../../modules/admin/admin.repository.js'
import { NetOpsRepository } from '../../../modules/netops/netops.repository.js'
import { topologyDiscoverSchema, topologyGraphQuerySchema, topologyNodeParamsSchema, topologyEdgeParamsSchema, topologyAuditQuerySchema } from './topology.schemas.js'
import { TopologyRepository } from './topology.repository.js'
import type { EntitlementService } from '../../../modules/entitlements/entitlement.service.js'
import { createFeatureGate } from '../../../shared/middleware/feature-gate.js'

export interface TopologyRoutesOptions {
    pgClient: PgClient
    db: any
    entitlementService: EntitlementService
}

function buildToolContext(request: FastifyRequest) {
    const ctx = getUserContext(request)
    return {
        userId: ctx.userId,
        role: ctx.role,
        correlationId: ctx.correlationId,
        logger: request.log
    }
}

export async function topologyRoutes(fastify: FastifyInstance, opts: TopologyRoutesOptions): Promise<void> {
    const adminRepo = new AdminRepository(opts.db)
    const netopsRepo = new NetOpsRepository(opts.db)
    const topoRepo = new TopologyRepository(opts.pgClient)
    const registry = new ToolRegistry()
    const requireTopology = createFeatureGate(opts.entitlementService, 'netops.topology')

    fastify.addHook('preHandler', fastify.authenticate)
    fastify.addHook('preHandler', requireTopology)

    registerNetTools(registry, {
        topologyStore: topoRepo,
        deviceLookup: async (deviceId: string) => {
            const device = await netopsRepo.findDeviceById(deviceId)
            if (!device) return null
            return {
                deviceId: device.id,
                hostname: device.hostname || device.name,
                mgmtIp: device.mgmtIp || null,
                vendor: device.vendor,
                model: device.model,
                site: device.site,
                zone: (device as any).zone || null,
                role: device.role,
                snmpCredentialRef: (device as any).snmpCredentialRef || null
            }
        },
        audit: async (entry: {
            userId?: string
            toolName: string
            target?: string
            args: Record<string, any>
            durationMs: number
            status: 'success' | 'error'
            errorMessage?: string
        }) => {
            await adminRepo.createAuditLog({
                userId: entry.userId,
                action: entry.toolName,
                resource: 'topology',
                resourceId: entry.target ?? undefined,
                details: {
                    args: entry.args,
                    durationMs: entry.durationMs,
                    status: entry.status,
                    errorMessage: entry.errorMessage
                }
            })
        }
    })

    fastify.post('/topology/discover', {
        schema: {
            tags: ['NetOps'],
            summary: 'Trigger topology discovery job',
            body: zodToJsonSchema(topologyDiscoverSchema)
        }
    }, async (request, reply) => {
        requireRole(request, ['netops'])
        const body = topologyDiscoverSchema.parse(request.body)
        const result = await registry.invoke('topology_discover', body, buildToolContext(request))
        return reply.send(result.output)
    })

    fastify.get('/topology/graph', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get topology graph',
            querystring: zodToJsonSchema(topologyGraphQuerySchema)
        }
    }, async (request, reply) => {
        getUserContext(request)
        const query = topologyGraphQuerySchema.parse(request.query)
        const graph = await topoRepo.getGraph(query)
        return reply.send({ data: graph })
    })

    fastify.get('/topology/node/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get topology node detail',
            params: zodToJsonSchema(topologyNodeParamsSchema)
        }
    }, async (request, reply) => {
        getUserContext(request)
        const { id } = topologyNodeParamsSchema.parse(request.params)
        const detail = await topoRepo.getNodeDetail(id)
        if (!detail) return reply.code(404).send({ error: 'Node not found' })
        return reply.send({ data: detail })
    })

    fastify.get('/topology/edge/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get topology edge detail',
            params: zodToJsonSchema(topologyEdgeParamsSchema)
        }
    }, async (request, reply) => {
        getUserContext(request)
        const { id } = topologyEdgeParamsSchema.parse(request.params)
        const detail = await topoRepo.getEdgeDetail(id)
        if (!detail) return reply.code(404).send({ error: 'Edge not found' })
        return reply.send({ data: detail })
    })

    fastify.get('/topology/audit', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get topology audit logs',
            querystring: zodToJsonSchema(topologyAuditQuerySchema)
        }
    }, async (request, reply) => {
        requireRole(request, ['netops'])
        const query = topologyAuditQuerySchema.parse(request.query)
        const result = await adminRepo.findAuditLogs({
            page: 1,
            limit: 100,
            sortOrder: 'desc',
            resource: 'topology',
            userId: query.actor,
            startDate: query.from ?? undefined,
            endDate: query.to ?? undefined
        })
        return reply.send({ data: result.data, meta: { total: result.total } })
    })
}
