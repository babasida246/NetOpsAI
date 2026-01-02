import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCacheRepo } from '@testing/mocks'

describe('CacheService', () => {
    let cache: InMemoryCacheRepo

    beforeEach(() => {
        cache = new InMemoryCacheRepo()
    })

    it('sets and gets value', async () => {
        await cache.set('key1', { data: 'value' }, 60)
        const result = await cache.get('key1')

        expect(result).toEqual({ data: 'value' })
    })

    it('returns null for missing key', async () => {
        const result = await cache.get('nonexistent')
        expect(result).toBeNull()
    })

    it('expires after TTL', async () => {
        await cache.set('key1', 'value', 0) // Expire immediately

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100))

        const result = await cache.get('key1')
        expect(result).toBeNull()
    })

    it('deletes value', async () => {
        await cache.set('key1', 'value', 60)
        await cache.delete('key1')

        const result = await cache.get('key1')
        expect(result).toBeNull()
    })

    it('checks existence', async () => {
        await cache.set('key1', 'value', 60)

        expect(await cache.exists('key1')).toBe(true)
        expect(await cache.exists('nonexistent')).toBe(false)
    })
})
