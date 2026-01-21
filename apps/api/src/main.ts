/**
 * Main Entry Point
 */
import { env } from './config/env.js'
import { buildApp } from './app.js'
import pg from 'pg'
import IORedis from 'ioredis'
import bcrypt from 'bcrypt'
import { UserRepository } from './modules/auth/user.repository.js'
import { ChatStatsRepository } from './modules/chat/chat-stats.repository.js'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PgClient } from '@infra/postgres'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
    // Initialize database connection
    const db = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    })

    const pgClient = new PgClient({
        connectionString: env.DATABASE_URL,
        max: 20,
        min: 2,
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
        console.log('Go.. Database connected')

        // Apply schema/migrations (idempotent, optional)
        if (env.DB_BOOTSTRAP !== 'false') {
            await applyBootstrapSchema(db)
        } else {
            console.log('ℹ️  DB_BOOTSTRAP=false; skipping schema bootstrap')
        }

        // Test Redis connection
        await redis.connect()
        await redis.ping()
        console.log('Go.. Redis connected')

        // Bootstrap default admin if configured
        await ensureDefaultAdmin(db)
        // Bootstrap default chat providers/models/rules if missing
        await ensureDefaultChatConfig(db)

        // Build and start app
        const app = await buildApp({ db, redis, pgClient })

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
            await pgClient.close()

            console.log('👋 Goodbye!')
            process.exit(0)
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

    } catch (error) {
        console.error('❌ Failed to start server:', error)
        await redis.quit().catch(() => { })
        await db.end().catch(() => { })
        await pgClient.close().catch(() => { })
        process.exit(1)
    }
}

main()

async function ensureDefaultAdmin(db: pg.Pool) {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        console.log('ℹ️  ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping default admin bootstrap')
        return
    }

    const userRepo = new UserRepository(db)
    const exists = await userRepo.existsByEmail(env.ADMIN_EMAIL)
    if (exists) {
        console.log(`ℹ️  Admin user ${env.ADMIN_EMAIL} already exists`)
        return
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
    await userRepo.create({
        email: env.ADMIN_EMAIL,
        name: env.ADMIN_NAME || 'Default Admin',
        passwordHash,
        role: 'super_admin'
    })

    console.log(`✅  Created default admin user ${env.ADMIN_EMAIL}`)
}

function parseJsonEnv<T>(value: string | undefined, fallback: T): T {
    if (!value) return fallback
    try {
        return JSON.parse(value) as T
    } catch (err) {
        console.warn('⚠️  Failed to parse JSON env, using fallback:', err)
        return fallback
    }
}

