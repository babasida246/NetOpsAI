type NonceEntry = { expiresAt: number }

const nonces = new Map<string, NonceEntry>()

export function isNonceUsed(nonce: string): boolean {
    const entry = nonces.get(nonce)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
        nonces.delete(nonce)
        return false
    }
    return true
}

export function storeNonce(nonce: string, expiresAt: string): void {
    const expires = new Date(expiresAt).getTime()
    nonces.set(nonce, { expiresAt: expires })
}

export function cleanupNonces(): void {
    const now = Date.now()
    for (const [nonce, entry] of nonces.entries()) {
        if (now > entry.expiresAt) {
            nonces.delete(nonce)
        }
    }
}
