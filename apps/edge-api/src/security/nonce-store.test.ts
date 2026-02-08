import { describe, expect, it } from 'vitest'
import { createNonceStore } from './nonce-store.js'

describe('nonce store', () => {
    it('rejects replayed nonces', async () => {
        const store = createNonceStore()
        const expiresAt = new Date(Date.now() + 60_000).toISOString()

        const first = await store.storeNonce('nonce-1', expiresAt)
        const second = await store.storeNonce('nonce-1', expiresAt)
        const used = await store.isNonceUsed('nonce-1')

        expect(first).toBe(true)
        expect(second).toBe(false)
        expect(used).toBe(true)
    })

    it('ignores expired nonces', async () => {
        const store = createNonceStore()
        const expired = new Date(Date.now() - 1000).toISOString()

        const stored = await store.storeNonce('nonce-expired', expired)
        const used = await store.isNonceUsed('nonce-expired')

        expect(stored).toBe(false)
        expect(used).toBe(false)
    })
})
