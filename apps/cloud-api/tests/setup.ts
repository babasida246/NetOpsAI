/**
 * Test Setup - Configure test environment
 */
import { vi, beforeAll, afterAll, beforeEach } from 'vitest'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'
process.env.HOST = '127.0.0.1'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379/1'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars!!'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars!!'
process.env.JWT_ACCESS_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.LOG_LEVEL = 'error'

// Global test utilities
beforeAll(() => {
    // Setup that runs once before all tests
})

afterAll(() => {
    // Cleanup that runs once after all tests
})

beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
})
