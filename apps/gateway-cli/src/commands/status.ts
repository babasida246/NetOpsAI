import { PgClient } from '@infra/postgres'
import { RedisClient } from '@infra/redis'
import { z } from 'zod'

const EnvSchema = z.object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string()
})

export async function statusCommand() {
    console.log('Checking system status...\n')

    try {
        const env = EnvSchema.parse(process.env)

        // Check Postgres
        const pg = new PgClient({ connectionString: env.DATABASE_URL })
        const pgHealthy = await pg.healthCheck()
        console.log(`✓ Postgres: ${pgHealthy ? 'Connected' : 'Disconnected'}`)
        await pg.close()

        // Check Redis
        const redis = new RedisClient({ url: env.REDIS_URL })
        await redis.connect()
        const redisHealthy = await redis.healthCheck()
        console.log(`✓ Redis: ${redisHealthy ? 'Connected' : 'Disconnected'}`)
        await redis.close()

        // Check OpenRouter (if key exists)
        if (process.env.OPENROUTER_API_KEY) {
            console.log('✓ OpenRouter API Key: Configured')
        } else {
            console.log('✗ OpenRouter API Key: Missing')
        }

        console.log('\nStatus check complete!')
    } catch (error: any) {
        console.error('✗ Status check failed:', error.message)
        process.exit(1)
    }
}
