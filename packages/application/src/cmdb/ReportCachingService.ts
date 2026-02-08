/**
 * Redis Caching Service
 * Wraps report services with Redis caching (15-minute TTL)
 */

import { createClient, type RedisClientType } from 'redis'
import type { CiInventoryReportService } from './CiInventoryReportService.js'
import type { RelationshipAnalyticsService } from './RelationshipAnalyticsService.js'
import type { AuditTrailService } from './AuditTrailService.js'

export interface CacheConfig {
    redisUrl?: string
    ttlSeconds?: number
    enabled?: boolean
}

/**
 * Report Caching Service
 * Provides Redis-backed caching for CMDB reports
 * Default TTL: 15 minutes
 */
export class ReportCachingService {
    private redis: RedisClientType | null = null
    private readonly ttl: number
    private enabled: boolean

    constructor(config: CacheConfig = {}) {
        this.ttl = config.ttlSeconds ?? 15 * 60 // 15 minutes default
        this.enabled = config.enabled ?? true
    }

    /**
     * Initialize Redis connection
     */
    async initialize(redisUrl?: string): Promise<void> {
        if (!this.enabled) return

        try {
            const url = redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
            this.redis = createClient({ url })

            this.redis.on('error', (err) => {
                console.error('Redis Client Error', err)
            })

            this.redis.on('connect', () => {
                console.log('Redis Client Connected')
            })

            await this.redis.connect()
            await this.redis.ping()
        } catch (error) {
            console.error('Failed to initialize Redis:', error)
            await this.disableCache(error)
        }
    }

    /**
     * Disconnect Redis
     */
    async disconnect(): Promise<void> {
        if (this.redis) {
            await this.redis.disconnect()
        }
    }

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.enabled || !this.redis) return null

        try {
            const cached = await this.redis.get(key)
            if (cached) {
                return JSON.parse(cached) as T
            }
            return null
        } catch (error) {
            console.error(`Cache get error for key ${key}:`, error)
            await this.disableCache(error)
            return null
        }
    }

    /**
     * Set cached value with TTL
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (!this.enabled || !this.redis) return

        try {
            const ttlValue = ttl ?? this.ttl
            await this.redis.setEx(key, ttlValue, JSON.stringify(value))
        } catch (error) {
            console.error(`Cache set error for key ${key}:`, error)
            await this.disableCache(error)
        }
    }

    /**
     * Delete cached value
     */
    async delete(key: string): Promise<void> {
        if (!this.enabled || !this.redis) return

        try {
            await this.redis.del(key)
        } catch (error) {
            console.error(`Cache delete error for key ${key}:`, error)
            await this.disableCache(error)
        }
    }

    /**
     * Clear all cache with prefix
     */
    async clearByPrefix(prefix: string): Promise<void> {
        if (!this.enabled || !this.redis) return

        try {
            const keys = await this.redis.keys(`${prefix}:*`)
            if (keys.length > 0) {
                await this.redis.del(keys)
            }
        } catch (error) {
            console.error(`Cache clear prefix error for ${prefix}:`, error)
            await this.disableCache(error)
        }
    }

    /**
     * Check if cache is enabled
     */
    isEnabled(): boolean {
        return this.enabled && this.redis !== null
    }

    private async disableCache(error: unknown): Promise<void> {
        if (!this.isAuthError(error)) return
        this.enabled = false
        if (this.redis) {
            try {
                await this.redis.disconnect()
            } catch (disconnectError) {
                console.error('Failed to disconnect Redis:', disconnectError)
            }
        }
        this.redis = null
    }

    private isAuthError(error: unknown): boolean {
        if (!(error instanceof Error)) return false
        const message = error.message.toLowerCase()
        return message.includes('noauth') || message.includes('wrongpass')
    }
}

/**
 * Cached CI Inventory Report Service
 * Wraps original service with caching layer
 */
