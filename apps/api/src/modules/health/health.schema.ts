/**
 * Health Check Schemas
 */
import { z } from 'zod'

export const healthCheckSchema = z.object({
    status: z.enum(['healthy', 'unhealthy', 'degraded']),
    timestamp: z.string().datetime(),
    version: z.string(),
    uptime: z.number(),
    services: z.object({
        database: z.object({
            status: z.enum(['up', 'down']),
            latency: z.number().optional()
        }),
        redis: z.object({
            status: z.enum(['up', 'down']),
            latency: z.number().optional()
        })
    })
})

export type HealthCheck = z.infer<typeof healthCheckSchema>

export const readinessSchema = z.object({
    ready: z.boolean(),
    checks: z.array(z.object({
        name: z.string(),
        status: z.enum(['pass', 'fail']),
        message: z.string().optional()
    }))
})

export type Readiness = z.infer<typeof readinessSchema>

export const livenessSchema = z.object({
    alive: z.boolean(),
    timestamp: z.string().datetime()
})

export type Liveness = z.infer<typeof livenessSchema>