async function applyBootstrapSchema(db: pg.Pool) {
    try {
        const schemaPath = resolve(__dirname, '../../../packages/infra-postgres/src/schema.sql')
        const sql = await readFile(schemaPath, 'utf8')
        await db.query(sql)
        console.log('Go.. Database schema applied')
    } catch (err) {
        const pgCode = (err as any)?.code
        // Ignore duplicate object errors so reboots don't fail when schema already exists
        if (pgCode === '42P07' /* duplicate_table/constraint */ || pgCode === '42710' /* duplicate_object */) {
            console.warn('Schema already applied, continuing startup. Detail:', (err as any)?.message || err)
            return
        }
        console.error('Failed to apply bootstrap schema:', err)
        throw err
    }
}
async function ensureDefaultChatConfig(db: pg.Pool) {
    const statsRepo = new ChatStatsRepository(db)

    const providerCount = parseInt((await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM ai_providers')).rows[0].count, 10)
    const modelCount = parseInt((await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM model_configs')).rows[0].count, 10)
    const ruleCount = parseInt((await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM orchestration_rules')).rows[0].count, 10)

    const defaultProviders = parseJsonEnv<Array<any>>(env.CHAT_DEFAULT_PROVIDERS, [
        {
            id: 'openai',
            name: 'OpenAI',
            description: 'OpenAI API',
            apiEndpoint: 'https://api.openai.com/v1',
            authType: 'bearer',
            capabilities: { streaming: true, functions: true, vision: true },
            status: 'active',
            rateLimitPerMinute: 10000,
            apiKey: env.OPENAI_API_KEY
        },
        {
            id: 'anthropic',
            name: 'Anthropic',
            description: 'Claude models',
            apiEndpoint: 'https://api.anthropic.com/v1',
            authType: 'bearer',
            capabilities: { streaming: true, vision: false },
            status: 'active',
            rateLimitPerMinute: 4000,
            apiKey: env.ANTHROPIC_API_KEY
        },
        {
            id: 'google',
            name: 'Google Gemini',
            description: 'Gemini models',
            apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
            authType: 'bearer',
            capabilities: { streaming: true, functions: true, vision: true },
            status: 'active',
            rateLimitPerMinute: 2000,
            apiKey: env.GOOGLE_API_KEY
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            description: 'Unified model router',
            apiEndpoint: 'https://openrouter.ai/api/v1',
            authType: 'bearer',
            capabilities: { streaming: true, functions: true, vision: true },
            status: 'active',
            rateLimitPerMinute: 10000,
            apiKey: env.OPENROUTER_API_KEY
        }
    ])

    const defaultModels = parseJsonEnv<Array<any>>(env.CHAT_DEFAULT_MODELS, [
        {
            id: 'openai/gpt-4o-mini',
            provider: 'openai',
            displayName: 'GPT-4o mini',
            description: 'OpenAI GPT-4o mini',
            tier: 0,
            priority: 10,
            contextWindow: 128000,
            costPer1kInput: 0.150,
            costPer1kOutput: 0.600,
            supportsStreaming: true,
            supportsFunctions: true,
            supportsVision: true,
            enabled: true,
            status: 'active'
        },
        {
            id: 'openai/gpt-4o',
            provider: 'openai',
            displayName: 'GPT-4o',
            description: 'OpenAI GPT-4o',
            tier: 0,
            priority: 20,
            contextWindow: 128000,
            costPer1kInput: 2.500,
            costPer1kOutput: 5.000,
            supportsStreaming: true,
            supportsFunctions: true,
            supportsVision: true,
            enabled: true,
            status: 'active'
        },
        {
            id: 'openrouter/gpt-4o-mini',
            provider: 'openrouter',
            displayName: 'OpenRouter GPT-4o mini',
            description: 'GPT-4o mini via OpenRouter router',
            tier: 0,
            priority: 25,
            contextWindow: 128000,
            costPer1kInput: 0.150,
            costPer1kOutput: 0.600,
            supportsStreaming: true,
            supportsFunctions: true,
            supportsVision: true,
            enabled: true,
            status: 'active'
        },
        {
            id: 'anthropic/claude-3-haiku',
            provider: 'anthropic',
            displayName: 'Claude 3 Haiku',
            description: 'Anthropic Claude 3 Haiku',
            tier: 0,
            priority: 30,
            contextWindow: 200000,
            costPer1kInput: 0.250,
            costPer1kOutput: 1.250,
            supportsStreaming: true,
            supportsFunctions: false,
            supportsVision: false,
            enabled: true,
            status: 'active'
        },
        {
            id: 'google/gemini-1.5-pro',
            provider: 'google',
            displayName: 'Gemini 1.5 Pro',
            description: 'Google Gemini 1.5 Pro',
            tier: 0,
            priority: 40,
            contextWindow: 1000000,
            costPer1kInput: 3.500,
            costPer1kOutput: 10.500,
            supportsStreaming: true,
            supportsFunctions: true,
            supportsVision: true,
            enabled: true,
            status: 'active'
        }
    ])

    const defaultRules = parseJsonEnv<Array<any>>(env.CHAT_DEFAULT_RULES, [
        {
            name: 'Default Fallback',
            description: 'Default fallback sequence for chat',
            strategy: 'fallback',
            priority: 100,
            enabled: true,
            modelSequence: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'openrouter/gpt-4o-mini', 'anthropic/claude-3-haiku']
        }
    ])

    if (providerCount === 0) {
        for (const provider of defaultProviders) {
            const existing = await statsRepo.getProvider(provider.id)
            if (!existing) {
                await statsRepo.createProvider(provider)
            }
        }
        console.log(`✅  Seeded ${defaultProviders.length} providers`)
    }

    if (modelCount === 0) {
        for (const model of defaultModels) {
            const existing = await statsRepo.getModel(model.id)
            if (!existing) {
                await statsRepo.createModel(model)
            }
        }
        console.log(`✅  Seeded ${defaultModels.length} models`)
    }

    if (ruleCount === 0) {
        for (const rule of defaultRules) {
            await statsRepo.createOrchestrationRule({
                name: rule.name,
                description: rule.description,
                strategy: rule.strategy,
                modelSequence: rule.modelSequence,
                conditions: {},
                enabled: rule.enabled,
                priority: rule.priority,
                metadata: {}
            })
        }
        console.log(`✅  Seeded ${defaultRules.length} orchestration rules`)
    }
}






