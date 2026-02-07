# System Architecture

> Technical architecture of IT Service Hub

## Overview

IT Service Hub is a modern, cloud-native application built with:
- **Microservices** architecture pattern
- **Event-driven** communication
- **Container-first** deployment

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IT SERVICE HUB                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Browser   │    │  Mobile App │    │  External   │                     │
│  │   Client    │    │   (Future)  │    │    API      │                     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│         │                  │                  │                             │
│         └──────────────────┼──────────────────┘                             │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        NGINX / Traefik                               │   │
│  │                      (Reverse Proxy / LB)                            │   │
│  └─────────────────────────────┬───────────────────────────────────────┘   │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                    │
│         │                      │                      │                    │
│         ▼                      ▼                      ▼                    │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│  │   Web UI    │       │  Gateway    │       │  Gateway    │              │
│  │  (SvelteKit)│       │    API      │       │    MCP      │              │
│  │  Port 8080  │       │   (Fastify) │       │   (SSE)     │              │
│  │             │       │  Port 3000  │       │  Port 3001  │              │
│  └─────────────┘       └──────┬──────┘       └──────┬──────┘              │
│                               │                      │                     │
│                               │                      │                     │
│         ┌─────────────────────┴──────────────────────┘                     │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Service Layer                                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  Auth   │ │  Asset  │ │  CMDB   │ │  Chat   │ │  More   │       │   │
│  │  │ Service │ │ Service │ │ Service │ │ Service │ │   ...   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                    │
│         │                      │                      │                    │
│         ▼                      ▼                      ▼                    │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│  │ PostgreSQL  │       │    Redis    │       │ AI Providers│              │
│  │   (Main DB) │       │   (Cache)   │       │  (OpenAI,   │              │
│  │  Port 5432  │       │  Port 6379  │       │   Claude)   │              │
│  └─────────────┘       └─────────────┘       └─────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend: Web UI

**Technology Stack:**
- SvelteKit 2.x
- Tailwind CSS
- Flowbite Svelte
- TypeScript

**Features:**
- Server-side rendering disabled (SPA mode)
- Client-side routing
- i18n support (Vietnamese, English)
- Responsive design

**Directory Structure:**
```
apps/web-ui/
├── src/
│   ├── lib/
│   │   ├── api/          # API client
│   │   ├── components/   # Reusable components
│   │   ├── stores/       # Svelte stores
│   │   └── i18n/         # Translations
│   └── routes/           # Page routes
├── static/               # Static assets
└── vite.config.ts
```

### Backend: Gateway API

**Technology Stack:**
- Node.js 20.x
- Fastify 4.x
- TypeScript
- Drizzle ORM

**Features:**
- RESTful API
- JWT authentication
- Request validation
- Rate limiting
- OpenAPI documentation

**Directory Structure:**
```
apps/api/
├── src/
│   ├── core/             # Core setup
│   │   ├── app.ts        # Fastify app
│   │   ├── database.ts   # DB connection
│   │   └── config.ts     # Configuration
│   ├── modules/          # Feature modules
│   │   ├── auth/
│   │   ├── assets/
│   │   ├── cmdb/
│   │   └── ...
│   ├── middlewares/      # Middlewares
│   └── utils/            # Utilities
└── drizzle/              # Migrations
```

### Backend: Gateway MCP

**Technology Stack:**
- Node.js 20.x
- Fastify
- Server-Sent Events (SSE)
- AI SDKs (OpenAI, Anthropic)

**Features:**
- AI chat integration
- Streaming responses
- Token usage tracking
- Context management

**Directory Structure:**
```
apps/gateway-mcp/
├── src/
│   ├── providers/        # AI providers
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   ├── handlers/         # SSE handlers
│   └── utils/
└── package.json
```

### Database: PostgreSQL

**Version:** 15.x

**Schema Design:**
- Normalized structure
- UUID primary keys
- Timestamps (created_at, updated_at)
- Soft deletes (deleted_at)

**Key Tables:**
```sql
-- Core
users, roles, permissions, role_permissions

-- Assets
assets, asset_categories, asset_models
asset_vendors, asset_locations

-- CMDB
cis, ci_types, ci_schemas, ci_relationships

-- Warehouse
spare_parts, stock_in, stock_out, warehouses

-- Maintenance
repair_tickets, ticket_logs, maintenance_schedules

-- QLTS
purchase_plans, plan_items, asset_increases

-- Chat
conversations, messages, token_usage
```

### Cache: Redis

**Version:** 7.x

**Usage:**
- Session storage
- JWT token blacklist
- Rate limiting counters
- Query cache
- Real-time events

**Key Patterns:**
```
session:{userId}
token:blacklist:{tokenId}
ratelimit:{ip}:{endpoint}
cache:assets:{query_hash}
```

---

## Data Flow

### API Request Flow

```
Client Request
     │
     ▼
┌─────────────┐
│   Nginx     │  ← SSL termination
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Rate Limit │  ← Redis
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Auth      │  ← JWT validation
│ Middleware  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validation  │  ← Schema validation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Controller │  ← Route handler
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Data access
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

### Chat Message Flow

```
User Message
     │
     ▼
┌─────────────┐
│   Web UI    │  ← User input
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Gateway API │  ← Message storage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Gateway MCP │  ← AI processing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ AI Provider │  ← OpenAI/Claude
└──────┬──────┘
       │
       ▼ (SSE Stream)
