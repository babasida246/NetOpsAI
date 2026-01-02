/**
 * Session Repository
 */
import type { Redis } from 'ioredis'

export interface Session {
    userId: string
    refreshToken: string
    userAgent?: string
    ip?: string
    createdAt: string
    expiresAt: string
}

export class SessionRepository {
    private readonly prefix = 'session:'
    private readonly userSessionsPrefix = 'user_sessions:'

    constructor(
        private redis: Redis,
        private ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
    ) { }

    async create(userId: string, refreshToken: string, metadata?: {
        userAgent?: string
        ip?: string
    }): Promise<Session> {
        const session: Session = {
            userId,
            refreshToken,
            userAgent: metadata?.userAgent,
            ip: metadata?.ip,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString()
        }

        const key = this.prefix + refreshToken
        await this.redis.setex(key, this.ttlSeconds, JSON.stringify(session))

        // Track user's sessions
        await this.redis.sadd(this.userSessionsPrefix + userId, refreshToken)

        return session
    }

    async findByRefreshToken(refreshToken: string): Promise<Session | null> {
        const data = await this.redis.get(this.prefix + refreshToken)
        if (!data) return null
        return JSON.parse(data) as Session
    }

    async delete(refreshToken: string): Promise<void> {
        const session = await this.findByRefreshToken(refreshToken)
        if (session) {
            await this.redis.del(this.prefix + refreshToken)
            await this.redis.srem(this.userSessionsPrefix + session.userId, refreshToken)
        }
    }

    async deleteAllByUserId(userId: string): Promise<number> {
        const tokens = await this.redis.smembers(this.userSessionsPrefix + userId)
        if (tokens.length === 0) return 0

        const pipeline = this.redis.pipeline()
        tokens.forEach(token => pipeline.del(this.prefix + token))
        pipeline.del(this.userSessionsPrefix + userId)
        await pipeline.exec()

        return tokens.length
    }

    async countByUserId(userId: string): Promise<number> {
        return this.redis.scard(this.userSessionsPrefix + userId)
    }
}
