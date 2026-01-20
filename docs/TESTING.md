# Testing Guide

Unit testing, integration testing, and E2E testing strategy for NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Test Framework](#test-framework)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Mocking Strategies](#mocking-strategies)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)

---

## Overview

### Testing Pyramid

```
                    ┌─────────┐
                   │   E2E   │  Few, slow, high confidence
                  └────┬────┘
                 ┌─────┴─────┐
                │ Integration│  Some, medium speed
               └──────┬──────┘
         ┌────────────┴────────────┐
        │        Unit Tests        │  Many, fast, focused
       └───────────────────────────┘
```

### Test Distribution

| Type | Count | Speed | Scope |
|------|-------|-------|-------|
| Unit | 80%+ | < 100ms | Single function/class |
| Integration | 15% | < 5s | Multiple components |
| E2E | 5% | < 30s | Full user flow |

---

## Test Framework

### Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| Playwright | E2E browser testing |
| msw | API mocking |
| Testing Library | Component testing |

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['**/*.test.ts', '**/types/**']
        }
    }
})
```

---

## Unit Testing

### Structure

Tests are co-located with source files:

```
packages/application/src/
├── services/
│   ├── AssetService.ts
│   └── AssetService.test.ts
├── core/
│   ├── PolicyEngine.ts
│   └── PolicyEngine.test.ts
```

### Test Pattern

```typescript
// packages/application/src/services/AssetService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AssetService } from './AssetService.js'

describe('AssetService', () => {
    let service: AssetService
    let mockRepository: MockAssetRepository
    let mockLogger: MockLogger

    beforeEach(() => {
        mockRepository = createMockRepository()
        mockLogger = createMockLogger()
        service = new AssetService(mockRepository, mockLogger)
    })

    describe('createAsset', () => {
        it('should create asset with valid input', async () => {
            // Arrange
            const input = { name: 'Test Asset', categoryId: 'cat-1' }
            mockRepository.create.mockResolvedValue({ id: '1', ...input })

            // Act
            const result = await service.createAsset(input)

            // Assert
            expect(result.name).toBe('Test Asset')
            expect(mockRepository.create).toHaveBeenCalledWith(input)
        })

        it('should throw validation error for empty name', async () => {
            // Arrange
            const input = { name: '', categoryId: 'cat-1' }

            // Act & Assert
            await expect(service.createAsset(input))
                .rejects.toThrow('Name is required')
        })
    })
})
```

### Naming Conventions

```typescript
describe('ClassName', () => {
    describe('methodName', () => {
        it('should [expected behavior] when [condition]', () => {})
        it('should throw [error] when [invalid condition]', () => {})
    })
})
```

### Running Unit Tests

```bash
# All unit tests
pnpm test

# Watch mode
pnpm test:watch

# Specific file
pnpm test AssetService.test.ts

# Specific package
pnpm --filter @netopsai/application test
```

---

## Integration Testing

### Scope

Integration tests verify:
- Multiple components working together
- Database operations (with test database)
- External service integration (mocked)

### Test Database Setup

```typescript
// tests/setup/database.ts
import { Pool } from 'pg'

export async function setupTestDatabase() {
    const pool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL
    })

    // Apply schema
    await pool.query(schema)
    
    return pool
}

export async function cleanupTestDatabase(pool: Pool) {
    await pool.query('TRUNCATE assets, categories CASCADE')
}
```

### Integration Test Example

```typescript
// tests/integration/asset-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../setup/database.js'