export class CachedCiInventoryReportService {
    private cache: ReportCachingService

    constructor(
        private originalService: CiInventoryReportService,
        cache: ReportCachingService
    ) {
        this.cache = cache
    }

    async generateCiInventoryReport() {
        const cacheKey = 'report:ci-inventory'

        // Try to get from cache first
        const cached = await this.cache.get(cacheKey)
        if (cached) {
            console.log('Cache hit for CI Inventory Report')
            return cached
        }

        // Generate fresh report
        console.log('Cache miss - generating CI Inventory Report')
        const report = await this.originalService.generateCiInventoryReport()

        // Cache the result
        await this.cache.set(cacheKey, report)

        return report
    }
}

/**
 * Cached Relationship Analytics Service
 * Wraps original service with caching layer
 */
export class CachedRelationshipAnalyticsService {
    private cache: ReportCachingService

    constructor(
        private originalService: RelationshipAnalyticsService,
        cache: ReportCachingService
    ) {
        this.cache = cache
    }

    async generateAnalyticsReport() {
        const cacheKey = 'report:relationship-analytics'

        // Try to get from cache first
        const cached = await this.cache.get(cacheKey)
        if (cached) {
            console.log('Cache hit for Relationship Analytics Report')
            return cached
        }

        // Generate fresh report
        console.log('Cache miss - generating Relationship Analytics Report')
        const report = await this.originalService.generateAnalyticsReport()

        // Cache the result
        await this.cache.set(cacheKey, report)

        return report
    }
}

/**
 * Cached Audit Trail Service
 * Wraps original service with caching layer
 */
export class CachedAuditTrailService {
    private cache: ReportCachingService

    constructor(
        private originalService: AuditTrailService,
        cache: ReportCachingService
    ) {
        this.cache = cache
    }

    async generateAuditTrailReport(ciId?: string, startDate?: Date, endDate?: Date) {
        // Build cache key based on parameters
        const params = [ciId, startDate?.toISOString(), endDate?.toISOString()].filter(Boolean).join(':')
        const cacheKey = params ? `report:audit-trail:${params}` : 'report:audit-trail'

        // Try to get from cache first
        const cached = await this.cache.get(cacheKey)
        if (cached) {
            console.log(`Cache hit for Audit Trail Report (${cacheKey})`)
            return cached
        }

        // Generate fresh report
        console.log(`Cache miss - generating Audit Trail Report (${cacheKey})`)
        const report = await this.originalService.generateAuditTrailReport(ciId, startDate, endDate)

        // Cache the result
        await this.cache.set(cacheKey, report)

        return report
    }

    /**
     * Invalidate audit trail cache (called when data changes)
     */
    async invalidateCache(): Promise<void> {
        await this.cache.clearByPrefix('report:audit-trail')
    }
}

/**
 * Cache Invalidator
 * Handles cache invalidation when data changes
 */
export class CacheInvalidator {
    private cache: ReportCachingService

    constructor(cache: ReportCachingService) {
        this.cache = cache
    }

    /**
     * Invalidate all report caches
     */
    async invalidateAllReports(): Promise<void> {
        console.log('Invalidating all report caches')
        await this.cache.clearByPrefix('report')
    }

    /**
     * Invalidate CI-related caches
     */
    async invalidateCiReports(): Promise<void> {
        console.log('Invalidating CI report caches')
        await this.cache.delete('report:ci-inventory')
        await this.cache.delete('report:relationship-analytics')
    }

    /**
     * Invalidate relationship-related caches
     */
    async invalidateRelationshipReports(): Promise<void> {
        console.log('Invalidating relationship report caches')
        await this.cache.delete('report:relationship-analytics')
    }

    /**
     * Invalidate audit trail cache
     */
    async invalidateAuditTrail(): Promise<void> {
        console.log('Invalidating audit trail cache')
        await this.cache.clearByPrefix('report:audit-trail')
    }
}
