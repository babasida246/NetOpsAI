/**
 * Scheduled Report Generation Service
 * Uses Bull queue for automated report generation
 */

import Bull, { type Queue, type Job } from 'bull'
import type { RedisClientType } from 'redis'
import type { CiInventoryReportService } from './CiInventoryReportService.js'
import type { RelationshipAnalyticsService } from './RelationshipAnalyticsService.js'
import type { AuditTrailService } from './AuditTrailService.js'

export interface ScheduledReportConfig {
    ciInventorySchedule?: string // Cron expression (default: daily at 2 AM)
    relationshipAnalyticsSchedule?: string // Cron expression (default: daily at 3 AM)
    auditTrailSchedule?: string // Cron expression (default: daily at 4 AM)
    redisUrl?: string
}

interface ReportJobData {
    reportType: 'ci-inventory' | 'relationship-analytics' | 'audit-trail'
    generatedAt: string
    parameters?: {
        ciId?: string
        startDate?: string
        endDate?: string
    }
}

interface ScheduledReportRecord {
    id: string
    reportType: string
    schedule: string
    lastGeneratedAt?: Date
    nextScheduledAt?: Date
    createdAt: Date
}

/**
 * Report Scheduler
 * Manages scheduled report generation with Bull queue
 */
export class ReportScheduler {
    private queue: Queue<ReportJobData>
    private readonly defaultSchedules = {
        ciInventory: '0 2 * * *', // Daily at 2 AM
        relationshipAnalytics: '0 3 * * *', // Daily at 3 AM
        auditTrail: '0 4 * * *' // Daily at 4 AM
    }

    constructor(
        private ciInventoryService: CiInventoryReportService,
        private relationshipAnalyticsService: RelationshipAnalyticsService,
        private auditTrailService: AuditTrailService,
        redisUrl?: string
    ) {
        const url = redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
        this.queue = new Bull('report-generation', url)
    }

    /**
     * Initialize scheduler with default jobs
     */
    async initialize(config?: ScheduledReportConfig): Promise<void> {
        try {
            // Create scheduled jobs
            const ciInventorySchedule = config?.ciInventorySchedule ?? this.defaultSchedules.ciInventory
            const relationshipAnalyticsSchedule =
                config?.relationshipAnalyticsSchedule ?? this.defaultSchedules.relationshipAnalytics
            const auditTrailSchedule = config?.auditTrailSchedule ?? this.defaultSchedules.auditTrail

            // Remove existing repeat jobs
            const repeatableJobs = await this.queue.getRepeatableJobs()
            for (const job of repeatableJobs) {
                await this.queue.removeRepeatableByKey(job.key)
            }

            // Add new repeat jobs
            console.log(`[Scheduler] Adding CI Inventory Report job (${ciInventorySchedule})`)
            await this.queue.add(
                'ci-inventory',
                { reportType: 'ci-inventory', generatedAt: new Date().toISOString() },
                { repeat: { cron: ciInventorySchedule } }
            )

            console.log(`[Scheduler] Adding Relationship Analytics job (${relationshipAnalyticsSchedule})`)
            await this.queue.add(
                'relationship-analytics',
                { reportType: 'relationship-analytics', generatedAt: new Date().toISOString() },
                { repeat: { cron: relationshipAnalyticsSchedule } }
            )

            console.log(`[Scheduler] Adding Audit Trail Report job (${auditTrailSchedule})`)
            await this.queue.add(
                'audit-trail',
                { reportType: 'audit-trail', generatedAt: new Date().toISOString() },
                { repeat: { cron: auditTrailSchedule } }
            )

            // Setup event handlers
            this.setupEventHandlers()

            console.log('[Scheduler] Report scheduler initialized successfully')
        } catch (error) {
            console.error('[Scheduler] Failed to initialize:', error)
            throw error
        }
    }

    /**
     * Setup event handlers for queue
     */
    private setupEventHandlers(): void {
        this.queue.on('completed', (job) => {
            console.log(`[Queue] Job ${job.id} completed successfully`)
        })

        this.queue.on('failed', (job, error) => {
            console.error(`[Queue] Job ${job.id} failed:`, error.message)
        })

        this.queue.on('error', (error) => {
            console.error('[Queue] Queue error:', error)
        })

        this.queue.on('stalled', (job) => {
            console.warn(`[Queue] Job ${job.id} stalled`)
        })
    }

    /**
     * Start processing jobs
     */
    async startProcessing(): Promise<void> {
        try {
            // Process jobs with queue.process() for Bull v4
            this.queue.process(async (job: Job<ReportJobData>) => {
                console.log(`[Worker] Processing report: ${job.data.reportType}`)

                try {
                    let report: any

                    switch (job.data.reportType) {
                        case 'ci-inventory':
                            report = await this.ciInventoryService.generateCiInventoryReport()
                            break
                        case 'relationship-analytics':
                            report = await this.relationshipAnalyticsService.generateAnalyticsReport()
                            break
                        case 'audit-trail': {
                            const params = job.data.parameters
                            report = await this.auditTrailService.generateAuditTrailReport(
                                params?.ciId,
                                params?.startDate ? new Date(params.startDate) : undefined,
                                params?.endDate ? new Date(params.endDate) : undefined
                            )
                            break
                        }
                        default:
                            throw new Error(`Unknown report type: ${job.data.reportType}`)
                    }

                    console.log(`[Worker] Report ${job.data.reportType} generated successfully`)
                    return { success: true, report }
                } catch (error) {
                    console.error(
                        `[Worker] Failed to generate report ${job.data.reportType}:`,
                        error instanceof Error ? error.message : 'Unknown error'
                    )
                    throw error
                }
            })

            console.log('[Worker] Report processing started')
        } catch (error) {
            console.error('[Worker] Failed to start worker:', error)
            throw error
        }
    }

