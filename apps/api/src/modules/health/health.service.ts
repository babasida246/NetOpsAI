/**
 * Health Check Service
 */
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import type { HealthCheck, Readiness, Liveness } from './health.schema.js'

const startTime = Date.now()

export class HealthService {
    constructor(
        private db: Pool,
        private redis: Redis,
        private version: string = '2.0.0'
    ) { }

    async getHealth(): Promise<HealthCheck> {
        const [dbStatus, redisStatus] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis()
        ])

        const allUp = dbStatus.status === 'up' && redisStatus.status === 'up'
        const anyDown = dbStatus.status === 'down' || redisStatus.status === 'down'

        return {
            status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: this.version,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            services: {
                database: dbStatus,
                redis: redisStatus
            }
        }
    }

    async getReadiness(): Promise<Readiness> {
        const checks = await Promise.all([
            this.checkDatabaseReadiness(),
            this.checkRedisReadiness()
        ])

        return {
            ready: checks.every(c => c.status === 'pass'),
            checks
        }
    }

    getLiveness(): Liveness {
        return {
            alive: true,
            timestamp: new Date().toISOString()
        }
    }

    private async checkDatabase(): Promise<{ status: 'up' | 'down'; latency?: number }> {
        try {
            const start = Date.now()
            await this.db.query('SELECT 1')
            return { status: 'up', latency: Date.now() - start }
        } catch {
            return { status: 'down' }
        }
    }

    private async checkRedis(): Promise<{ status: 'up' | 'down'; latency?: number }> {
        try {
            const start = Date.now()
            await this.redis.ping()
            return { status: 'up', latency: Date.now() - start }
        } catch {
            return { status: 'down' }
        }
    }

    private async checkDatabaseReadiness() {
        try {
            await this.db.query('SELECT 1')
            return { name: 'database', status: 'pass' as const }
        } catch (error) {
            return {
                name: 'database',
                status: 'fail' as const,
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    private async checkRedisReadiness() {
        try {
            await this.redis.ping()
            return { name: 'redis', status: 'pass' as const }
        } catch (error) {
            return {
                name: 'redis',
                status: 'fail' as const,
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}
