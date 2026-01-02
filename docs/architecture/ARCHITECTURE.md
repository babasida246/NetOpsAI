# Architecture Decision Records (ADRs)

## ADR-001: Tiered Model System

### Status
ACCEPTED

### Context
NetOpsAI teams need to balance cost with quality. Different requests have different complexity levels and quality requirements.

### Decision
Implement 4-tier model system:
- **T0**: Free models (default, cost-optimized)
- **T1**: Better free models (escalation first level)
- **T2**: Advanced free models (escalation second level)
- **T3**: Best free models (escalation final level)

### Rationale
1. **Cost Control**: Start with free tier, escalate only when needed
2. **Quality**: Better models available for complex requests
3. **User Choice**: Can override via importance flag
4. **Fairness**: Quality-based escalation benefits all users

### Alternatives Considered
- Single best model: Expensive, wasteful for simple queries
- Random selection: Unpredictable behavior
- User pays per tier: Complexity for users

### Consequences
- Positive: Cost-effective, quality-aware
- Negative: Slightly increased latency due to escalation checks
- Trade-off: Worth it for 25-50% cost savings

---

## ADR-002: Quality-Based Escalation

### Status
ACCEPTED

### Context
We need to ensure responses meet quality standards without unnecessary cost.

### Decision
Implement QualityChecker that assesses:
- **Completeness** (40%): Response length vs request complexity
- **Consistency** (30%): No contradictions in response
- **Format** (20%): Properly formatted response
- **Confidence** (10%): Presence of hedging language

### Rationale
1. **Automatic**: No manual intervention needed
2. **Measurable**: Clear thresholds per tier
3. **Fast**: Quick heuristic-based assessment
4. **Transparent**: Users see quality scores

### Alternatives Considered
- User ratings: Too slow, requires feedback loop
- Statistical models: Complex, hard to explain
- Manual review: Not scalable

### Consequences
- Positive: Ensures minimum quality standards
- Negative: Heuristics may not always be accurate
- Future: Can be improved with ML models

---

## ADR-003: Postgres for Persistence

### Status
ACCEPTED

### Context
Need reliable, ACID-compliant storage for conversations and audit logs.

### Decision
Use PostgreSQL with:
- Connection pooling (PgBouncer or pg client pool)
- JSONB for flexible schema
- UUID for identifiers
- Indexes on frequently queried columns

### Rationale
1. **ACID Compliance**: Critical for audit trails
2. **Maturity**: Battle-tested, stable
3. **Features**: JSONB, arrays, full-text search
4. **Ecosystem**: Great Node.js drivers

### Alternatives Considered
- MongoDB: Simpler but no ACID
- MySQL: Works but less feature-rich
- DynamoDB: AWS-specific, higher cost

### Consequences
- Positive: Reliable, feature-rich
- Negative: Requires more operational knowledge
- Trade-off: Worth it for critical data

---

## ADR-004: Redis for Caching

### Status
ACCEPTED

### Context
Need high-speed cache for frequently accessed data and sessions.

### Decision
Use Redis with:
- TTL-based expiration
- Simple key-value structure
- Connection pooling with retry strategy
- Separate cache repo interface

### Rationale
1. **Speed**: Sub-millisecond response times
2. **Simplicity**: Easy mental model
3. **Standard**: Industry standard for caching
4. **Cost**: Cheap infrastructure

### Alternatives Considered
- Memcached: Simpler but no persistence
- In-memory JS Map: No cross-instance sharing
- Database caching: Slower, expensive

### Consequences
- Positive: Fast, reliable caching
- Negative: Data loss on restart (solvable with RDB)
- Trade-off: Acceptable for cache (not source of truth)

---

## ADR-005: Layered Architecture

### Status
ACCEPTED

### Context
Need to maintain clean code boundaries and enable testing without infrastructure.

### Decision
Implement 5-layer architecture:

```
Presentation (API, MCP, CLI)
    ↓
Application (Orchestration, Business Logic)
    ↓
Domain (Entities, Business Rules)
    ↓
Infrastructure (Repos, Services)
    ↓
Contracts (Interfaces, Types)
```

### Rationale
1. **Separation of Concerns**: Each layer has single responsibility
2. **Testability**: Can mock infrastructure for app tests
3. **Dependency Inversion**: Application depends on interfaces
4. **Scalability**: Easy to change infrastructure

### Alternatives Considered
- Flat structure: Simple but hard to maintain
- Hexagonal: More complex, not needed here
- Clean architecture: Similar but more rigid

### Consequences
- Positive: Clear structure, testable, maintainable
- Negative: Slightly more ceremony
- Trade-off: Worth it for medium+ projects

---

## ADR-006: Dependency Injection

### Status
ACCEPTED

### Context
Need flexible, testable component instantiation.

### Decision
Use constructor-based DI with factory pattern:

```typescript
export async function createContainer(): Promise<Container> {
  const logger = new PinoLogger(...)
  const pgClient = new PgClient(...)
  const redisClient = new RedisClient(...)
  // ... wire dependencies
  return { chatOrchestrator, pgClient, ... }
}
```

### Rationale
1. **Explicit**: Dependencies visible in constructor
2. **Testable**: Easy to inject mocks
3. **Type-safe**: Full TypeScript support
4. **No Framework**: Don't need external DI container

