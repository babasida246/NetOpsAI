/**
 * Authentication Module Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import { AuthService } from '../../src/modules/auth/auth.service.js'
import { UserRepository } from '../../src/modules/auth/user.repository.js'
import { SessionRepository } from '../../src/modules/auth/session.repository.js'
import { createMockPool, createMockRedis, testUser } from '../utils.js'
import { UnauthorizedError, ConflictError, BadRequestError } from '../../src/shared/errors/http-errors.js'

describe('AuthService', () => {
    let authService: AuthService
    let userRepo: UserRepository
    let sessionRepo: SessionRepository
    let mockPool: ReturnType<typeof createMockPool>
    let mockRedis: ReturnType<typeof createMockRedis>

    const authConfig = {
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d'
    }

    beforeEach(() => {
        mockPool = createMockPool()
        mockRedis = createMockRedis()
        userRepo = new UserRepository(mockPool)
        sessionRepo = new SessionRepository(mockRedis)
        authService = new AuthService(userRepo, sessionRepo, authConfig)
    })

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const passwordHash = await bcrypt.hash(testUser.password, 12)

                ; (mockPool.query as any).mockResolvedValue({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        name: testUser.name,
                        password_hash: passwordHash,
                        role: testUser.role,
                        is_active: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                })

            const result = await authService.login({
                email: testUser.email,
                password: testUser.password
            })

            expect(result.accessToken).toBeDefined()
            expect(result.refreshToken).toBeDefined()
            expect(result.user.id).toBe(testUser.id)
            expect(result.user.email).toBe(testUser.email)
            expect(result.expiresIn).toBeGreaterThan(0)
        })

        it('should throw UnauthorizedError for invalid email', async () => {
            ; (mockPool.query as any).mockResolvedValue({ rows: [] })

            await expect(authService.login({
                email: 'nonexistent@example.com',
                password: 'password'
            })).rejects.toThrow(UnauthorizedError)
        })

        it('should throw UnauthorizedError for invalid password', async () => {
            const passwordHash = await bcrypt.hash(testUser.password, 12)

                ; (mockPool.query as any).mockResolvedValue({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        password_hash: passwordHash,
                        is_active: true
                    }]
                })

            await expect(authService.login({
                email: testUser.email,
                password: 'wrongpassword'
            })).rejects.toThrow(UnauthorizedError)
        })

        it('should throw UnauthorizedError for inactive user', async () => {
            const passwordHash = await bcrypt.hash(testUser.password, 12)

                ; (mockPool.query as any).mockResolvedValue({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        password_hash: passwordHash,
                        is_active: false
                    }]
                })

            await expect(authService.login({
                email: testUser.email,
                password: testUser.password
            })).rejects.toThrow(UnauthorizedError)
        })
    })

    describe('register', () => {
        it('should register a new user successfully', async () => {
            // First query checks email existence
            ; (mockPool.query as any)
                .mockResolvedValueOnce({ rows: [{ exists: false }] })
                // Second query creates user
                .mockResolvedValueOnce({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        name: testUser.name,
                        role: 'user',
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                })

            const result = await authService.register({
                email: testUser.email,
                name: testUser.name,
                password: testUser.password,
                confirmPassword: testUser.password
            })

            expect(result.id).toBeDefined()
            expect(result.email).toBe(testUser.email)
            expect(result.name).toBe(testUser.name)
            expect(result.role).toBe('user')
        })

        it('should throw ConflictError when email exists', async () => {
            ; (mockPool.query as any).mockResolvedValue({ rows: [{ exists: true }] })

            await expect(authService.register({
                email: testUser.email,
                name: testUser.name,
                password: testUser.password,
                confirmPassword: testUser.password
            })).rejects.toThrow(ConflictError)
        })
    })

    describe('verifyAccessToken', () => {
        it('should verify a valid token', async () => {
            const passwordHash = await bcrypt.hash(testUser.password, 12)

                ; (mockPool.query as any).mockResolvedValue({
                    rows: [{
                        id: testUser.id,
                        email: testUser.email,
                        name: testUser.name,
                        password_hash: passwordHash,
                        role: testUser.role,
                        is_active: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                })

            const loginResult = await authService.login({
                email: testUser.email,
                password: testUser.password
            })

            const payload = authService.verifyAccessToken(loginResult.accessToken)

            expect(payload.sub).toBe(testUser.id)
            expect(payload.email).toBe(testUser.email)
            expect(payload.type).toBe('access')
        })

        it('should throw UnauthorizedError for invalid token', () => {
            expect(() => authService.verifyAccessToken('invalid-token')).toThrow(UnauthorizedError)
        })
    })

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const currentPasswordHash = await bcrypt.hash('CurrentPassword123', 12)

                ; (mockPool.query as any)
                    .mockResolvedValueOnce({
                        rows: [{
                            id: testUser.id,
                            email: testUser.email,
                            password_hash: currentPasswordHash,
                            is_active: true
                        }]
                    })
                    .mockResolvedValueOnce({ rowCount: 1 })

            await expect(authService.changePassword(testUser.id, {
                currentPassword: 'CurrentPassword123',
                newPassword: 'NewPassword123',
                confirmPassword: 'NewPassword123'
            })).resolves.toBeUndefined()
        })

        it('should throw BadRequestError for wrong current password', async () => {
            const currentPasswordHash = await bcrypt.hash('CurrentPassword123', 12)

                ; (mockPool.query as any).mockResolvedValue({
                    rows: [{
                        id: testUser.id,
                        password_hash: currentPasswordHash,
                        is_active: true
                    }]
                })

            await expect(authService.changePassword(testUser.id, {
                currentPassword: 'WrongPassword',
                newPassword: 'NewPassword123',
                confirmPassword: 'NewPassword123'
            })).rejects.toThrow(BadRequestError)
        })
    })
})
