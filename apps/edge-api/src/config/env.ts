import 'dotenv/config'

function required(name: string, value?: string): string {
    if (!value || value.trim() === '') {
        throw new Error(`Missing required env: ${name}`)
    }
    return value
}

function numberValue(value: string | undefined, fallback: number): number {
    if (!value) return fallback
    const parsed = Number(value)
    return Number.isNaN(parsed) ? fallback : parsed
}

export const env = {
    CLOUD_BASE_URL: required('CLOUD_BASE_URL', process.env.CLOUD_BASE_URL),
    EDGE_DB_URL: required('EDGE_DB_URL', process.env.EDGE_DB_URL),
    EDGE_REDIS_URL: required('EDGE_REDIS_URL', process.env.EDGE_REDIS_URL),
    EDGE_BIND_HOST: process.env.EDGE_BIND_HOST ?? '127.0.0.1',
    EDGE_PORT: numberValue(process.env.EDGE_PORT, 3002),
    EDGE_LOCAL_VAULT_KEY: required('EDGE_LOCAL_VAULT_KEY', process.env.EDGE_LOCAL_VAULT_KEY),
    EDGE_JOB_SIGNING_PUBLIC_KEY: required('EDGE_JOB_SIGNING_PUBLIC_KEY', process.env.EDGE_JOB_SIGNING_PUBLIC_KEY),
    EDGE_TARGET_ALLOWLIST: (process.env.EDGE_TARGET_ALLOWLIST ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    EDGE_CONNECTORS_ALLOWED: (process.env.EDGE_CONNECTORS_ALLOWED ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    EDGE_MAX_CONCURRENCY: numberValue(process.env.EDGE_MAX_CONCURRENCY, 3),
    EDGE_JOB_TIMEOUT_MS: numberValue(process.env.EDGE_JOB_TIMEOUT_MS, 60000),
    EDGE_NONCE_PREFIX: process.env.EDGE_NONCE_PREFIX ?? 'edge:nonce:'
}

export type EdgeEnv = typeof env
