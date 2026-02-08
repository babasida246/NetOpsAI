import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { EdgeService } from './edge.service.js'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
import { requirePermission } from '../../shared/security/netops-guard.js'

interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        id: string
        role: string
        tenantId?: string
    }
}

const requireRole = (roles: string[]) => async (request: AuthenticatedRequest) => {
    const role = request.user?.role
    if (!role || !roles.includes(role)) {
        throw new UnauthorizedError('Insufficient permissions')
    }
}

const requireTenant = (request: AuthenticatedRequest): string => {
    const tenantId = request.user?.tenantId
    if (!tenantId) {
        throw new UnauthorizedError('Tenant context missing')
    }
    return tenantId
}

const extractEdgeToken = (request: FastifyRequest): string => {
    const token = request.headers['x-edge-token']
    if (!token || typeof token !== 'string') {
        throw new UnauthorizedError('Missing edge token')
    }
    return token
}

export async function edgeRoutes(fastify: FastifyInstance, service: EdgeService): Promise<void> {
    fastify.register(async (edgeApp) => {
        edgeApp.addHook('preHandler', fastify.authenticate)

        edgeApp.post('/pairing-code', {
            schema: {
                tags: ['Edge'],
                summary: 'Create a pairing code'
            },
            preHandler: [requireRole(['admin', 'super_admin'])]
        }, async (request: AuthenticatedRequest) => {
            const tenantId = requireTenant(request)
            requirePermission(request.user ?? {}, 'netops.change.request')
            const { ttlMinutes } = (request.body as { ttlMinutes?: number }) ?? {}
            return service.createPairingCode(tenantId, ttlMinutes)
        })

        edgeApp.post('/jobs', {
            schema: {
                tags: ['Edge'],
                summary: 'Create an edge job'
            },
            preHandler: [requireRole(['admin', 'super_admin'])]
        }, async (request: AuthenticatedRequest) => {
            const tenantId = requireTenant(request)
            requirePermission(request.user ?? {}, 'netops.change.execute')
            const body = request.body as {
                edgeNodeId: string
                jobType: string
                payload?: Record<string, unknown>
                expiresInSeconds?: number
            }
            const jobId = await service.createJob(
                tenantId,
                body.edgeNodeId,
                body.jobType,
                body.payload ?? {},
                body.expiresInSeconds ?? 60
            )
            return { jobId }
        })
    }, { prefix: '/api/edge' })

    fastify.post('/api/edge/pair', {
        schema: {
            tags: ['Edge'],
            summary: 'Pair an edge connector'
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as {
            pairingCode: string
            instanceFingerprint: string
            name: string
        }

        try {
            return await service.pairEdge(body.pairingCode, body.instanceFingerprint, body.name)
        } catch (error: any) {
            return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: error.message } })
        }
    })

    fastify.get('/api/edge/jobs/pull', {
        schema: {
            tags: ['Edge'],
            summary: 'Pull jobs for edge connector'
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = extractEdgeToken(request)
            const jobs = await service.pullJobs(token)
            return { jobs }
        } catch (error: any) {
            return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } })
        }
    })

    fastify.post('/api/edge/jobs/result', {
        schema: {
            tags: ['Edge'],
            summary: 'Submit job result'
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = extractEdgeToken(request)
            const body = request.body as {
                jobId: string
                status: 'success' | 'failed'
                output?: Record<string, unknown>
                logs?: string
            }
            await service.submitResult(token, body.jobId, body.status, body.output ?? {}, body.logs)
            return reply.code(204).send()
        } catch (error: any) {
            return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } })
        }
    })
}
