import { createClient } from 'redis'

export type EdgeRedisClient = ReturnType<typeof createClient>

export interface EdgeRedisConfig {
    url: string
}

export async function createEdgeRedisClient(config: EdgeRedisConfig): Promise<EdgeRedisClient> {
    const client = createClient({ url: config.url })
    await client.connect()
    return client
}

export async function closeEdgeRedisClient(client: EdgeRedisClient): Promise<void> {
    await client.quit()
}

export function buildRedisKey(prefix: string, key: string): string {
    return `${prefix}${key}`
}

export async function setJson(client: EdgeRedisClient, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value)
    if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, payload, { EX: ttlSeconds })
        return
    }
    await client.set(key, payload)
}

export async function getJson<T>(client: EdgeRedisClient, key: string): Promise<T | null> {
    const value = await client.get(key)
    if (typeof value !== 'string') return null
    return JSON.parse(value) as T
}
