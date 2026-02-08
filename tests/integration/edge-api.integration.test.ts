import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { createEdgePool, closeEdgePool } from '@infra-edge/db'
import { createEdgeRedisClient, closeEdgeRedisClient } from '@infra-edge/redis'
import type { Pool } from 'pg'
import type { RedisClientType } from 'redis'
import { buildApp } from '../../apps/edge-api/src/app.js'

const runIntegration = process.env.RUN_INTEGRATION === 'true'
const describeMaybe = runIntegration ? describe : describe.skip

type MockResult = { jobId: string; status: string; output?: unknown; logs?: string }

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
        let data = ''
        request.on('data', (chunk) => {
            data += chunk
        })
        request.on('end', () => resolve(data))
    })
}

describeMaybe('integration: edge-api db/redis', () => {
    const edgeDbUrl = process.env.EDGE_DB_URL ?? ''
    const edgeRedisUrl = process.env.EDGE_REDIS_URL ?? ''

    let pool: Pool
    let redis: RedisClientType
    let app: Awaited<ReturnType<typeof buildApp>>
    let server: ReturnType<typeof createServer>
    let serverUrl = ''
    let results: MockResult[] = []

    beforeAll(async () => {
        expect(edgeDbUrl, 'EDGE_DB_URL required').toBeTruthy()
        expect(edgeRedisUrl, 'EDGE_REDIS_URL required').toBeTruthy()

        server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            if (!req.url) {
                res.statusCode = 404
                res.end()
                return
            }

            if (req.method === 'POST' && req.url === '/api/edge/pair') {
                const response = {
                    edgeId: 'edge-test-1',
                    authToken: 'edge-token-1',
                    policyBundle: {
                        allowedConnectors: ['ssh', 'snmp'],
                        maxConcurrency: 3,
                        allowTargets: [],
                        allowedTemplates: ['tpl-1'],
                        blockedCommands: []
                    }
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(response))
                return
            }

            if (req.method === 'GET' && req.url === '/api/edge/jobs/pull') {
                const response = {
                    jobs: [
                        {
                            id: 'job-1',
                            jobType: 'inventory',
                            payload: {
                                templateId: 'tpl-1',
                                target: { ip: '10.0.0.1' },
                                connector: 'ssh',
                                renderedCommands: ['show version']
                            },
                            signature: 'invalid-signature',
                            nonce: 'nonce-1',
                            expiresAt: new Date(Date.now() + 60_000).toISOString()
                        }
                    ]
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(response))
                return
            }

            if (req.method === 'POST' && req.url === '/api/edge/jobs/result') {
                const body = await readBody(req)
                results.push(JSON.parse(body) as MockResult)
                res.statusCode = 200
                res.end()
                return
            }

            res.statusCode = 404
            res.end()
        })

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => resolve())
        })
        const address = server.address()
        if (typeof address === 'object' && address) {
            serverUrl = `http://127.0.0.1:${address.port}`
        }

        pool = createEdgePool({ connectionString: edgeDbUrl })
        redis = await createEdgeRedisClient({ url: edgeRedisUrl })

        app = await buildApp({
            env: {
                CLOUD_BASE_URL: serverUrl,
                EDGE_DB_URL: edgeDbUrl,
                EDGE_REDIS_URL: edgeRedisUrl,
                EDGE_BIND_HOST: '127.0.0.1',
                EDGE_PORT: 3002,
                EDGE_LOCAL_VAULT_KEY: 'test-key',
                EDGE_JOB_SIGNING_PUBLIC_KEY: 'test-key',
                EDGE_TARGET_ALLOWLIST: [],
                EDGE_CONNECTORS_ALLOWED: ['ssh', 'snmp'],
                EDGE_MAX_CONCURRENCY: 3,
                EDGE_JOB_TIMEOUT_MS: 60000,
                EDGE_NONCE_PREFIX: 'edge:nonce:'
            },
            pool,
            redis
        })
    })

    afterAll(async () => {
        await app.close()
        await closeEdgeRedisClient(redis)
        await closeEdgePool(pool)
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error)
                else resolve()
            })
        })
    })

    it('stores and redacts connector configs', async () => {
        await pool.query('TRUNCATE edge_connectors RESTART IDENTITY')

        const update = await app.inject({
            method: 'PUT',
            url: '/api/edge/connectors/ssh',
            payload: {
                config: {
                    username: 'edge-user',
                    password: 'supersecret'
                }
            }
        })

        expect(update.statusCode).toBe(200)

        const response = await app.inject({ method: 'GET', url: '/api/edge/connectors' })
        const body = response.json() as { connectors: Array<{ name: string; config: Record<string, unknown> }> }

        expect(body.connectors[0].name).toBe('ssh')
        expect(body.connectors[0].config.password).toBe('***REDACTED***')

        const dbRow = await pool.query<{ config: Record<string, unknown> }>('SELECT config FROM edge_connectors WHERE name = $1', ['ssh'])
        expect((dbRow.rows[0]?.config as Record<string, unknown>).password).toBe('supersecret')
    })

    it('records failed jobs from polling', async () => {
        results = []
        await pool.query('TRUNCATE edge_jobs RESTART IDENTITY')
        await pool.query('TRUNCATE edge_state RESTART IDENTITY')

        const pair = await app.inject({
            method: 'POST',
            url: '/api/edge/pair',
            payload: {
                pairingCode: 'pair-123',
                name: 'Edge Test'
            }
        })

        expect(pair.statusCode).toBe(200)

        const poll = await app.inject({ method: 'POST', url: '/api/edge/jobs/poll' })
        const payload = poll.json() as { processed: number; results: Array<{ status: string }> }

        expect(payload.processed).toBe(1)
        expect(payload.results[0].status).toBe('failed')
        expect(results).toHaveLength(1)

        const jobRow = await pool.query<{ status: string; error: string | null }>('SELECT status, error FROM edge_jobs WHERE id = $1', ['job-1'])
        expect(jobRow.rows[0]?.status).toBe('failed')
        expect(jobRow.rows[0]?.error).toBeTruthy()
    })
})
