/**
 * Admin Module Schemas
 */
import { z } from 'zod'
import { paginationQuerySchema } from '../../shared/schemas/common.js'

// User management
export const adminUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['user', 'admin', 'super_admin']),
    isActive: z.boolean(),
    lastLogin: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

export type AdminUser = z.infer<typeof adminUserSchema>

export const createAdminUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    password: z.string().min(8),
    role: z.enum(['user', 'admin', 'super_admin']).default('user'),
    isActive: z.boolean().default(true)
})

export type CreateAdminUserRequest = z.infer<typeof createAdminUserSchema>

export const updateAdminUserSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().min(2).max(100).optional(),
    role: z.enum(['user', 'admin', 'super_admin']).optional(),
    isActive: z.boolean().optional()
})

export type UpdateAdminUserRequest = z.infer<typeof updateAdminUserSchema>

export const listUsersQuerySchema = paginationQuerySchema.extend({
    search: z.string().optional(),
    role: z.enum(['user', 'admin', 'super_admin']).optional(),
    isActive: z.coerce.boolean().optional()
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

// System stats
export const systemStatsSchema = z.object({
    users: z.object({
        total: z.number(),
        active: z.number(),
        newToday: z.number()
    }),
    conversations: z.object({
        total: z.number(),
        activeToday: z.number()
    }),
    messages: z.object({
        total: z.number(),
        today: z.number()
    }),
    system: z.object({
        uptime: z.number(),
        memoryUsage: z.object({
            used: z.number(),
            total: z.number(),
            percentage: z.number()
        }),
        cpuUsage: z.number().optional()
    })
})

export type SystemStats = z.infer<typeof systemStatsSchema>

// Audit log
export const auditLogSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid().nullable(),
    action: z.string(),
    resource: z.string(),
    resourceId: z.string().nullable(),
    details: z.record(z.any()).nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    createdAt: z.string().datetime()
})

export type AuditLog = z.infer<typeof auditLogSchema>

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    resource: z.string().optional(),
    resourceId: z.string().optional(),
    q: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
})

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>