### Alternatives Considered
- No DI: Tight coupling, hard to test
- Decorators/Reflect: Adds complexity
- Service Locator: Hidden dependencies

### Consequences
- Positive: Simple, type-safe, testable
- Negative: Manual wiring, factory pattern boilerplate
- Trade-off: Acceptable for project size

---

## ADR-007: MCP Protocol Support

### Status
ACCEPTED

### Context
Need to integrate with external tools via Model Context Protocol.

### Decision
Implement MCP server via:
- Stdio protocol (JSON-RPC 2.0)
- Standard request/response format
- Error handling per spec
- Tool registry pattern

### Rationale
1. **Standard**: Open protocol, not proprietary
2. **Text-based**: Easy to debug
3. **Streaming**: Supports large responses
4. **Extensible**: Can add more tools easily

### Alternatives Considered
- REST webhooks: Polling overhead
- WebSockets: Complex, not needed
- gRPC: Overkill for this use case

### Consequences
- Positive: Standard integration point
- Negative: Requires separate server process
- Trade-off: Clean separation is worth it

---

## ADR-008: OpenRouter for LLM

### Status
ACCEPTED

### Context
Need access to multiple LLMs without running own models.

### Decision
Use OpenRouter API with:
- Free model tier (no cost)
- Fallback to other models if needed
- Rate limiting per user
- Cost tracking per request

### Rationale
1. **No Infrastructure**: Don't run own models
2. **Multiple Models**: Access to various providers
3. **Free Tier**: Covers needs without cost
4. **Mature Service**: Reliable provider

### Alternatives Considered
- Hugging Face: More setup, less reliable
- ollama: Requires GPU infrastructure
- Direct provider APIs: Higher costs, fragmentation

### Consequences
- Positive: No infrastructure cost, variety of models
- Negative: Depends on external service
- Trade-off: Acceptable for non-critical system

---

## ADR-009: Pino for Logging

### Status
ACCEPTED

### Context
Need structured logging with good performance.

### Decision
Use Pino with:
- Structured JSON logs
- Pretty printing in development
- Log level configuration
- Correlation ID propagation

### Rationale
1. **Performance**: 5x faster than Winston
2. **Structured**: JSON by default, easy to parse
3. **Streaming**: Works well with log aggregators
4. **Simple**: Easy to use, minimal configuration

### Alternatives Considered
- Winston: Good but slower
- Bunyan: Similar but less maintained
- Custom logging: Time-consuming

### Consequences
- Positive: Fast, structured, simple
- Negative: Less formatting flexibility
- Trade-off: Perfect for modern architectures

---

## ADR-010: Fastify for REST API

### Status
ACCEPTED

### Context
Need lightweight HTTP server with good performance.

### Decision
Use Fastify with:
- Plugin system for modularity
- Built-in validation (Zod)
- Error handling hooks
- Request lifecycle hooks

### Rationale
1. **Performance**: 2x faster than Express
2. **Modern**: Built for async/await
3. **Plugins**: Clean architecture
4. **Ecosystem**: Growing set of plugins

### Alternatives Considered
- Express: More mature, slower
- Hono: Newer, less ecosystem
- Koa: Good but less plugins

### Consequences
- Positive: Fast, modern, growing ecosystem
- Negative: Smaller community than Express
- Trade-off: Performance gain worth it

---

## ADR-011: Zod for Validation

### Status
ACCEPTED

### Context
Need type-safe runtime validation with TypeScript support.

### Decision
Use Zod for:
- Input validation in all layers
- Type inference (zod infer<>)
- Custom error messages
- Composable validators

### Rationale
1. **Type-Safe**: Full TypeScript support
2. **Developer Experience**: Fluent API
3. **Performance**: Efficient validation
4. **Ecosystem**: Growing community

### Alternatives Considered
- Joi: Mature but not type-safe
- AJV: Fast but verbose
- io-ts: Type-safe but complex

### Consequences
- Positive: Type-safe, great DX
- Negative: Another dependency
- Trade-off: Worth it for safety

---

## ADR-012: Monorepo with pnpm

### Status
ACCEPTED

### Context
Multiple packages and apps need shared dependencies.

### Decision
Use pnpm workspaces with:
- Separate packages for each layer
- Shared root dependencies
- Workspace protocol (workspace:*)
- Build scripts per package

### Rationale
1. **Efficiency**: Shared dependencies, smaller disk usage
2. **Organization**: Logical separation of code
3. **Reusability**: Packages can be shared
4. **Performance**: pnpm is fastest package manager

### Alternatives Considered
- Yarn workspaces: Good but slower
- Lerna: More complex setup
- Monorepo npm: Not monorepo-native

### Consequences
- Positive: Organized, efficient, fast
- Negative: More to manage than single package
- Trade-off: Worth it for multi-package project

---

## Future Decisions (Phase 5+)

- [ ] ADR-013: Tool Registry & Execution
- [ ] ADR-014: Authentication & Authorization
- [ ] ADR-015: Analytics & Monitoring
- [ ] ADR-016: Multi-tenancy Support
- [ ] ADR-017: Caching Strategy
- [ ] ADR-018: Database Sharding


