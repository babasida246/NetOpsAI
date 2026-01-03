/**
 * Environment Configuration
 * Validates and exports environment variables with type safety
 */
import { z } from 'zod'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from workspace root
config({ path: resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url(),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32).default('your-access-secret-key-min-32-chars'),
    JWT_REFRESH_SECRET: z.string().min(32).default('your-refresh-secret-key-min-32-chars'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // LLM Providers
    OPENROUTER_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),

    // Default admin bootstrap (optional)
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(6).optional(),
    ADMIN_NAME: z.string().optional(),

    // Bootstrap chat config (JSON strings)
    CHAT_DEFAULT_PROVIDERS: z.string().optional(),
    CHAT_DEFAULT_MODELS: z.string().optional(),
    CHAT_DEFAULT_RULES: z.string().optional(),

    // Logging
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Rate Limiting
    RATE_LIMIT_MAX: z.coerce.number().default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

    // Local development helpers
    MOCK_CHAT_RESPONSES: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
    const parsed = envSchema.safeParse(process.env)

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:')
        console.error(parsed.error.format())
        process.exit(1)
    }

    return parsed.data
}

export const env = validateEnv()

export const isDev = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'
export const isProd = env.NODE_ENV === 'production'
export const mockChat =
    env.MOCK_CHAT_RESPONSES === 'true' ||
    (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GOOGLE_API_KEY && !env.OPENROUTER_API_KEY && isDev)
