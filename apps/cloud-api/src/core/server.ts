/**
 * Server Startup
 * 
 * Initializes dependencies and starts the HTTP server
 */
import { Pool } from 'pg'
import { Redis } from 'ioredis'
import { createApp } from './app.js'
import { env } from '../config/env.js'

async function startServer(): Promise<void> {
    try {
        // Initialize database pool
        const db = new Pool({
            connectionString: env.DATABASE_URL,
            max: env.DATABASE_POOL_MAX
        })

        // Initialize Redis
        const redis = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true
        })

        // Initialize PgClient placeholder - TODO: Fix PgClient import issue
        const pgClient = db // Use Pool directly as PgClient replacement
        // Test connections
        await db.query('SELECT NOW()')
        await redis.ping()

        console.log('✅ Database and Redis connections established')

        // Create app
        const app = await createApp({ db, redis, pgClient })

        // Start server
        const port = env.PORT
        const host = env.HOST

        const address = await app.listen({ port, host })

        console.log(`🚀 Gateway API server running at ${address}`)
        console.log(`📚 API Documentation: ${address}/docs`)
        console.log(`🔍 Health Check: ${address}/health`)

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`)

            try {
                await app.close()
                await db.end()
                await redis.quit()
                console.log('✅ Server shut down successfully')
                process.exit(0)
            } catch (error) {
                console.error('❌ Error during shutdown:', error)
                process.exit(1)
            }
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

    } catch (error) {
        console.error('❌ Failed to start server:', error)
        process.exit(1)
    }
}

// Export for main.js to use
// Note: Auto-execution removed to prevent double-execution when imported

export { startServer }