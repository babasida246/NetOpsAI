/**
 * Test Utilities - Mocks and helpers
 */
import { vi } from 'vitest'
import type { Pool, QueryResult } from 'pg'
import type { Redis } from 'ioredis'
import jwt from 'jsonwebtoken'

// Mock database pool
export function createMockPool(): Pool {
    const mockQuery = vi.fn<any, Promise<QueryResult>>().mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
    })

    return {
        query: mockQuery,
        connect: vi.fn().mockResolvedValue({
            query: mockQuery,
            release: vi.fn()
        }),
        end: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
    } as unknown as Pool
}

// Mock Redis client
export function createMockRedis(): Redis {
    const store = new Map<string, string>()
    const sets = new Map<string, Set<string>>()

    return {
        get: vi.fn((key: string) => Promise.resolve(store.get(key) || null)),
        set: vi.fn((key: string, value: string) => {
            store.set(key, value)
            return Promise.resolve('OK')
        }),
        setex: vi.fn((key: string, _ttl: number, value: string) => {
            store.set(key, value)
            return Promise.resolve('OK')
        }),
        del: vi.fn((key: string) => {
            store.delete(key)
            return Promise.resolve(1)
        }),
        ping: vi.fn().mockResolvedValue('PONG'),
        quit: vi.fn().mockResolvedValue('OK'),
        connect: vi.fn().mockResolvedValue(undefined),
        sadd: vi.fn((key: string, value: string) => {
            if (!sets.has(key)) sets.set(key, new Set())
            sets.get(key)!.add(value)
            return Promise.resolve(1)
        }),
        srem: vi.fn((key: string, value: string) => {
            sets.get(key)?.delete(value)
            return Promise.resolve(1)
        }),
        smembers: vi.fn((key: string) => Promise.resolve([...sets.get(key) || []])),
        scard: vi.fn((key: string) => Promise.resolve(sets.get(key)?.size || 0)),
        pipeline: vi.fn(() => ({
            del: vi.fn().mockReturnThis(),
            exec: vi.fn().mockResolvedValue([])
        }))
    } as unknown as Redis
}

// Generate test JWT token
export function generateTestToken(payload: {
    sub: string
    email: string
    role: string
    type?: 'access' | 'refresh'
}): string {
    return jwt.sign(
        {
            ...payload,
            type: payload.type || 'access'
        },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '1h' }
    )
}

// Test user data
export const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    password: 'TestPassword123',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.3dv.yjJXbTlWkGK', // TestPassword123
    role: 'user' as const
}

export const testAdmin = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const
}

export const testSuperAdmin = {
    id: '323e4567-e89b-12d3-a456-426614174002',
    email: 'superadmin@example.com',
    name: 'Super Admin',
    role: 'super_admin' as const
}

// Test conversation data
export const testConversation = {
    id: '423e4567-e89b-12d3-a456-426614174003',
    userId: testUser.id,
    title: 'Test Conversation',
    model: 'openai/gpt-4o-mini',
    status: 'active' as const,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}

// Test message data
export const testMessage = {
    id: '523e4567-e89b-12d3-a456-426614174004',
    conversationId: testConversation.id,
    role: 'user' as const,
    content: 'Hello, how are you?',
    createdAt: new Date().toISOString()
}
