# Development Guide

## Code Organization

### Package Structure

```
packages/
├── domain/              # Phase 1: Business domain
│   └── src/core/
│       ├── Message.ts   # Entity
│       ├── Conversation.ts
│       ├── User.ts
│       ├── ComplexityDetector.ts
│       └── AppError.ts  # Shared errors
│
├── contracts/           # Phase 2: Interfaces
│   └── src/
│       ├── llm/         # LLMClient interface
│       ├── repositories/# Repo interfaces
│       └── observability/# Logger interface
│
├── application/         # Phase 2: Orchestration
│   └── src/core/
│       ├── ChatOrchestrator.ts  # Main orchestrator
│       ├── PolicyEngine.ts      # Budget & rate limit
│       ├── RouterEngine.ts      # Complexity → tier
│       ├── QualityChecker.ts    # Assessment
│       └── ExecutorEngine.ts    # Model selection
│
├── infra-postgres/      # Phase 3: Database
│   └── src/
│       ├── PgClient.ts  # Connection pool
│       ├── schema.sql   # Database schema
│       └── repositories/# ConversationRepo, ModelRepo
│
├── infra-redis/         # Phase 3: Caching
│   └── src/
│       ├── RedisClient.ts
│       └── CacheService.ts
│
├── providers/           # Phase 3: LLM providers
│   └── src/
│       ├── OpenRouterClient.ts
│       └── MockLLMClient.ts    # For testing
│
├── observability/       # Phase 3: Logging
│   └── src/
│       └── PinoLogger.ts
│
├── testing/             # Phase 3: Test utilities
│   └── src/
│       ├── mocks/       # In-memory implementations
│       ├── fixtures/    # Test data
│       └── helpers/     # Utility functions
│
└── security/            # RBAC, encryption
    └── src/
        ├── rbac/
        ├── audit/
        └── crypto/
```

### Apps Structure

```
apps/
├── gateway-api/         # Phase 4: REST server
│   └── src/
│       ├── container.ts # DI factory
│       ├── server.ts    # Fastify setup
│       ├── middleware/  # Correlation, errors
│       └── routes/      # v1 & v2 endpoints
│
├── gateway-mcp/         # Phase 4: MCP server
│   └── src/
│       ├── server.ts    # Stdio transport
│       ├── types.ts     # JSON-RPC types
│       └── handlers/    # Handler logic
│
└── gateway-cli/         # Phase 4: CLI tool
    └── src/
        ├── index.ts     # Commander setup
        └── commands/    # status, seed
```

## Code Style Guidelines

### TypeScript

```typescript
// 1. Use strict typing - NO 'any'
// ❌ Bad
const process = (data: any) => { }

// ✅ Good
interface ChatRequest {
  messages: Message[]
  metadata: RequestMetadata
}
const process = (data: ChatRequest) => { }

// 2. Use interfaces for dependencies
// ❌ Bad
export class ChatOrchestrator {
  constructor(private logger: PinoLogger) { }
}

// ✅ Good
export class ChatOrchestrator {
  constructor(private logger: ILogger) { }
}

// 3. Use explicit return types
// ❌ Bad
async execute(request) {
  return this.orchestrator.run(request)
}

// ✅ Good
async execute(request: ChatRequest): Promise<ChatResponse> {
  return this.orchestrator.run(request)
}

// 4. Use const assertions for literals
// ❌ Bad
const role = 'user'

// ✅ Good
const role = 'user' as const
```

### Error Handling

```typescript
// 1. Use custom AppError class
import { AppError } from '@domain/core'

// ✅ Good
if (budget < cost) {
  throw AppError.forbidden('Budget exceeded', { budget, cost })
}

// 2. Catch and re-throw with context
try {
  await this.pgClient.query(sql)
} catch (error) {
  throw AppError.internal('Failed to save', { originalError: error.message })
}

// 3. Log errors with context
this.logger.error('Chat failed', {
  userId: request.metadata.userId,
  correlationId: request.metadata.correlationId,
  error: error.message
})
```

### Testing

```typescript
// 1. Name tests descriptively
describe('PolicyEngine', () => {
  it('allows request within budget', async () => {
    // ✅ Good: Clear what's being tested
  })

  it('should throw when budget exceeded', async () => {
    // ❌ Bad: Too vague
  })
})

// 2. Use AAA pattern (Arrange, Act, Assert)
it('blocks request over budget', async () => {
  // Arrange
  const engine = new PolicyEngine(config, logger)
  engine.trackSpend('user-1', 101)

  // Act
  const action = () => engine.checkBudget('user-1')

  // Assert
  expect(action).rejects.toThrow(AppError)
})

// 3. Test behavior, not implementation
// ❌ Bad
expect(engine.budgets.get('user-1')).toBe(101)

// ✅ Good
const info = engine.getBudgetInfo('user-1')
expect(info.currentSpend).toBe(101)
```

## Building & Testing

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @domain/core build

# Watch mode
pnpm --filter @domain/core build -- --watch

# Production build
pnpm build -- --prod
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific package
pnpm --filter @application/core test

# Watch mode
pnpm --filter @application/core test -- --watch

# Coverage report
pnpm --filter @application/core test -- --coverage

# Specific test file
pnpm --filter @application/core test -- ChatOrchestrator.test.ts
```

## Adding New Features

### Step 1: Domain Layer (if needed)

Create entity in `packages/domain/src/core/`:

```typescript
// packages/domain/src/core/NewEntity.ts
export interface NewEntity {
  id: string
  name: string
  createdAt: Date
}

