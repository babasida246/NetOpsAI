import type { ICacheRepo } from '@contracts/shared'

export class InMemoryCacheRepo implements ICacheRepo {
    private cache = new Map<string, { value: any; expiresAt: number }>()

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key)
        if (!entry) return null

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }

        return entry.value as T
    }

    async set<T>(key: string, value: T, ttl: number): Promise<void> {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttl * 1000)
        })
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key)
    }

    async exists(key: string): Promise<boolean> {
        const entry = this.cache.get(key)
        if (!entry) return false

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    // Helper for tests
    clear(): void {
        this.cache.clear()
    }

    size(): number {
        return this.cache.size
    }
}