describe('Asset Workflow Integration', () => {
    let pool: Pool
    let assetService: AssetService
    let categoryService: CategoryService

    beforeAll(async () => {
        pool = await setupTestDatabase()
        assetService = new AssetService(new AssetRepository(pool))
        categoryService = new CategoryService(new CategoryRepository(pool))
    })

    afterEach(async () => {
        await cleanupTestDatabase(pool)
    })

    afterAll(async () => {
        await pool.end()
    })

    it('should create asset with category', async () => {
        // Create category first
        const category = await categoryService.create({ name: 'Hardware' })

        // Create asset in category
        const asset = await assetService.create({
            name: 'Server 01',
            categoryId: category.id
        })

        // Verify relationship
        const retrieved = await assetService.findById(asset.id)
        expect(retrieved.category.name).toBe('Hardware')
    })
})
```

---

## E2E Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3003',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3003',
        reuseExistingServer: !process.env.CI
    }
})
```

### E2E Test Example

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('should login with valid credentials', async ({ page }) => {
        await page.goto('/login')

        await page.fill('[data-testid="email"]', 'admin@test.com')
        await page.fill('[data-testid="password"]', 'password123')
        await page.click('[data-testid="login-button"]')

        await expect(page).toHaveURL('/dashboard')
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login')

        await page.fill('[data-testid="email"]', 'wrong@test.com')
        await page.fill('[data-testid="password"]', 'wrongpassword')
        await page.click('[data-testid="login-button"]')

        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
    })
})
```

### Running E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# With UI
pnpm playwright test --ui

# Specific browser
pnpm playwright test --project=chromium

# Generate tests
pnpm playwright codegen http://localhost:3003
```

---

## Mocking Strategies

### Creating Mock Objects

```typescript
// tests/mocks/repositories.ts
import { vi } from 'vitest'
import type { IAssetRepository } from '@contracts/repositories'

export function createMockAssetRepository(): IAssetRepository {
    return {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}
```

### Mock Logger

```typescript
// tests/mocks/logger.ts
import { vi } from 'vitest'
import type { ILogger } from '@contracts/shared'

export function createMockLogger(): ILogger {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn().mockReturnThis()
    }
}
```

### Mocking External APIs

```typescript
// Using msw (Mock Service Worker)
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
    rest.get('https://api.openrouter.ai/models', (req, res, ctx) => {
        return res(ctx.json({ data: mockModels }))
    })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Mocking Redis

```typescript
// tests/mocks/redis.ts
import { vi } from 'vitest'

export function createMockRedis() {
    const store = new Map<string, string>()

    return {
        get: vi.fn((key) => Promise.resolve(store.get(key) || null)),
        set: vi.fn((key, value) => {
            store.set(key, value)
            return Promise.resolve('OK')
        }),
        del: vi.fn((key) => {
            store.delete(key)
            return Promise.resolve(1)
        }),
        expire: vi.fn().mockResolvedValue(1)
    }
}
```

---

## Coverage

### Coverage Configuration

```typescript
// vitest.config.ts
{
    coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
            lines: 80,
            branches: 80,
            functions: 80,
            statements: 80
        },
        exclude: [
            '**/*.test.ts',
            '**/types/**',
            '**/index.ts',
            '**/mocks/**'
        ]
    }
}
```

### Running Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Goals

| Package | Target | Focus |
|---------|--------|-------|
| domain | 90%+ | Business logic |
| application | 85%+ | Use cases |
| infra-* | 70%+ | Database queries |
| api routes | 75%+ | Request handling |

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      
      - run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - run: pnpm test:e2e
```

### Pre-commit Hooks

```json
// package.json
{
  "scripts": {
    "precommit": "pnpm lint && pnpm test"
  }
}
```

---

## Best Practices

### Do's

- ✅ Write tests before fixing bugs
- ✅ Keep tests focused and fast
- ✅ Use meaningful test descriptions
- ✅ Clean up test data after each test
- ✅ Mock external dependencies

### Don'ts

- ❌ Don't test implementation details
- ❌ Don't write flaky tests
- ❌ Don't share state between tests
- ❌ Don't test third-party code
- ❌ Don't skip tests permanently

---

## Related Documentation

- 📘 [Development Guide](DEVELOPMENT.md) – Coding standards
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 🚀 [Getting Started](GETTING_STARTED.md) – Setup guide
