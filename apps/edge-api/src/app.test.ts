import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import type { EdgeRedisClient } from '@infra-edge/redis'
import { buildApp } from './app.js'

describe('edge-api health', () => {
    it('returns ok from /health', async () => {
        const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as Pool
        const redis = { ping: vi.fn().mockResolvedValue('PONG') } as unknown as EdgeRedisClient
        const env = {
            CLOUD_BASE_URL: 'http://cloud.local',
            EDGE_DB_URL: 'postgres://edge@local/db',
            EDGE_REDIS_URL: 'redis://local',
            EDGE_BIND_HOST: '127.0.0.1',
            EDGE_PORT: 3002,
            EDGE_LOCAL_VAULT_KEY: 'test-key',
            EDGE_JOB_SIGNING_PUBLIC_KEY: 'test-key',
            EDGE_TARGET_ALLOWLIST: [],
            EDGE_CONNECTORS_ALLOWED: [],
            EDGE_MAX_CONCURRENCY: 3,
            EDGE_JOB_TIMEOUT_MS: 60000,
            EDGE_NONCE_PREFIX: 'edge:nonce:'
        }
        const app = await buildApp({ pool, redis, env })
        const response = await app.inject({ method: 'GET', url: '/health' })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ status: 'ok', db: 'ok', redis: 'ok' })
        await app.close()
    })
})
