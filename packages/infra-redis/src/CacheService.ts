import type { ICacheRepo } from '@contracts/shared'
import type { RedisClient } from './RedisClient.js'

export class CacheService implements ICacheRepo {
    constructor(private redis: RedisClient) { }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redis.get(key)
            if (!value) return null

            return JSON.parse(value) as T
        } catch (error) {
            console.error('Cache get error', { key, error })
            return null
        }
    }

    async set<T>(key: string, value: T, ttl: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value)
            await this.redis.set(key, serialized, ttl)
        } catch (error) {
            console.error('Cache set error', { key, error })
            // Don't throw - cache failures shouldn't break app
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.redis.del(key)
        } catch (error) {
            console.error('Cache delete error', { key, error })
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            return await this.redis.exists(key)
        } catch (error) {
            console.error('Cache exists error', { key, error })
            return false
        }
    }

    // Helper: Generate cache key from request
    generateKey(userId: string, messages: any[]): string {
        const content = messages.map(m => m.content).join('|')
        const hash = this.simpleHash(content)
        return `chat:${userId}:${hash}`
    }

    private simpleHash(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return Math.abs(hash).toString(36)
    }
}