export function createNewEntity(data: {
  id?: string
  name: string
}): NewEntity {
  if (!data.name || data.name.length < 2) {
    throw new Error('Name must be at least 2 characters')
  }

  return {
    id: data.id || randomUUID(),
    name: data.name,
    createdAt: new Date()
  }
}

// packages/domain/src/index.ts
export { createNewEntity } from './core/NewEntity.js'
export type { NewEntity } from './core/NewEntity.js'
```

### Step 2: Contracts (if needed)

Create interface in `packages/contracts/src/`:

```typescript
// packages/contracts/src/repositories/INewRepo.ts
import type { NewEntity } from '@domain/core'

export interface INewRepo {
  save(entity: NewEntity): Promise<void>
  findById(id: string): Promise<NewEntity | null>
  delete(id: string): Promise<void>
}

// packages/contracts/src/index.ts
export type { INewRepo } from './repositories/INewRepo.js'
```

### Step 3: Infrastructure (if needed)

Create implementation in `packages/infra-postgres/src/repositories/`:

```typescript
// packages/infra-postgres/src/repositories/NewRepo.ts
import type { NewEntity } from '@domain/core'
import type { INewRepo } from '@contracts/shared'
import type { PgClient } from '../PgClient.js'

export class NewRepo implements INewRepo {
  constructor(private pgClient: PgClient) {}

  async save(entity: NewEntity): Promise<void> {
    await this.pgClient.query(
      'INSERT INTO new_entities (id, name, created_at) VALUES ($1, $2, $3)',
      [entity.id, entity.name, entity.createdAt]
    )
  }

  async findById(id: string): Promise<NewEntity | null> {
    const result = await this.pgClient.query(
      'SELECT * FROM new_entities WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  }

  async delete(id: string): Promise<void> {
    await this.pgClient.query(
      'DELETE FROM new_entities WHERE id = $1',
      [id]
    )
  }
}
```

### Step 4: Application (if needed)

Add to orchestrator:

```typescript
// packages/application/src/core/ChatOrchestrator.ts
export class ChatOrchestrator {
  constructor(
    private policyEngine: PolicyEngine,
    private newRepo: INewRepo,  // Add dependency
    private logger: ILogger
  ) {}

  async execute(request: ChatRequest): Promise<ChatResponse> {
    // Use newRepo
    const entity = await this.newRepo.findById(request.id)
    // ...
  }
}
```

### Step 5: Presentation

Add route in `apps/gateway-api/src/routes/`:

```typescript
// apps/gateway-api/src/routes/v1/new.ts
import type { FastifyInstance } from 'fastify'
import type { Container } from '../../container.js'

export async function newRoutes(
  fastify: FastifyInstance,
  { container }: { container: Container }
): Promise<void> {
  fastify.get('/v1/new/:id', async (request, reply) => {
    // Route implementation
  })
}
```

Update container:

```typescript
// apps/gateway-api/src/container.ts
export async function createContainer(): Promise<Container> {
  // ...
  const newRepo = new NewRepo(pgClient)
  
  const chatOrchestrator = new ChatOrchestrator(
    policyEngine,
    newRepo,  // Add dependency
    logger
  )
  
  return { chatOrchestrator, newRepo, ... }
}
```

### Step 6: Tests

```typescript
// packages/application/src/core/ChatOrchestrator.test.ts
describe('ChatOrchestrator with NewEntity', () => {
  it('uses newRepo to fetch entity', async () => {
    const mockNewRepo = {
      findById: vi.fn().mockResolvedValue({ id: '1', name: 'test' })
    }

    const orchestrator = new ChatOrchestrator(
      policyEngine,
      mockNewRepo as any,
      mockLogger
    )

    await orchestrator.execute(request)

    expect(mockNewRepo.findById).toHaveBeenCalledWith(request.id)
  })
})
```

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/apps/gateway-api/src/server.ts",
      "preLaunchTask": "pnpm build",
      "outFiles": ["${workspaceFolder}/apps/gateway-api/dist/**/*.js"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug via tsx

```bash
# Debug with breakpoints
node --inspect-brk node_modules/.bin/tsx apps/gateway-api/src/server.ts
```

## Performance Profiling

### CPU Profiling

```bash
# Generate profile
node --prof apps/gateway-api/dist/server.js

# Process profile
node --prof-process isolate-*.log > profile.txt

# View results
cat profile.txt
```

### Memory Profiling

```bash
# With memory snapshots
node --max-old-space-size=4096 apps/gateway-api/dist/server.js
```

## Documentation

### Comment Style

```typescript
/**
 * Process a chat request with automatic escalation.
 * 
 * @param request - The chat request with messages and metadata
 * @returns Promise resolving to the chat response
 * @throws AppError if budget or rate limit exceeded
 * 
 * @example
 * ```typescript
 * const response = await orchestrator.execute({
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   metadata: { userId: '1', correlationId: 'abc' }
 * })
 * ```
 */
async execute(request: ChatRequest): Promise<ChatResponse> {
  // Implementation
}
```

### Naming Conventions

- **Classes**: PascalCase (ChatOrchestrator, PolicyEngine)
- **Interfaces**: PascalCase with 'I' prefix (ILogger, IConversationRepo)
- **Functions**: camelCase (executeRequest, createMessage)
- **Constants**: UPPER_SNAKE_CASE (DEFAULT_TIMEOUT)
- **Files**: kebab-case (chat-orchestrator.ts, policy-engine.ts)

## Version Management

Current versions:
- TypeScript: 5.3.0
- Node.js: 18+
- pnpm: 8+

Upgrade path:
```bash
# Check outdated packages
pnpm outdated

# Update single package
pnpm update package-name@latest

# Update all
pnpm update -r
```

