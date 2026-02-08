/**
 * Admin Routes
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AdminRepository } from './admin.repository.js'
import {
    adminUserSchema,
    createAdminUserSchema,
    updateAdminUserSchema,
    listUsersQuerySchema,
    systemStatsSchema,
    auditLogSchema,
    listAuditLogsQuerySchema
} from './admin.schema.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { z } from 'zod'
import { UnauthorizedError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors/http-errors.js'
import { calculatePagination } from '../../shared/utils/helpers.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import type { AuthService } from '../auth/auth.service.js'

export async function adminRoutes(
    fastify: FastifyInstance,
    adminRepo: AdminRepository,
    authService: AuthService
): Promise<void> {
    const safeAuditLog = async (
        request: FastifyRequest,
        payload: Parameters<AdminRepository['createAuditLog']>[0]
    ) => {
        try {
            await adminRepo.createAuditLog(payload)
        } catch (error) {
            request.log.error({ error }, 'Failed to write audit log')
        }
    }
    // Admin authentication hook - requires admin or super_admin role
    const authenticateAdmin = async (request: FastifyRequest) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        const payload = authService.verifyAccessToken(token)

        if (payload.role !== 'admin' && payload.role !== 'super_admin') {
            throw new ForbiddenError('Admin access required')
        }

        request.user = { ...payload, id: payload.sub }
    }

    // Super admin only hook
    const authenticateSuperAdmin = async (request: FastifyRequest) => {
        await authenticateAdmin(request)

        if (request.user?.role !== 'super_admin') {
            throw new ForbiddenError('Super admin access required')
        }
    }

    // ==================== Users Management ====================

    // GET /admin/users - List users
    fastify.get('/admin/users', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const query = listUsersQuerySchema.parse(request.query)
        const { data, total } = await adminRepo.findUsers(query)
        const meta = calculatePagination(query.page, query.limit, total)

        // Log audit
        await safeAuditLog(request, {
            userId: request.user!.sub,
            action: 'list',
            resource: 'users',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        })

        return reply.status(200).send({ data, meta })
    })

    // POST /admin/users - Create user
    fastify.post('/admin/users', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const data = createAdminUserSchema.parse(request.body)

        try {
            const user = await adminRepo.createUser(data)

            // Log audit
            await safeAuditLog(request, {
                userId: request.user!.sub,
                action: 'create',
                resource: 'users',
                resourceId: user.id,
                details: { email: data.email, role: data.role },
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })

            return reply.status(201).send(user)
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                throw new ConflictError('Email already exists')
            }
            throw error
        }
    })

    // GET /admin/users/:id - Get user
    fastify.get('/admin/users/:id', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await adminRepo.findUserById(id)

        if (!user) {
            throw new NotFoundError('User not found')
        }

        return reply.status(200).send(user)
    })

    // PATCH /admin/users/:id - Update user
    fastify.patch('/admin/users/:id', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const data = updateAdminUserSchema.parse(request.body)

        const user = await adminRepo.updateUser(id, data)

        if (!user) {
            throw new NotFoundError('User not found')
        }

        // Log audit
        await safeAuditLog(request, {
            userId: request.user!.sub,
            action: 'update',
            resource: 'users',
            resourceId: id,
            details: data,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        })

        return reply.status(200).send(user)
    })

    // DELETE /admin/users/:id - Delete user
    fastify.delete('/admin/users/:id', {
        preHandler: authenticateSuperAdmin
    }, async (request, reply) => {
        const { id } = request.params as { id: string }

        // Prevent self-deletion
        if (id === request.user!.sub) {
            throw new ForbiddenError('Cannot delete your own account')
        }

        const deleted = await adminRepo.deleteUser(id)

        if (!deleted) {
            throw new NotFoundError('User not found')
        }

        // Log audit
        await safeAuditLog(request, {
            userId: request.user!.sub,
            action: 'delete',
            resource: 'users',
            resourceId: id,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        })

        return reply.status(200).send({ success: true, message: 'User deleted' })
    })

    // POST /admin/users/:id/reset-password - Reset user password
    fastify.post('/admin/users/:id/reset-password', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { newPassword } = request.body as { newPassword: string }

        const updated = await adminRepo.resetUserPassword(id, newPassword)

        if (!updated) {
            throw new NotFoundError('User not found')
        }

        // Log audit
        await safeAuditLog(request, {
            userId: request.user!.sub,
            action: 'reset_password',
            resource: 'users',
            resourceId: id,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        })

        return reply.status(200).send({ success: true, message: 'Password reset successfully' })
    })

    // ==================== System Stats ====================

    // GET /admin/stats - Get system stats
    fastify.get('/admin/stats', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const stats = await adminRepo.getSystemStats()
        return reply.status(200).send(stats)
    })

    // ==================== Audit Logs ====================

    // GET /admin/audit-logs - List audit logs
    fastify.get('/admin/audit-logs', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const query = listAuditLogsQuerySchema.parse(request.query)
        const { data, total } = await adminRepo.findAuditLogs(query)
        const meta = calculatePagination(query.page, query.limit, total)

        return reply.status(200).send({ data, meta })
    })

    // ==================== Unified Audit (Drivers/Docs) ====================

    // GET /audit - Unified audit endpoint (compatible with drivers/docs spec)
    fastify.get('/audit', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const raw = request.query as Record<string, unknown>
        const query = listAuditLogsQuerySchema.parse({
            ...raw,
            userId: (raw.userId ?? raw.actor) as any,
            startDate: (raw.startDate ?? raw.from) as any,
            endDate: (raw.endDate ?? raw.to) as any
        })

        const { data, total } = await adminRepo.findAuditLogs(query)
        const meta = calculatePagination(query.page, query.limit, total)
        return reply.status(200).send({ data, meta })
    })

    // GET /audit/:id - Audit detail
    fastify.get('/audit/:id', {
        preHandler: authenticateAdmin
    }, async (request, reply) => {
        const paramsSchema = z.object({ id: z.string().uuid() })
        const { id } = paramsSchema.parse(request.params)
        const entry = await adminRepo.findAuditLogById(id)
        if (!entry) {
            throw new NotFoundError('Audit entry not found')
        }
        return reply.status(200).send({ data: entry })
    })
}


