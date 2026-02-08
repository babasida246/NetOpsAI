type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function enforceRateLimit(key: string, limitPerMinute: number): void {
    const now = Date.now()
    const windowMs = 60_000
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return
    }

    if (bucket.count >= limitPerMinute) {
        throw new Error('Rate limit exceeded')
    }

    bucket.count += 1
}
