/**
 * Admin Repository
 */
import type { Pool } from 'pg'
import type {
    AdminUser,
    CreateAdminUserRequest,
    UpdateAdminUserRequest,
    ListUsersQuery,
    AuditLog,
    ListAuditLogsQuery,
    SystemStats
} from './admin.schema.js'
import { calculateOffset } from '../../shared/utils/helpers.js'
import bcrypt from 'bcrypt'

interface UserRow {
    id: string
    email: string
    name: string
    role: string
    is_active: boolean
    last_login: Date | null
    created_at: Date
    updated_at: Date
}

interface AuditLogRow {
    id: string
    user_id: string | null
    action: string
    resource: string
    resource_id: string | null
    details: Record<string, any> | null
    ip_address: string | null
    user_agent: string | null
    created_at: Date
}

export class AdminRepository {
    private readonly SALT_ROUNDS = 12

    constructor(private db: Pool) { }

    // User management
    async findUsers(query: ListUsersQuery): Promise<{ data: AdminUser[]; total: number }> {
        const offset = calculateOffset(query.page, query.limit)
        const conditions: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (query.search) {
            conditions.push(`(email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`)
            params.push(`%${query.search}%`)
            paramIndex++
        }

        if (query.role) {
            conditions.push(`role = $${paramIndex}`)
            params.push(query.role)
            paramIndex++
        }

        if (query.isActive !== undefined) {
            conditions.push(`is_active = $${paramIndex}`)
            params.push(query.isActive)
            paramIndex++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const orderBy = `${query.sortBy || 'created_at'} ${query.sortOrder}`

        // Get total count
        const countResult = await this.db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM users ${whereClause}`,
            params
        )
        const total = parseInt(countResult.rows[0].count, 10)

        // Get data
        const dataResult = await this.db.query<UserRow>(
            `SELECT id, email, name, role, is_active, updated_at as last_login, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, query.limit, offset]
        )

        return {
            data: dataResult.rows.map(row => this.mapUser(row)),
            total
        }
    }

    async findUserById(id: string): Promise<AdminUser | null> {
        const result = await this.db.query<UserRow>(
            `SELECT id, email, name, role, is_active, updated_at as last_login, created_at, updated_at
       FROM users WHERE id = $1`,
            [id]
        )
        return result.rows[0] ? this.mapUser(result.rows[0]) : null
    }

    async createUser(data: CreateAdminUserRequest): Promise<AdminUser> {
        const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS)

        const result = await this.db.query<UserRow>(
            `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, is_active, null as last_login, created_at, updated_at`,
            [data.email.toLowerCase(), data.name, passwordHash, data.role, data.isActive]
        )
        return this.mapUser(result.rows[0])
    }

    async updateUser(id: string, data: UpdateAdminUserRequest): Promise<AdminUser | null> {
        const updates: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (data.email !== undefined) {
            updates.push(`email = $${paramIndex}`)
            params.push(data.email.toLowerCase())
            paramIndex++
        }

        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex}`)
            params.push(data.name)
            paramIndex++
        }

        if (data.role !== undefined) {
            updates.push(`role = $${paramIndex}`)
            params.push(data.role)
            paramIndex++
        }

        if (data.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex}`)
            params.push(data.isActive)
            paramIndex++
        }

        if (updates.length === 0) {
            return this.findUserById(id)
        }

        updates.push('updated_at = NOW()')
        params.push(id)

        const result = await this.db.query<UserRow>(
            `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, is_active, updated_at as last_login, created_at, updated_at`,
            params
        )

        return result.rows[0] ? this.mapUser(result.rows[0]) : null
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await this.db.query(
            `DELETE FROM users WHERE id = $1`,
            [id]
        )
        return (result.rowCount || 0) > 0
    }

    async resetUserPassword(id: string, newPassword: string): Promise<boolean> {
        const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS)
        const result = await this.db.query(
            `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
            [passwordHash, id]
        )
        return (result.rowCount || 0) > 0
    }

    // System stats
    async getSystemStats(): Promise<SystemStats> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // User stats
        const userStats = await this.db.query<{ total: string; active: string; new_today: string }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE created_at >= $1) as new_today
      FROM users
    `, [today])

        // Conversation stats
        const convStats = await this.db.query<{ total: string; active_today: string }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE updated_at >= $1) as active_today
      FROM conversations
    `, [today])

        // Message stats
        const msgStats = await this.db.query<{ total: string; today: string }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= $1) as today
      FROM messages
    `, [today])

        const memUsage = process.memoryUsage()

        return {
            users: {
                total: parseInt(userStats.rows[0].total, 10),
                active: parseInt(userStats.rows[0].active, 10),
                newToday: parseInt(userStats.rows[0].new_today, 10)
            },
            conversations: {
                total: parseInt(convStats.rows[0].total, 10),
                activeToday: parseInt(convStats.rows[0].active_today, 10)
            },
            messages: {
                total: parseInt(msgStats.rows[0].total, 10),
                today: parseInt(msgStats.rows[0].today, 10)
            },
            system: {
                uptime: process.uptime(),
                memoryUsage: {
                    used: memUsage.heapUsed,
                    total: memUsage.heapTotal,
                    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
                }
            }
        }
    }

    // Audit logs
    async findAuditLogs(query: ListAuditLogsQuery): Promise<{ data: AuditLog[]; total: number }> {
        const offset = calculateOffset(query.page, query.limit)
        const conditions: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (query.userId) {
            conditions.push(`user_id = $${paramIndex}`)
            params.push(query.userId)
            paramIndex++
        }

        if (query.action) {
            conditions.push(`action = $${paramIndex}`)
            params.push(query.action)
            paramIndex++
        }

        if (query.resource) {
            conditions.push(`resource = $${paramIndex}`)
            params.push(query.resource)
            paramIndex++
        }

        if (query.startDate) {
            conditions.push(`created_at >= $${paramIndex}`)
            params.push(query.startDate)
            paramIndex++
        }

        if (query.endDate) {
            conditions.push(`created_at <= $${paramIndex}`)
            params.push(query.endDate)
            paramIndex++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const orderBy = `${query.sortBy || 'created_at'} ${query.sortOrder}`

        // Get total count
        const countResult = await this.db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
            params
        )
        const total = parseInt(countResult.rows[0].count, 10)

        // Get data
        const dataResult = await this.db.query<AuditLogRow>(
            `SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
       FROM audit_logs ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, query.limit, offset]
        )

        return {
            data: dataResult.rows.map(row => this.mapAuditLog(row)),
            total
        }
    }

    async createAuditLog(data: {
        userId?: string
        action: string
        resource: string
        resourceId?: string
        details?: Record<string, any>
        ipAddress?: string
        userAgent?: string
    }): Promise<AuditLog> {
        const result = await this.db.query<AuditLogRow>(
            `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at`,
            [
                data.userId || null,
                data.action,
                data.resource,
                data.resourceId || null,
                data.details || null,
                data.ipAddress || null,
                data.userAgent || null
            ]
        )
        return this.mapAuditLog(result.rows[0])
    }

    private mapUser(row: UserRow): AdminUser {
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role as any,
            isActive: row.is_active,
            lastLogin: row.last_login?.toISOString() || null,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString()
        }
    }

    private mapAuditLog(row: AuditLogRow): AuditLog {
        return {
            id: row.id,
            userId: row.user_id,
            action: row.action,
            resource: row.resource,
            resourceId: row.resource_id,
            details: row.details,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            createdAt: row.created_at.toISOString()
        }
    }
}
