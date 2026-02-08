import type { EdgeRedisClient } from '@infra-edge/redis'

export type NonceStore = {
    isNonceUsed: (nonce: string) => Promise<boolean>
    storeNonce: (nonce: string, expiresAt: string) => Promise<boolean>
}

type NonceEntry = { expiresAt: number }

export function createNonceStore(redis?: EdgeRedisClient, prefix = 'edge:nonce:'): NonceStore {
    if (redis) {
        return {
            async isNonceUsed(nonce: string): Promise<boolean> {
                const exists = await redis.exists(`${prefix}${nonce}`)
                return exists > 0
            },
            async storeNonce(nonce: string, expiresAt: string): Promise<boolean> {
                const ttlSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
                if (ttlSeconds <= 0) return false
                const result = await redis.set(`${prefix}${nonce}`, '1', { NX: true, EX: ttlSeconds })
                return result === 'OK'
            }
        }
    }

    const nonces = new Map<string, NonceEntry>()

    function cleanup(now: number): void {
        for (const [nonce, entry] of nonces.entries()) {
            if (now > entry.expiresAt) {
                nonces.delete(nonce)
            }
        }
    }

    return {
        async isNonceUsed(nonce: string): Promise<boolean> {
            const now = Date.now()
            cleanup(now)
            const entry = nonces.get(nonce)
            return Boolean(entry && entry.expiresAt > now)
        },
        async storeNonce(nonce: string, expiresAt: string): Promise<boolean> {
            const now = Date.now()
            cleanup(now)
            const expires = new Date(expiresAt).getTime()
            if (expires <= now) return false
            if (nonces.has(nonce)) return false
            nonces.set(nonce, { expiresAt: expires })
            return true
        }
    }
}
