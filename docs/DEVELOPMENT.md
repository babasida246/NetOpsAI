# Development Guide

Coding standards, conventions, and development workflow for NetOpsAI Gateway.

## Table of Contents

- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Adding New Features](#adding-new-features)
- [Package Guidelines](#package-guidelines)
- [Database Operations](#database-operations)
- [Testing Practices](#testing-practices)
- [Build and Run](#build-and-run)

---

## Project Structure

### Monorepo Layout

```
netopsai-gateway/
├── apps/                    # Deployable applications
│   ├── api/                 # Fastify REST API
│   ├── web-ui/              # SvelteKit frontend
│   ├── gateway-mcp/         # MCP server entry
│   └── gateway-cli/         # CLI tools
├── packages/                # Shared libraries
│   ├── domain/              # Business entities
│   ├── application/         # Use cases, services
│   ├── contracts/           # Interfaces, types
│   ├── infra-postgres/      # Database layer
│   ├── infra-redis/         # Cache layer
│   ├── tools/               # Tool registry
│   ├── mcp-servers/         # MCP implementations
│   └── ...
├── docs/                    # Documentation
└── scripts/                 # Build/deploy scripts
```

### Package Import Hierarchy

```
apps/* → packages/application → packages/domain
         packages/application → packages/contracts
         packages/infra-* → packages/contracts
         packages/tools → packages/application
```

**Rule**: Packages only import from packages at the same level or below.

---

## Coding Standards

### TypeScript Configuration

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Service class | PascalCase | `AssetService.ts` |
| Repository | PascalCase | `AssetRepository.ts` |
| Routes | kebab-case.routes | `assets.routes.ts` |
| Tests | `.test.ts` suffix | `AssetService.test.ts` |
| Interfaces | PascalCase with `I` prefix | `IAssetRepository.ts` |

### Code Style

```typescript
// ✅ Good: Explicit types, clear naming
export async function createAsset(
    input: CreateAssetInput,
    ctx: RequestContext
): Promise<Asset> {
    // Implementation
}

// ❌ Bad: Implicit types, unclear naming
export async function create(x: any, c: any) {
    // ...
}
```

### Error Handling

```typescript
import { AppError } from '@domain/core'

// Domain errors
throw AppError.notFound('Asset not found', { assetId })
throw AppError.validation('Invalid status', { field: 'status' })
throw AppError.forbidden('Insufficient permissions')

// Never throw raw Error in business logic
// ❌ throw new Error('Something went wrong')
```

### Async/Await

```typescript
// ✅ Always use async/await
const result = await repository.findById(id)

// ❌ Avoid .then() chains
repository.findById(id).then(result => ...)
```

---

## Adding New Features

### Adding a New Tool

1. **Define tool in registry** (`packages/tools/src/tools/`):

```typescript
// packages/tools/src/tools/my-tool.ts
import { ToolDefinition } from '../types.js'

export const myTool: ToolDefinition = {
    name: 'my_tool',
    description: 'What this tool does',
    category: 'utilities',
    inputSchema: {
        type: 'object',
        properties: {
            param1: { type: 'string', description: 'First parameter' }
        },
        required: ['param1']
    }
}
```

2. **Register in ToolRegistry**:

```typescript
// packages/tools/src/ToolRegistry.ts
import { myTool } from './tools/my-tool.js'

registry.register(myTool)
```

3. **Add executor** if tool has custom logic.

### Adding a New MCP Server

1. **Create server in** `packages/mcp-servers/core/`:

```typescript
// packages/mcp-servers/core/my-server.ts
import { z } from 'zod'
import type { MCPTool } from '../types.js'

export const myServerTools: MCPTool[] = [
    {
        name: 'my_server_action',
        description: 'Description',
        inputSchema: z.object({
            param: z.string()
        }),
        execute: async (input) => {
            // Implementation
            return { success: true, data: result }
        }
    }
]
```

2. **Export from index**:

```typescript
// packages/mcp-servers/index.ts
export * from './core/my-server.js'
```

### Adding a New API Endpoint

1. **Create route file** (`apps/api/src/routes/v1/`):

```typescript
// apps/api/src/routes/v1/my-feature.routes.ts
import type { FastifyInstance } from 'fastify'

export async function myFeatureRoutes(app: FastifyInstance) {
    app.get('/my-feature', {
        schema: {
            response: { 200: { type: 'object' } }
        },
        handler: async (request, reply) => {
            // Implementation
        }
    })
}
```

2. **Register in v1 index**:

```typescript
// apps/api/src/routes/v1/index.ts
import { myFeatureRoutes } from './my-feature.routes.js'

export async function v1Routes(app: FastifyInstance) {
    // ...existing routes
    await app.register(myFeatureRoutes, { prefix: '/my-feature' })
}
```

### Adding a New Repository

1. **Define interface** (`packages/contracts/`):

```typescript
// packages/contracts/src/repositories/IMyRepository.ts
export interface IMyRepository {
    findById(id: string): Promise<MyEntity | null>
    create(input: CreateInput): Promise<MyEntity>
    update(id: string, input: UpdateInput): Promise<MyEntity>
    delete(id: string): Promise<void>
}
```

2. **Implement in infra-postgres**:

```typescript
// packages/infra-postgres/src/repositories/MyRepository.ts
import type { IMyRepository } from '@contracts/repositories'
import type { DatabasePool } from '../types.js'

export class MyRepository implements IMyRepository {
    constructor(private pool: DatabasePool) {}

    async findById(id: string): Promise<MyEntity | null> {
        const result = await this.pool.query(
            'SELECT * FROM my_table WHERE id = $1',
            [id]
        )
        return result.rows[0] || null
    }
}
```

---

## Package Guidelines

### Domain Package

- Pure business logic
- No I/O operations
- No framework dependencies
- Entities, value objects, domain services

```typescript
// packages/domain/src/entities/Asset.ts
export class Asset {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly status: AssetStatus
    ) {}

    canBeDecommissioned(): boolean {
        return this.status !== 'in_use'
    }
}
```

### Application Package

- Use cases and orchestration
- Depends on contracts, not implementations
- No direct database access

```typescript
// packages/application/src/services/AssetService.ts
export class AssetService {
    constructor(
        private repository: IAssetRepository,
        private logger: ILogger
    ) {}

    async createAsset(input: CreateAssetInput): Promise<Asset> {
        this.logger.info('Creating asset', { input })
        return this.repository.create(input)
    }
}
```

### Infrastructure Packages

- Database, cache, external APIs
- Implements contracts interfaces
- Contains I/O operations

```typescript
// packages/infra-postgres/src/repositories/AssetRepository.ts
export class AssetRepository implements IAssetRepository {
    // SQL queries, connection handling
}
```

---

## Database Operations

### Query Pattern

Always use parameterized queries:

```typescript
// ✅ Good: Parameterized
const result = await pool.query(
    'SELECT * FROM assets WHERE id = $1 AND tenant_id = $2',
    [assetId, tenantId]
)

// ❌ Bad: String interpolation (SQL injection risk)
const result = await pool.query(
    `SELECT * FROM assets WHERE id = '${assetId}'`
)
```

### Transaction Pattern

```typescript
const client = await pool.connect()
try {
    await client.query('BEGIN')
    
    await client.query('INSERT INTO ...', [...])
    await client.query('UPDATE ...', [...])
    
    await client.query('COMMIT')
} catch (error) {
    await client.query('ROLLBACK')
    throw error
} finally {
    client.release()
}
```

### Migration Strategy

- Schema defined in `packages/infra-postgres/src/schema.sql`
- Apply changes via Docker init scripts
- For production, use migration tools like `node-pg-migrate`

---

## Testing Practices

### Unit Tests

```typescript
// packages/application/src/services/AssetService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { AssetService } from './AssetService.js'

describe('AssetService', () => {
    it('should create asset', async () => {
        const mockRepo = {
            create: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
        }
        const service = new AssetService(mockRepo, mockLogger)
        
        const result = await service.createAsset({ name: 'Test' })
        
        expect(result.name).toBe('Test')
        expect(mockRepo.create).toHaveBeenCalledOnce()
    })
})
```

### Test File Location

- Co-located with source: `AssetService.test.ts` next to `AssetService.ts`
- Integration tests: `tests/` folder at root

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific package
pnpm --filter @netopsai/application test

# E2E tests
pnpm test:e2e
```

---

## Build and Run

### Development

```bash
# Install dependencies
pnpm install

# Start development (watch mode)
pnpm dev

# Start specific app
pnpm --filter api dev
pnpm --filter web-ui dev
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @netopsai/application build
```

### Type Checking

```bash
# Check all packages
pnpm typecheck

# Watch mode
pnpm typecheck:watch
```

### Linting

```bash
# Lint all
pnpm lint

# Fix issues
pnpm lint:fix
```

---

## Environment Setup

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| pnpm | 8+ | Package manager |
| Docker | 24+ | Containers |
| Git | 2.40+ | Version control |

### VS Code Extensions

Recommended extensions in `.vscode/extensions.json`:

- ESLint
- Prettier
- TypeScript
- Svelte
- Docker
- REST Client

### Environment Variables

See [Getting Started](GETTING_STARTED.md#environment-configuration) for complete list.

---

## Related Documentation

- 🚀 [Getting Started](GETTING_STARTED.md) – Setup guide
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 🧪 [Testing](TESTING.md) – Test strategy
- 🔌 [API Reference](API.md) – Endpoints