┌─────────────┐
│   Web UI    │  ← Display response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Gateway API │  ← Save response
└─────────────┘
```

---

## Module Architecture

### Modular Design

Each feature is organized as a module:

```
modules/assets/
├── assets.module.ts      # Module registration
├── assets.routes.ts      # Route definitions
├── assets.controller.ts  # Request handlers
├── assets.service.ts     # Business logic
├── assets.repository.ts  # Data access
├── assets.schema.ts      # Validation schemas
└── assets.types.ts       # TypeScript types
```

### Module Registration

```typescript
// assets.module.ts
export const assetsModule: FastifyPluginAsync = async (fastify) => {
  fastify.register(assetsRoutes, { prefix: '/assets' });
};

// app.ts
app.register(assetsModule, { prefix: '/api/v1' });
```

---

## Security Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Authentication Flow                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Login Request                                            │
│     POST /auth/login { username, password }                  │
│              │                                               │
│              ▼                                               │
│  2. Validate Credentials                                     │
│     Compare bcrypt hash ($2b, cost 10)                       │
│              │                                               │
│              ▼                                               │
│  3. Generate Tokens                                          │
│     ┌─────────────────────────────────────┐                  │
│     │ Access Token (15 min)               │                  │
│     │ - userId, role, permissions         │                  │
│     ├─────────────────────────────────────┤                  │
│     │ Refresh Token (7 days)              │                  │
│     │ - userId, tokenId                   │                  │
│     └─────────────────────────────────────┘                  │
│              │                                               │
│              ▼                                               │
│  4. Store Refresh Token                                      │
│     Redis: refresh:{userId}:{tokenId}                        │
│              │                                               │
│              ▼                                               │
│  5. Return Tokens to Client                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Authorization (RBAC)

```
┌─────────────────────────────────────────────────────────────┐
│                        RBAC Model                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌────────┐     ┌────────┐     ┌─────────────┐            │
│   │  User  │────▶│  Role  │────▶│ Permissions │            │
│   └────────┘     └────────┘     └─────────────┘            │
│                                                             │
│   Example:                                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ User: john@example.com                               │  │
│   │   └── Role: IT Technician                           │  │
│   │         ├── assets.view                             │  │
│   │         ├── assets.create                           │  │
│   │         ├── maintenance.tickets.view                │  │
│   │         ├── maintenance.tickets.update              │  │
│   │         └── warehouse.stock-out.create              │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Docker Compose (Development)

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:7

  gateway-api:
    build: ./apps/api
    depends_on: [db, redis]

  gateway-mcp:
    build: ./apps/gateway-mcp
    depends_on: [redis]

  web-ui:
    build: ./apps/web-ui
    depends_on: [gateway-api]
```

### Production (Kubernetes)

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │   Ingress   │ ← External traffic                        │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────────┐   │
│  │                    Services                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ web-ui  │  │ api     │  │ mcp     │             │   │
│  │  │ svc     │  │ svc     │  │ svc     │             │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘             │   │
│  └───────┼────────────┼────────────┼────────────────────┘   │
│          │            │            │                        │
│  ┌───────┴────────────┴────────────┴────────────────────┐   │
│  │                   Deployments                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │ web-ui  │  │ api     │  │ mcp     │              │   │
│  │  │ x3 pods │  │ x3 pods │  │ x2 pods │              │   │
│  │  └─────────┘  └─────────┘  └─────────┘              │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  StatefulSets                         │   │
│  │  ┌─────────────┐     ┌─────────────┐                 │   │
│  │  │ PostgreSQL  │     │   Redis     │                 │   │
│  │  │ (Primary +  │     │  (Sentinel) │                 │   │
│  │  │  Replica)   │     │             │                 │   │
│  │  └─────────────┘     └─────────────┘                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Horizontal Scaling

| Component | Scaling Strategy |
|-----------|-----------------|
| Web UI | Add replicas behind LB |
| Gateway API | Add replicas, stateless |
| Gateway MCP | Add replicas, stateless |
| PostgreSQL | Read replicas |
| Redis | Redis Cluster |

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Cache Layers                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L1: In-Memory (Node.js)                                    │
│      - Configuration                                        │
│      - Compiled templates                                   │
│      TTL: Application lifetime                              │
│                                                             │
│  L2: Redis Cache                                            │
│      - Query results                                        │
│      - Session data                                         │
│      - Rate limiting                                        │
│      TTL: 5-60 minutes                                      │
│                                                             │
│  L3: PostgreSQL                                             │
│      - Persistent data                                      │
│      - Full-text search                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring

### Metrics

- Request latency
- Error rates
- Database connections
- Cache hit ratio
- AI token usage

### Logging

```
{
  "timestamp": "2024-01-25T14:30:00Z",
  "level": "info",
  "service": "gateway-api",
  "requestId": "uuid",
  "userId": "uuid",
  "method": "POST",
  "path": "/api/v1/assets",
  "statusCode": 201,
  "duration": 45
}
```

### Health Checks

```http
GET /health
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "memory": "ok"
  }
}
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type safety, tooling |
| Frontend | SvelteKit | Performance, DX |
| Backend | Fastify | Speed, ecosystem |
| Database | PostgreSQL | Reliability, features |
| Cache | Redis | Speed, versatility |
| ORM | Drizzle | Type-safe, lightweight |
| Auth | JWT | Stateless, scalable |
| Deploy | Docker | Portability, consistency |
