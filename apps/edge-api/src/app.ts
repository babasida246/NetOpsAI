import fastify from 'fastify'
import helmet from '@fastify/helmet'
import type { Pool } from 'pg'
import { createEdgePool, closeEdgePool } from '@infra-edge/db'
import { createEdgeRedisClient, closeEdgeRedisClient, type EdgeRedisClient } from '@infra-edge/redis'
import { edgeRoutes } from './routes/edge.routes.js'
import { env as defaultEnv, type EdgeEnv } from './config/env.js'
import { createNonceStore, type NonceStore } from './security/nonce-store.js'
import { createEdgeSecretsStore } from './storage/edge-secrets.js'
import { createEdgeJobsStore } from './storage/edge-jobs.js'
import { createEdgeConnectorsStore } from './storage/edge-connectors.js'

export type AppOptions = {
    env?: EdgeEnv
    pool?: Pool
    redis?: EdgeRedisClient
    nonceStore?: NonceStore
}

export async function buildApp(options: AppOptions = {}) {
    const env = options.env ?? defaultEnv
    const ownsPool = !options.pool
    const pool = options.pool ?? createEdgePool({ connectionString: env.EDGE_DB_URL })
    const ownsRedis = !options.redis
    const redis = options.redis ?? (await createEdgeRedisClient({ url: env.EDGE_REDIS_URL }))
    const nonceStore = options.nonceStore ?? createNonceStore(redis, env.EDGE_NONCE_PREFIX)

    const secretsStore = createEdgeSecretsStore(pool, env.EDGE_LOCAL_VAULT_KEY)
    const jobsStore = createEdgeJobsStore(pool)
    const connectorsStore = createEdgeConnectorsStore(pool)

    const app = fastify({
        logger: { level: 'info' }
    })

    await app.register(helmet, { contentSecurityPolicy: false })

    app.get('/health', async (_request, reply) => {
        let dbOk = false
        let redisOk = false

        try {
            await pool.query('SELECT 1')
            dbOk = true
        } catch {
            dbOk = false
        }

        try {
            const pong = await redis.ping()
            redisOk = pong === 'PONG'
        } catch {
            redisOk = false
        }

        const status = dbOk && redisOk ? 'ok' : 'degraded'
        if (!dbOk || !redisOk) {
            reply.code(503)
        }

        return {
            status,
            db: dbOk ? 'ok' : 'error',
            redis: redisOk ? 'ok' : 'error'
        }
    })

    await edgeRoutes(app, {
        env,
        secretsStore,
        jobsStore,
        connectorsStore,
        nonceStore
    })

    app.addHook('onClose', async () => {
        if (ownsRedis) {
            await closeEdgeRedisClient(redis)
        }
        if (ownsPool) {
            await closeEdgePool(pool)
        }
    })

    return app
}
