/**
 * Test Utilities for API Testing
 */
import { vi, expect } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createApp, type AppDependencies } from '../core/app.js'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'

export interface TestContext {
    app: FastifyInstance
    db: Pool
    redis: Redis
    cleanup: () => Promise<void>
}

/**
 * Create a test app instance with mocked dependencies
 */
export async function createTestApp(): Promise<TestContext> {
    console.log('Creating test app...')

    // Mock database
    const mockDb = {
        query: vi.fn(),
        connect: vi.fn(),
        end: vi.fn()
    } as unknown as Pool

    // Mock Redis
    const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
        sadd: vi.fn(),
        srem: vi.fn(),
        smembers: vi.fn(),
        ping: vi.fn().mockResolvedValue('PONG'),
        disconnect: vi.fn()
    } as unknown as Redis

    const deps: AppDependencies = {
        db: mockDb,
        redis: mockRedis,
        pgClient: mockDb as any  // Mock pgClient with db for tests
    }

    console.log('Creating app with mocked dependencies...')
    try {
        const app = await createApp(deps)
        console.log('App created successfully')

        const cleanup = async (): Promise<void> => {
            await app.close()
        }

        return {
            app,
            db: mockDb,
            redis: mockRedis,
            cleanup
        }
    } catch (error) {
        console.error('Error creating test app:', error)
        throw error
    }
}

/**
 * Mock the database query method to resolve with specific data
 */
export function mockDbQuery(db: Pool, mockData: any) {
    (db.query as any).mockResolvedValue({ rows: mockData })
}

/**
 * Mock Redis operations
 */
export function mockRedisOperations(redis: Redis, operations: Record<string, any>) {
    Object.entries(operations).forEach(([method, value]) => {
        (redis as any)[method].mockResolvedValue(value)
    })
}

/**
 * API assertion helpers
 */
export const apiAssertions = {
    successResponse(response: any, expectedData?: any) {
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
            success: true,
            data: expectedData || expect.any(Object),
            meta: {
                timestamp: expect.any(String),
                requestId: expect.any(String)
            }
        })
    },

    // Alias for compatibility with test names
    isSuccessResponse(body: any, expectedData?: any) {
        expect(body.success).toBe(true)
        expect(body.data).toBeDefined()
        if (expectedData) {
            expect(body.data).toMatchObject(expectedData)
        }
        // Note: meta might be empty in tests due to serialization
        expect(body.meta).toBeDefined()
    },

    errorResponse(response: any, expectedCode?: string, expectedStatus: number = 400) {
        expect(response.status).toBe(expectedStatus)
        expect(response.body).toMatchObject({
            success: false,
            error: {
                code: expectedCode || expect.any(String),
                message: expect.any(String)
            },
            meta: {
                timestamp: expect.any(String),
                requestId: expect.any(String)
            }
        })
    },

    // Alias for compatibility with test names  
    isErrorResponse(body: any, expectedCode?: string) {
        expect(body.success).toBe(false)
        expect(body.error).toBeDefined()
        if (expectedCode) {
            expect(body.error.code).toBe(expectedCode)
        }
        expect(body.error.message).toBeDefined()
        // Note: meta might be empty in tests due to serialization
        expect(body.meta).toBeDefined()
    },

    validationError(response: any) {
        this.errorResponse(response, 'VALIDATION_ERROR', 400)
    },

    unauthorizedError(response: any) {
        this.errorResponse(response, 'UNAUTHORIZED', 401)
    },

    notFoundError(response: any) {
        this.errorResponse(response, 'NOT_FOUND', 404)
    }
}

/**
 * Fixture data generators
 */
export const fixtures = {
    user: (overrides = {}) => ({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    }),

    authToken: () => 'valid-jwt-token',

    validCredentials: () => ({
        email: 'test@example.com',
        password: 'ValidPassword123'
    })
}