    /**
     * Stop processing
     */
    async stop(): Promise<void> {
        await this.queue.close()
        console.log('[Scheduler] Report scheduler stopped')
    }

    /**
     * Trigger manual report generation
     */
    async triggerReport(
        reportType: 'ci-inventory' | 'relationship-analytics' | 'audit-trail',
        priority?: number
    ): Promise<Job<ReportJobData>> {
        console.log(`[Scheduler] Triggering manual report: ${reportType}`)

        const job = await this.queue.add(
            reportType,
            { reportType, generatedAt: new Date().toISOString() },
            {
                priority: priority ?? 10, // Higher priority than scheduled jobs
                removeOnComplete: true
            }
        )

        return job
    }

    /**
     * Get queue stats
     */
    async getStats(): Promise<{
        active: number
        waiting: number
        completed: number
        failed: number
        delayed: number
    }> {
        return {
            active: await this.queue.getActiveCount(),
            waiting: await this.queue.getWaitingCount(),
            completed: await this.queue.getCompletedCount(),
            failed: await this.queue.getFailedCount(),
            delayed: await this.queue.getDelayedCount()
        }
    }

    /**
     * Get scheduled jobs
     */
    async getScheduledJobs(): Promise<ScheduledReportRecord[]> {
        const repeatableJobs = await this.queue.getRepeatableJobs()

        return repeatableJobs.map((job) => ({
            id: job.id || job.key,
            reportType: job.name,
            schedule: (job as any).cron ?? 'manual',
            lastGeneratedAt: undefined,
            nextScheduledAt: undefined,
            createdAt: new Date()
        }))
    }

    /**
     * Update schedule for a report type
     */
    async updateSchedule(reportType: string, cronExpression: string): Promise<void> {
        console.log(`[Scheduler] Updating schedule for ${reportType}: ${cronExpression}`)

        // Remove old jobs for this report type
        const repeatableJobs = await this.queue.getRepeatableJobs()
        for (const job of repeatableJobs) {
            if (job.name === reportType) {
                await this.queue.removeRepeatableByKey(job.key)
            }
        }

        // Add new job with updated schedule
        await this.queue.add(reportType as 'ci-inventory' | 'relationship-analytics' | 'audit-trail', {
            reportType: reportType as 'ci-inventory' | 'relationship-analytics' | 'audit-trail',
            generatedAt: new Date().toISOString()
        }, {
            repeat: { cron: cronExpression }
        })

        console.log(`[Scheduler] Schedule updated for ${reportType}`)
    }

    /**
     * Clear all scheduled jobs
     */
    async clearSchedules(): Promise<void> {
        console.log('[Scheduler] Clearing all scheduled jobs')
        const repeatableJobs = await this.queue.getRepeatableJobs()
        for (const job of repeatableJobs) {
            await this.queue.removeRepeatableByKey(job.key)
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const client = this.queue.client
            await client.ping()
            return true
        } catch (error) {
            console.error('[Scheduler] Health check failed:', error)
            return false
        }
    }
}

/**
 * Report Storage Service
 * Stores generated reports for later retrieval
 * (This would typically integrate with a database)
 */
export class ScheduledReportStorage {
    private reports: Map<string, { data: any; timestamp: Date }> = new Map()

    /**
     * Store report result
     */
    async storeReport(reportType: string, data: any): Promise<void> {
        const key = `${reportType}:${Date.now()}`
        this.reports.set(key, { data, timestamp: new Date() })

        // Keep only last 10 reports per type
        const reportKeys = Array.from(this.reports.keys()).filter((k) => k.startsWith(`${reportType}:`))
        if (reportKeys.length > 10) {
            const oldestKey = reportKeys[0]
            this.reports.delete(oldestKey)
        }

        console.log(`[Storage] Report stored: ${key}`)
    }

    /**
     * Retrieve latest report
     */
    async getLatestReport(reportType: string): Promise<{ data: any; timestamp: Date } | null> {
        const reportKeys = Array.from(this.reports.keys())
            .filter((k) => k.startsWith(`${reportType}:`))
            .sort()
            .reverse()

        if (reportKeys.length === 0) return null

        return this.reports.get(reportKeys[0]) ?? null
    }

    /**
     * Get report history
     */
    async getReportHistory(reportType: string, limit: number = 10): Promise<Array<{ data: any; timestamp: Date }>> {
        const reportKeys = Array.from(this.reports.keys())
            .filter((k) => k.startsWith(`${reportType}:`))
            .sort()
            .reverse()
            .slice(0, limit)

        return reportKeys.map((key) => this.reports.get(key) as { data: any; timestamp: Date })
    }

    /**
     * Clear old reports
     */
    async clearOldReports(ageMinutes: number = 1440): Promise<void> {
        // 1440 minutes = 24 hours
        const cutoffTime = new Date(Date.now() - ageMinutes * 60 * 1000)

        let removedCount = 0
        for (const [key, value] of this.reports) {
            if (value.timestamp <= cutoffTime) {
                this.reports.delete(key)
                removedCount++
            }
        }

        console.log(`[Storage] Cleared ${removedCount} old reports`)
    }
}
