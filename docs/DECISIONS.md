# Architecture Decision Records

Key technical decisions made during NetOpsAI Gateway development.

## Table of Contents

- [ADR-001: No ORM](#adr-001-no-orm)
- [ADR-002: ioredis over redis](#adr-002-ioredis-over-redis)
- [ADR-003: Tier Escalation for LLM Routing](#adr-003-tier-escalation-for-llm-routing)
- [ADR-004: AJV for Tool Schema Validation](#adr-004-ajv-for-tool-schema-validation)
- [ADR-005: Correlation ID Propagation](#adr-005-correlation-id-propagation)
- [ADR-006: Maximum 250 Lines per File](#adr-006-maximum-250-lines-per-file)
- [ADR-007: Monorepo with pnpm Workspaces](#adr-007-monorepo-with-pnpm-workspaces)
- [ADR-008: Credential Redaction Before LLM](#adr-008-credential-redaction-before-llm)

---

## ADR-001: No ORM

### Status
**Accepted**

### Context
The project requires database access with PostgreSQL. We needed to decide between using an ORM (Prisma, TypeORM, Sequelize) or raw SQL with the `pg` driver.

### Decision
**Use raw SQL with `pg` client directly.**

### Rationale
- **Performance**: ORMs add abstraction overhead; raw SQL is more efficient for complex queries
- **Control**: Full control over query optimization and execution plans
- **Simplicity**: No schema synchronization issues or migration conflicts
- **Learning curve**: Team already familiar with SQL
- **Type safety**: Use Zod for runtime validation instead of ORM models

### Consequences
- ✅ Better query performance
- ✅ Simpler debugging
- ✅ No ORM lock-in
- ❌ More boilerplate for CRUD operations
- ❌ Manual type definitions needed

### Example
```typescript
// Instead of ORM
const assets = await prisma.asset.findMany({ where: { status: 'active' } })

// We use raw SQL
const { rows } = await pool.query(
    'SELECT * FROM assets WHERE status = $1',
    ['active']
)
```

---

## ADR-002: ioredis over redis

### Status
**Accepted**

### Context
Need a Redis client for caching and session management. Options: `redis` (official) vs `ioredis` (community).

### Decision
**Use ioredis as the Redis client.**

### Rationale
- **Features**: Better cluster support, Lua scripting, pipelining
- **API**: More intuitive Promise-based API
- **Stability**: Battle-tested in production at scale
- **TypeScript**: Excellent TypeScript support
- **Resilience**: Built-in reconnection with backoff

### Consequences
- ✅ Better developer experience
- ✅ More features out of the box
- ✅ Good TypeScript support
- ❌ Different from official client API

### Example
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
})

// Pipeline for batch operations
const pipeline = redis.pipeline()
pipeline.get('key1')
pipeline.get('key2')
const results = await pipeline.exec()
```

---

## ADR-003: Tier Escalation for LLM Routing

### Status
**Accepted**

### Context
Supporting multiple LLM providers (OpenRouter, OpenAI, Anthropic) with different cost/capability tradeoffs. Need intelligent routing.

### Decision
**Implement tier-based escalation with automatic fallback.**

### Rationale
- **Cost optimization**: Start with cheaper models, escalate for complex tasks
- **Reliability**: Fallback to alternative providers on failure
- **Quality**: Escalate based on confidence/quality metrics
- **Flexibility**: Rules configurable at runtime

### Tiers
| Tier | Models | Use Case |
|------|--------|----------|
| Tier 1 | Claude Haiku, GPT-3.5 | Simple queries, low cost |
| Tier 2 | Claude Sonnet, GPT-4 | Medium complexity |
| Tier 3 | Claude Opus, GPT-4-turbo | Complex analysis |

### Consequences
- ✅ Optimized costs (30-50% reduction)
- ✅ Better reliability with fallbacks
- ✅ Quality control via escalation rules
- ❌ More complex routing logic
- ❌ Requires quality metrics tracking

---

## ADR-004: AJV for Tool Schema Validation

### Status
**Accepted**

### Context
MCP tools require input validation. Need JSON Schema validation that's fast and standards-compliant.

### Decision
**Use AJV (Another JSON Validator) for tool input validation.**

### Rationale
- **Performance**: Fastest JSON Schema validator
- **Standards**: Full JSON Schema draft-07 support
- **Compilation**: Compile schemas once, validate many times
- **Error messages**: Detailed, actionable error messages
- **Ecosystem**: Used by Fastify for schema validation

### Consequences
- ✅ Consistent validation across tools
- ✅ Fast validation even for complex schemas
- ✅ Detailed error messages
- ❌ Learning curve for JSON Schema

### Example
```typescript
import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })

const validate = ajv.compile({
    type: 'object',
    properties: {
        deviceId: { type: 'string', minLength: 1 },
        commands: { type: 'array', items: { type: 'string' } }
    },
    required: ['deviceId', 'commands']
})

if (!validate(input)) {
    throw new ValidationError(validate.errors)
}
```

---

## ADR-005: Correlation ID Propagation

### Status
**Accepted**

### Context
Distributed system with multiple services. Need to trace requests across components for debugging and monitoring.

### Decision
**Propagate correlation ID via `x-correlation-id` header through all services.**

### Rationale
- **Traceability**: Follow request flow across services
- **Debugging**: Find all logs for a single request
- **Standards**: Common pattern, no vendor lock-in
- **Low overhead**: Just a header, no complex tracing setup

### Implementation
```typescript
// API Gateway creates ID
const correlationId = request.headers['x-correlation-id'] || uuid()

// Logger includes it
const logger = baseLogger.child({ correlationId })

// Propagate to downstream services
await fetch(url, {
    headers: { 'x-correlation-id': correlationId }
})
```

### Consequences
- ✅ Easy request tracing
- ✅ Simpler debugging
- ✅ Works with any logging system
- ❌ All services must propagate header

---

## ADR-006: Maximum 250 Lines per File

### Status
**Accepted**

### Context
Codebase maintainability and readability. Large files become difficult to navigate and understand.

### Decision
**Enforce maximum 250 lines per source file.**

### Rationale
- **Readability**: Easier to understand at a glance
- **Single responsibility**: Forces proper separation of concerns
- **Code review**: Smaller files are easier to review
- **Testing**: Smaller units are easier to test

### Exceptions
- Test files (may be longer due to test cases)
- Generated code
- Configuration files

### Consequences
- ✅ More focused, readable code
- ✅ Easier navigation
- ✅ Better separation of concerns
- ❌ More files to manage
- ❌ Requires discipline to split properly

---

## ADR-007: Monorepo with pnpm Workspaces

### Status
**Accepted**

### Context
Project has multiple applications (API, Web UI, CLI) and shared packages. Need dependency management strategy.

### Decision
**Use monorepo structure with pnpm workspaces.**

### Rationale
- **Shared code**: Easy sharing of packages between apps
- **Atomic changes**: Single commit for cross-package changes
- **Dependency hoisting**: Efficient disk usage
- **pnpm**: Faster than npm/yarn, strict by default

### Structure
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Consequences
- ✅ Unified versioning and testing
- ✅ Shared packages without publishing
- ✅ Fast installs with pnpm
- ❌ More complex CI setup
- ❌ Build order dependencies

---

## ADR-008: Credential Redaction Before LLM

### Status
**Accepted**

### Context
Network automation involves device credentials (passwords, SSH keys, SNMP communities). LLM requests should never contain secrets.

### Decision
**Implement mandatory credential redaction before any LLM API call.**

### Rationale
- **Security**: Credentials never leave system boundary
- **Compliance**: Prevents accidental exposure in logs/responses
- **Trust**: LLM providers don't see sensitive data
- **Audit**: Redaction is logged for compliance

### Implementation
```typescript
import { redactConfig } from '@security'

// Before sending to LLM
const safeConfig = redactConfig(networkConfig)
// "password cisco123" → "password ***REDACTED***"

const response = await llm.complete({
    prompt: `Analyze this config: ${safeConfig}`
})
```

### Patterns Redacted
- Passwords and secrets
- SNMP communities
- SSH/API keys
- Pre-shared keys
- Private key blocks

### Consequences
- ✅ Prevents credential leakage
- ✅ Safe to log redacted content
- ✅ Compliance friendly
- ❌ Slight processing overhead
- ❌ LLM cannot analyze actual credentials (by design)

---

## Decision Template

```markdown
## ADR-XXX: [Title]

### Status
[Proposed | Accepted | Deprecated | Superseded]

### Context
[What is the issue that we're seeing that is motivating this decision?]

### Decision
[What is the change that we're proposing and/or doing?]

### Rationale
[Why is this decision being made?]

### Consequences
[What becomes easier or more difficult because of this change?]
```

---

## Related Documentation

- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 📘 [Development](DEVELOPMENT.md) – Coding standards
- 🔐 [Security](SECURITY.md) – Security practices
