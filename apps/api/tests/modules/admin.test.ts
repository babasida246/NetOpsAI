/**
 * Admin Module Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminRepository } from '../../src/modules/admin/admin.repository.js'
import { createMockPool, testUser, testAdmin, testSuperAdmin } from '../utils.js'

describe('AdminRepository', () => {
    let adminRepo: AdminRepository
    let mockPool: ReturnType<typeof createMockPool>

    beforeEach(() => {
        mockPool = createMockPool()
        adminRepo = new AdminRepository(mockPool)
    })

    describe('findUsers', () => {
        it('should return paginated users', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ count: '3' }] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: testUser.id,
                            email: testUser.email,
                            name: testUser.name,
                            role: 'user',
                            is_active: true,
                            last_login: null,
                            created_at: new Date(),
                            updated_at: new Date()
                        },
                        {
                            id: testAdmin.id,
                            email: testAdmin.email,
                            name: testAdmin.name,
                            role: 'admin',
                            is_active: true,
                            last_login: new Date(),
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ]
                })

            const result = await adminRepo.findUsers({
                page: 1,
                limit: 20,
                sortOrder: 'desc'
            })

            expect(result.total).toBe(3)
            expect(result.data).toHaveLength(2)
        })

        it('should filter by role', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: testAdmin.id,
                        email: testAdmin.email,
                        name: testAdmin.name,
                        role: 'admin',
                        is_active: true,
                        last_login: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                })

            const result = await adminRepo.findUsers({
                page: 1,
                limit: 20,
                sortOrder: 'desc',
                role: 'admin'
            })

            expect(result.data).toHaveLength(1)
            expect(result.data[0].role).toBe('admin')
        })

        it('should search by email or name', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        name: testUser.name,
                        role: 'user',
                        is_active: true,
                        last_login: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                })

            const result = await adminRepo.findUsers({
                page: 1,
                limit: 20,
                sortOrder: 'desc',
                search: 'test'
            })

            expect(result.data).toHaveLength(1)
        })
    })

    describe('createUser', () => {
        it('should create a new user', async () => {
             (mockPool.query as any).mockResolvedValue({
                rows: [{
                    id: 'new-user-id',
                    email: 'newuser@example.com',
                    name: 'New User',
                    role: 'user',
                    is_active: true,
                    last_login: null,
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            })

            const user = await adminRepo.createUser({
                email: 'newuser@example.com',
                name: 'New User',
                password: 'Password123',
                role: 'user',
                isActive: true
            })

            expect(user.email).toBe('newuser@example.com')
            expect(user.name).toBe('New User')
            expect(user.role).toBe('user')
        })
    })

    describe('updateUser', () => {
        it('should update user role', async () => {
             (mockPool.query as any).mockResolvedValue({
                rows: [{
                    id: testUser.id,
                    email: testUser.email,
                    name: testUser.name,
                    role: 'admin',
                    is_active: true,
                    last_login: null,
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            })

            const user = await adminRepo.updateUser(testUser.id, { role: 'admin' })

            expect(user?.role).toBe('admin')
        })

        it('should deactivate user', async () => {
             (mockPool.query as any).mockResolvedValue({
                rows: [{
                    id: testUser.id,
                    email: testUser.email,
                    name: testUser.name,
                    role: 'user',
                    is_active: false,
                    last_login: null,
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            })

            const user = await adminRepo.updateUser(testUser.id, { isActive: false })

            expect(user?.isActive).toBe(false)
        })
    })

    describe('deleteUser', () => {
        it('should delete user and return true', async () => {
             (mockPool.query as any).mockResolvedValue({ rowCount: 1 })

            const result = await adminRepo.deleteUser(testUser.id)

            expect(result).toBe(true)
        })

        it('should return false when user not found', async () => {
             (mockPool.query as any).mockResolvedValue({ rowCount: 0 })

            const result = await adminRepo.deleteUser('nonexistent')

            expect(result).toBe(false)
        })
    })

    describe('getSystemStats', () => {
        it('should return system statistics', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({
                    rows: [{ total: '100', active: '80', new_today: '5' }]
                })
                .mockResolvedValueOnce({
                    rows: [{ total: '500', active_today: '50' }]
                })
                .mockResolvedValueOnce({
                    rows: [{ total: '10000', today: '500' }]
                })

            const stats = await adminRepo.getSystemStats()

            expect(stats.users.total).toBe(100)
            expect(stats.users.active).toBe(80)
            expect(stats.users.newToday).toBe(5)
            expect(stats.conversations.total).toBe(500)
            expect(stats.messages.total).toBe(10000)
            expect(stats.system.uptime).toBeGreaterThanOrEqual(0)
            expect(stats.system.memoryUsage.percentage).toBeGreaterThanOrEqual(0)
        })
    })

    describe('createAuditLog', () => {
        it('should create an audit log entry', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // resource_id column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // ip_address column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // user_agent column
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'audit-log-id',
                        user_id: testAdmin.id,
                        action: 'create',
                        resource: 'users',
                        resource_id: testUser.id,
                        details: { email: testUser.email },
                        ip_address: '192.168.1.1',
                        user_agent: 'Mozilla/5.0',
                        created_at: new Date()
                    }]
                })

            const log = await adminRepo.createAuditLog({
                userId: testAdmin.id,
                action: 'create',
                resource: 'users',
                resourceId: testUser.id,
                details: { email: testUser.email },
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            })

            expect(log.action).toBe('create')
            expect(log.resource).toBe('users')
            expect(log.userId).toBe(testAdmin.id)
        })
    })

    describe('findAuditLogs', () => {
        it('should return paginated audit logs', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // resource_id column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // ip_address column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // user_agent column
                .mockResolvedValueOnce({ rows: [{ count: '50' }] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 'log-1',
                            user_id: testAdmin.id,
                            action: 'login',
                            resource: 'auth',
                            resource_id: null,
                            details: null,
                            ip_address: '192.168.1.1',
                            user_agent: 'Mozilla/5.0',
                            created_at: new Date()
                        },
                        {
                            id: 'log-2',
                            user_id: testAdmin.id,
                            action: 'create',
                            resource: 'users',
                            resource_id: testUser.id,
                            details: { email: testUser.email },
                            ip_address: '192.168.1.1',
                            user_agent: 'Mozilla/5.0',
                            created_at: new Date()
                        }
                    ]
                })

            const result = await adminRepo.findAuditLogs({
                page: 1,
                limit: 20,
                sortOrder: 'desc'
            })

            expect(result.total).toBe(50)
            expect(result.data).toHaveLength(2)
        })

        it('should filter by action', async () => {
             (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // resource_id column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // ip_address column
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // user_agent column
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'log-1',
                        user_id: testAdmin.id,
                        action: 'login',
                        resource: 'auth',
                        resource_id: null,
                        details: null,
                        ip_address: '192.168.1.1',
                        user_agent: 'Mozilla/5.0',
                        created_at: new Date()
                    }]
                })

            const result = await adminRepo.findAuditLogs({
                page: 1,
                limit: 20,
                sortOrder: 'desc',
                action: 'login'
            })

            expect(result.data[0].action).toBe('login')
        })
    })
})
