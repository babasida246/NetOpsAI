/**
 * Main Entry Point
 */
import { env } from './config/env.js'
import { buildApp } from './app.js'
import pg from 'pg'
import IORedis from 'ioredis'

const { Pool } = pg

async function main() {
    // Initialize database connection
    const db = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    })

    // Initialize Redis connection
    const redis = new IORedis.default(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true
    })

    try {
        // Test database connection
        await db.query('SELECT 1')
        console.log('✅ Database connected')

        // Test Redis connection
        await redis.connect()
        await redis.ping()
        console.log('✅ Redis connected')

        // Build and start app
        const app = await buildApp({ db, redis })

        await app.listen({
            host: env.HOST,
            port: env.PORT
        })

        console.log(`
🚀 Gateway API v2.0.0 started
   
   Server:  http://${env.HOST}:${env.PORT}
   Docs:    http://${env.HOST}:${env.PORT}/docs
   Health:  http://${env.HOST}:${env.PORT}/health
   
   Environment: ${env.NODE_ENV}
`)

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            console.log(`\n${signal} received, shutting down gracefully...`)

            await app.close()
            await redis.quit()
            await db.end()

            console.log('👋 Goodbye!')
            process.exit(0)
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

    } catch (error) {
        console.error('❌ Failed to start server:', error)
        await redis.quit().catch(() => { })
        await db.end().catch(() => { })
        process.exit(1)
    }
}

main()
