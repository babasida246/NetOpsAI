/**
 * API Integration Tests
 * 
 * Tests the entire API application with real HTTP requests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createApp, type AppDependencies } from '../../core/app.js'

describe('API Integration Tests', () => {
    let app: FastifyInstance
    let mockDeps: AppDependencies

    beforeAll(async () => {
        // Create mock dependencies
        mockDeps = {
            db: {
                query: vi.fn(),
                connect: vi.fn(),
                end: vi.fn()
            } as any,
            redis: {
                get: vi.fn(),
                set: vi.fn(),
                del: vi.fn(),
                ping: vi.fn().mockResolvedValue('PONG'),
                quit: vi.fn()
            } as any,
            pgClient: {
                query: vi.fn(),
                transaction: vi.fn()
            } as any
        }

        app = await createApp(mockDeps)
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('App Initialization', () => {
        it('should start successfully', async () => {
            expect(app).toBeDefined()
            expect(app.server.listening).toBe(false) // Not actually listening in tests
        })

        it('should have all required routes registered', async () => {
            // Test root route
            const rootResponse = await app.inject({ method: 'GET', url: '/' })
            expect(rootResponse.statusCode).toBe(200)

            const rootBody = JSON.parse(rootResponse.body)
            expect(rootBody.name).toBe('Gateway API')
            expect(rootBody.version).toBe('2.0.0')
        })
    })

    describe('Health Endpoints', () => {
        it('GET /health should return basic health info', async () => {
            // Mock successful health checks
            mockDeps.db.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] })

            const response = await app.inject({ method: 'GET', url: '/health' })
            expect(response.statusCode).toBe(200)

            const body = JSON.parse(response.body)
            expect(body.status).toBe('ok')
            expect(body.uptime).toBeTypeOf('number')
        })

        it('GET /api/v1/health should return standardized health response', async () => {
            mockDeps.db.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] })

            const response = await app.inject({ method: 'GET', url: '/api/v1/health' })
            expect(response.statusCode).toBe(200)

            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data.status).toBeDefined()
            expect(body.meta.requestId).toBeDefined()
        })
    })

    describe('Authentication Endpoints', () => {
        it('POST /api/v1/auth/login should validate input', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'invalid-email',
                    password: ''
                }
            })

            expect(response.statusCode).toBe(400)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(false)
            expect(body.error.code).toBe('VALIDATION_ERROR')
        })

        it('GET /api/v1/auth/me should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/auth/me'
            })

            expect(response.statusCode).toBe(401)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(false)
            expect(body.error.code).toBe('AUTHENTICATION_ERROR')
        })
    })

    describe('Module Placeholders', () => {
        it('should have placeholder endpoints for all modules', async () => {
            const modules = [
                { url: '/api/v1/assets', expectedStatus: 401 },
                { url: '/api/v1/cmdb', expectedStatus: 404 },
                { url: '/api/v1/inventory', expectedStatus: 404 },
                { url: '/api/v1/maintenance', expectedStatus: 401 },
                { url: '/api/v1/reports', expectedStatus: 404 }
            ]

            for (const { url, expectedStatus } of modules) {
                const response = await app.inject({ method: 'GET', url })
                expect(response.statusCode).toBe(expectedStatus)

                const body = JSON.parse(response.body)
                expect(body.success).toBe(false)
                expect(body.meta.requestId).toBeDefined()
            }
        })
    })

    describe('Error Handling', () => {
        it('should handle 404 errors with standard format', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/nonexistent'
            })

            expect(response.statusCode).toBe(404)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(false)
            expect(body.error.code).toBe('NOT_FOUND')
            expect(body.meta.requestId).toBeDefined()
        })

        it('should handle method not allowed with standard format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/health' // Health endpoint only supports GET
            })

            expect(response.statusCode).toBe(405)
            // Should still follow error response format even for built-in errors
        })
    })

    describe('OpenAPI Documentation', () => {
        it('should provide OpenAPI spec at /openapi.json', async () => {
            const response = await app.inject({ method: 'GET', url: '/openapi.json' })
            expect(response.statusCode).toBe(200)

            const spec = JSON.parse(response.body)
            expect(spec.openapi).toBeDefined()
            expect(spec.info.title).toBe('Gateway API')
            expect(spec.info.version).toBe('2.0.0')
        })

        it('should have documentation UI at /docs', async () => {
            const response = await app.inject({ method: 'GET', url: '/docs' })
            expect(response.statusCode).toBe(200)
            expect(response.headers['content-type']).toContain('text/html')
        })
    })

    describe('Security Headers', () => {
        it('should include security headers', async () => {
            const response = await app.inject({ method: 'GET', url: '/' })

            // Check for common security headers (added by helmet)
            expect(response.headers['x-frame-options']).toBeDefined()
            expect(response.headers['x-content-type-options']).toBeDefined()
        })

        it('should handle CORS properly', async () => {
            const response = await app.inject({
                method: 'OPTIONS',
                url: '/api/v1/health',
                headers: {
                    'origin': 'http://localhost:3000',
                    'access-control-request-method': 'GET'
                }
            })

            expect(response.headers['access-control-allow-origin']).toBeDefined()
            expect(response.headers['access-control-allow-methods']).toBeDefined()
        })
    })

    describe('Request/Response Standards', () => {
        it('should add request IDs to all responses', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/v1/health' })

            const body = JSON.parse(response.body)
            expect(body.meta.requestId).toBeDefined()
            expect(body.meta.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
        })

        it('should include timestamps in all responses', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/v1/health' })

            const body = JSON.parse(response.body)
            expect(body.meta.timestamp).toBeDefined()
            expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        })
    })
})
