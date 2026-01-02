# Gateway API - Tính Năng Và Kiến Trúc Chi Tiết

> **Phiên bản**: v1.0.0  
> **Framework**: Fastify 5.6.2  
> **Runtime**: Node.js ≥20.0.0  
> **Ngôn ngữ**: TypeScript 5.3.0  

## 📋 Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Tính Năng Chính](#tính-năng-chính)
3. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
4. [API Endpoints](#api-endpoints)
5. [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
6. [Middleware & Security](#middleware--security)
7. [Observability](#observability)
8. [Database Entities](#database-entities)
9. [Error Handling](#error-handling)
10. [Performance Metrics](#performance-metrics)
11. [Deprecated & Unused Files](#deprecated--unused-files)

---

## 🎯 Tổng Quan Hệ Thống

Gateway API là một **Fastify-based REST API server** được thiết kế để:

- 🔀 **Định tuyến thông minh** các yêu cầu AI đến nhiều LLM providers
- 🔐 **Quản lý xác thực** người dùng với JWT tokens
- 📊 **Thu thập metrics** và logs cho observability
- 💾 **Quản lý conversations** và messages
- ⚙️ **Cấu hình models** và providers
- 👥 **Quản lý users** và roles với RBAC
- 📈 **Cung cấp statistics** và analytics
- 🛠️ **Tool Registry** cho các công cụ tích hợp

**Tech Stack**:
- Framework: **Fastify 5.6.2** (high-performance HTTP server)
- Database: **PostgreSQL 15+** (via `@infra/postgres`)
- Cache: **Redis 7+** (via `@infra/redis`)
- Validation: **Zod 3.22.4**
- Monitoring: **OpenTelemetry + Jaeger** (distributed tracing)
- Logging: **Pino** (via `@observability/logger`)
- Metrics: **Prometheus client** (`prom-client 15.1.0`)

---

## 🌟 Tính Năng Chính

### 1. **Chat & Conversation Management** 💬

#### v1 Chat API - OpenAI Compatible
```
POST /v1/chat/completions
- Tương thích OpenAI API
- Models: mistralai/devstral-2512:free, gpt-4, claude-3
- Response format: OpenAI-compliant với metadata bổ sung
- Metadata: tier_used, escalated, quality_score, cost_usd
```

**Features**:
- ✅ Streaming responses (SSE)
- ✅ Temperature & token control
- ✅ Model selection
- ✅ Cost tracking per request

#### v2 Chat API - Advanced Routing
```
POST /v2/chat
- Tier-based routing (free → standard → premium)
- Intelligent escalation khi cần
- Workflow support (pre/post processing)
- Advanced parameters: importance, priority
```

**Features**:
- ✅ Automatic tier escalation
- ✅ Request prioritization
- ✅ Pre/post processing hooks
- ✅ Workflow orchestration

#### Conversation Management
```
POST   /v1/conversations            - Tạo conversation mới
GET    /v1/conversations            - Danh sách conversations (paginated)
GET    /v1/conversations/:id        - Chi tiết conversation
PATCH  /v1/conversations/:id        - Cập nhật tiêu đề, metadata
DELETE /v1/conversations/:id        - Xóa conversation
POST   /v1/conversations/:id/summarize - Tóm tắt conversation
```

**Pagination**: Hỗ trợ `limit`, `offset`, `sort`  
**Metadata**: Lưu tags, user preferences, custom data

### 2. **Authentication & Authorization** 🔐

#### Login API
```
POST /v1/auth/login
- Email + Password authentication
- Trả về JWT token + user info
- Updates last_login timestamp
- Validates user.status = 'active'
```

#### RBAC (Role-Based Access Control)
**Roles**:
- `admin`: Toàn quyền quản lý
- `operator`: Quản lý conversations
- `user`: Sử dụng chat, xem stats cá nhân
- `guest`: Xem stats công khai

#### Permission Middleware
```typescript
// Routes được bảo vệ by role
requireAdmin()     // /admin/* endpoints
requireRole(role)  // Generic RBAC
```

### 3. **Model & Provider Management** 🤖

#### Models API
```
GET    /v1/models                    - Danh sách models
GET    /v1/models/:id               - Chi tiết model
POST   /v1/models                   - Tạo model mới (admin)
PATCH  /v1/models/:id               - Cập nhật model
DELETE /v1/models/:id               - Xóa model
```

**Model Properties**:
```json
{
  "id": "gpt-4-turbo",
  "provider": "openai",
  "name": "GPT-4 Turbo",
  "tier": "premium",
  "maxTokens": 128000,
  "costPer1kTokens": { "input": 0.01, "output": 0.03 },
  "features": {
    "streaming": true,
    "functionCalling": true,
    "visionCapabilities": true
  },
  "status": "active"
}
```

#### Providers Health Monitoring
```
GET /v1/providers-health
- Real-time provider status
- Latency metrics
- Error rates
- Last sync timestamp
```

### 4. **Admin Panels** 👨‍💼

#### Database Management
```
POST   /v1/admin/database/query      - Execute safe queries
GET    /v1/admin/database/stats      - Database statistics
GET    /v1/admin/database/tables     - Table listing
GET    /v1/admin/database/backup     - Backup info
POST   /v1/admin/database/backup     - Create backup
```

**Security**: 
- ✅ Only SELECT queries allowed
- ✅ Admin-only access
- ✅ Correlation ID tracking

#### Redis Management
```
GET    /v1/admin/redis/info         - Redis info & stats
GET    /v1/admin/redis/keys         - List keys (paginated)
GET    /v1/admin/redis/usage        - Memory usage
POST   /v1/admin/redis/flush        - Flush cache (warning!)
```

#### Provider Configuration
```
GET    /v1/admin/providers          - List all providers
POST   /v1/admin/providers          - Add provider
PATCH  /v1/admin/providers/:id      - Update provider
DELETE /v1/admin/providers/:id      - Remove provider
GET    /v1/admin/providers/:id/test - Test connection
```

**Provider Properties**:
```json
{
  "id": "openai",
  "name": "OpenAI",
  "type": "llm",
  "apiKey": "***encrypted***",
  "endpoint": "https://api.openai.com/v1",
  "status": "active",
  "rateLimit": 3500,
  "models": ["gpt-4", "gpt-3.5-turbo"],
  "metadata": { "organization": "...", "project": "..." }
}
```

#### Users Management
```
GET    /v1/admin/users              - List users
POST   /v1/admin/users              - Create user
GET    /v1/admin/users/:id          - User details
PATCH  /v1/admin/users/:id          - Update user
DELETE /v1/admin/users/:id          - Deactivate user
POST   /v1/admin/users/:id/reset-password - Reset password
```

#### Roles Management
```
GET    /v1/admin/roles              - List roles
POST   /v1/admin/roles              - Create role
PATCH  /v1/admin/roles/:id          - Update role
DELETE /v1/admin/roles/:id          - Delete role
```

#### Policies Management
```
GET    /v1/admin/policies           - List policies
POST   /v1/admin/policies           - Create policy
PATCH  /v1/admin/policies/:id       - Update policy
DELETE /v1/admin/policies/:id       - Delete policy
```

#### System Health
```
GET    /v1/admin/system/health      - System status
GET    /v1/admin/system/resources   - CPU, Memory, Disk
GET    /v1/admin/system/uptime      - Uptime metrics
POST   /v1/admin/system/restart     - Restart services (warning!)
```

#### Model Admin
```
GET    /v1/admin/models             - All configured models
POST   /v1/admin/models             - Add model
PATCH  /v1/admin/models/:id         - Update model
DELETE /v1/admin/models/:id         - Remove model
GET    /v1/admin/models/usage       - Usage statistics
```

### 5. **Tools & Registry** 🔧

#### Tools API
```
GET    /v1/tools                    - List available tools
GET    /v1/tools/:id                - Tool details
POST   /v1/tools                    - Register tool (admin)
PATCH  /v1/tools/:id                - Update tool
DELETE /v1/tools/:id                - Unregister tool
POST   /v1/tools/:id/invoke         - Execute tool
```

**Tool Schema**:
```json
{
  "id": "sql-analyzer",
  "name": "SQL Analyzer",
  "version": "1.0.0",
  "description": "Analyze and optimize SQL queries",
  "schema": {
    "input": {
      "type": "object",
      "properties": { "query": { "type": "string" } },
      "required": ["query"]
    },
    "output": {
      "type": "object",
      "properties": { "analysis": { "type": "string" }, "optimization": { "type": "string" } }
    }
  },
  "status": "active"
}
```

### 6. **Statistics & Analytics** 📊

#### Stats API
```
GET    /v1/stats/overview           - Global statistics
GET    /v1/stats/conversations      - Conversation stats
GET    /v1/stats/users              - User statistics
GET    /v1/stats/providers          - Provider performance
GET    /v1/stats/models             - Model usage stats
GET    /v1/stats/costs              - Cost breakdown
GET    /v1/stats/quality            - Quality metrics
```

**Overview Stats**:
```json
{
  "totalConversations": 15432,
  "totalMessages": 85234,
  "averageMessagesPerConv": 5.5,
  "uniqueUsers": 2341,
  "totalCost": 1234.56,
  "averageResponseTime": 245,
  "successRate": 98.5,
  "topModels": [
    { "model": "gpt-4", "count": 8234, "percentage": 32.4 }
  ]
}
```

### 7. **Audit & Incident Management** 📝

#### Audit Logs
```
GET    /v1/audit                    - Audit trail
POST   /v1/audit/search             - Search audit logs
GET    /v1/audit/:id                - Log details
```

**Audit Entry**:
```json
{
  "id": "audit-123",
  "action": "DELETE_CONVERSATION",
  "actor": "user-456",
  "resource": "conversation-789",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "success",
  "details": { "conversationId": "conv-789", "messageCount": 42 }
}
```

#### Incidents
```
GET    /v1/incidents                - List incidents
POST   /v1/incidents                - Report incident
PATCH  /v1/incidents/:id            - Update incident
GET    /v1/incidents/:id/resolution - Resolution details
```

### 8. **File Management** 📁

#### Files API
```
POST   /v1/files/upload             - Upload file
GET    /v1/files/:id                - Download file
DELETE /v1/files/:id                - Delete file
GET    /v1/files                    - List files (paginated)
```

**Features**:
- ✅ Multipart upload via `@fastify/multipart`
- ✅ File storage management
- ✅ Virus scanning (optional)
- ✅ Access control per file

### 9. **Health & Metrics** 💚

#### Health Check
```
GET    /health                      - Simple health check
Response: { "status": "ok", "timestamp": "..." }
```

#### Prometheus Metrics
```
GET    /metrics                     - Prometheus-compatible metrics
- http_requests_total
- http_request_duration_seconds
- chat_completions_total
- database_queries_duration_seconds
- redis_operations_total
```

---

## 🏛️ Kiến Trúc Hệ Thống

### Clean Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                   HTTP Routes Layer                     │
│  (v1/chat, v2/chat, admin/*, /health, /metrics)        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Middleware Pipeline                         │
│  • Correlation ID injection                              │
│  • Error handling                                        │
│  • Rate limiting                                         │
│  • Permission checks                                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│          Application Layer (@application/core)          │
│  • HTTP Controllers                                      │
│  • Request/Response DTOs                                │
│  • Use Case Orchestration                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│           Domain Layer (@domain/core)                   │
│  • Entities (User, Conversation, Message, Model)        │
│  • Value Objects (ModelTier, UserRole)                  │
│  • Repository Interfaces                                │
│  • Domain Services                                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│        Infrastructure Layer                              │
│  • PostgreSQL Repository Implementations                │
│  • Redis Cache Manager                                  │
│  • LLM Provider Clients                                 │
│  • External Service Integrations                        │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
apps/gateway-api/
├── src/
│   ├── adapters/                    # External service adapters
│   │   └── llm/                    # LLM provider adapters
│   │
│   ├── application/                 # Application layer (DTOs, Controllers)
│   │   ├── http/
│   │   │   ├── dtos/               # Request/Response DTOs
│   │   │   └── routes/
│   │   ├── streaming/              # Streaming orchestration
│   │   └── websocket/              # WebSocket handlers
│   │
│   ├── config/                      # Configuration
│   │   └── settings.ts
│   │
│   ├── container.ts                 # Dependency Injection Container
│   │
│   ├── core/                        # Core business logic
│   │   ├── domain/
│   │   ├── services/
│   │   └── use-cases/
│   │
│   ├── infrastructure/              # Infrastructure layer
│   │   ├── cache/                  # Redis caching
│   │   ├── database/               # Database repositories
│   │   ├── external/               # External API clients
│   │   ├── messaging/              # Message queue
│   │   └── services/               # Infrastructure services
│   │
│   ├── middleware/                  # Fastify middleware
│   │   ├── admin-auth.ts           # Admin authentication
│   │   ├── correlation-id.ts       # Request correlation
│   │   ├── error-handler.ts        # Global error handling
│   │   ├── permissions.ts          # RBAC middleware
│   │   ├── rate-limit.ts           # Rate limiting
│   │   └── validation.ts           # Zod validation
│   │
│   ├── observability/               # Monitoring & Logging
│   │   ├── logging/
│   │   │   └── logger.ts          # Pino logger setup
│   │   └── metrics/
│   │       └── prometheus.ts      # Prometheus metrics
│   │
│   ├── routes/                      # Route definitions
│   │   ├── health.ts               # Health check endpoint
│   │   ├── metrics.ts              # Prometheus metrics endpoint
│   │   ├── v1/                     # V1 API routes
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts             # OpenAI-compatible chat
│   │   │   ├── conversations/
│   │   │   │   └── summarize.ts
│   │   │   ├── files.ts
│   │   │   ├── models.ts
│   │   │   ├── tools.ts
│   │   │   ├── stats.ts
│   │   │   ├── incidents.ts
│   │   │   ├── audit.ts
│   │   │   ├── providers-health.ts
│   │   │   └── admin/              # Admin endpoints
│   │   │       ├── database.ts
│   │   │       ├── redis.ts
│   │   │       ├── providers.ts
│   │   │       ├── models.ts
│   │   │       ├── users.ts
│   │   │       ├── roles.ts
│   │   │       ├── policies.ts
│   │   │       └── system.ts
│   │   ├── v2/                     # V2 API routes (advanced)
│   │   │   ├── chat.ts             # Tier-based routing
│   │   │   └── chat-stream.ts      # Streaming v2
│   │   └── workflows/              # Workflow routes
│   │
│   ├── shared/                      # Shared utilities
│   │   ├── errors/
│   │   │   └── base.errors.ts     # Custom error classes
│   │   └── utils/
│   │       └── index.ts
│   │
│   ├── websocket/                   # WebSocket support
│   │   └── handlers.ts
│   │
│   └── server.ts                    # Main server entry point
│
├── tests/                            # Test files
├── .env.example                      # Environment template
├── Dockerfile                        # Docker build file
├── Dockerfile.simple                 # Simplified Docker
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
└── vitest.config.ts                  # Test configuration
```

---

## 🔌 API Endpoints

### Complete Endpoint Reference

#### **Chat APIs**
| Method | Endpoint | Version | Description |
|--------|----------|---------|-------------|
| POST | `/v1/chat/completions` | v1 | OpenAI-compatible chat |
| POST | `/v2/chat` | v2 | Advanced tier-based routing |
| POST | `/v2/chat/stream` | v2 | Streaming v2 chat |

#### **Conversations**
| Method | Endpoint | Params | Returns |
|--------|----------|--------|---------|
| POST | `/v1/conversations` | - | New conversation |
| GET | `/v1/conversations` | `limit`, `offset`, `sort` | Paginated list |
| GET | `/v1/conversations/:id` | - | Conversation details |
| PATCH | `/v1/conversations/:id` | `title`, `metadata` | Updated conversation |
| DELETE | `/v1/conversations/:id` | - | Deletion status |
| POST | `/v1/conversations/:id/summarize` | - | Conversation summary |

#### **Authentication**
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/v1/auth/login` | `email`, `password` | JWT token + user |
| POST | `/v1/auth/logout` | - | Success status |
| POST | `/v1/auth/refresh` | - | New JWT token |

#### **Models**
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/v1/models` | List all available models |
| GET | `/v1/models/:id` | Model configuration & capabilities |
| POST | `/v1/models` | Create model (admin) |
| PATCH | `/v1/models/:id` | Update model config (admin) |
| DELETE | `/v1/models/:id` | Remove model (admin) |

#### **Admin - Database**
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/v1/admin/database/query` | Admin only |
| GET | `/v1/admin/database/stats` | Admin only |
| GET | `/v1/admin/database/tables` | Admin only |

#### **Admin - Users**
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/v1/admin/users` | List all users |
| POST | `/v1/admin/users` | Create user |
| GET | `/v1/admin/users/:id` | User details |
| PATCH | `/v1/admin/users/:id` | Update user |
| DELETE | `/v1/admin/users/:id` | Deactivate user |

#### **Admin - Providers**
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/v1/admin/providers` | List providers |
| POST | `/v1/admin/providers` | Add provider |
| PATCH | `/v1/admin/providers/:id` | Update provider |
| DELETE | `/v1/admin/providers/:id` | Remove provider |
| GET | `/v1/admin/providers/:id/test` | Test connection |

#### **Health & Metrics**
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/health` | `{ status: "ok" }` |
| GET | `/metrics` | Prometheus metrics |

---

## 🔒 Middleware & Security

### Middleware Pipeline

#### 1. **Correlation ID Middleware**
```typescript
// Middleware: middleware/correlation-id.ts
- Extracts or generates x-correlation-id header
- Adds to request for distributed tracing
- Passed to logger & telemetry
```

#### 2. **Rate Limiting Middleware**
```typescript
// Middleware: middleware/rate-limit.ts
- Per-user rate limits based on tier
- Per-IP rate limits for anonymous users
- Returns 429 Too Many Requests
```

**Rate Limits by Tier**:
| Tier | Requests/min | Concurrent |
|------|--------------|-----------|
| Free | 60 | 5 |
| Standard | 600 | 50 |
| Premium | 3000 | 500 |
| Enterprise | Unlimited | Unlimited |

#### 3. **Admin Authentication**
```typescript
// Middleware: middleware/admin-auth.ts
requireAdmin()  // Guards /admin/* routes
- Validates JWT token
- Checks user.role === 'admin'
- Returns 403 Forbidden if not admin
```

#### 4. **Permission Middleware**
```typescript
// Middleware: middleware/permissions.ts
- RBAC checks per route
- Context-based permissions (own resources)
- Policy enforcement
```

#### 5. **Validation Middleware**
```typescript
// Middleware: middleware/validation.ts
- Zod schema validation
- Request body/query/params validation
- Returns 400 Bad Request with errors
```

#### 6. **Error Handler**
```typescript
// Middleware: middleware/error-handler.ts
- Catches all errors
- Formats error response
- Logs errors with correlation ID
- Returns appropriate HTTP status
```

### Security Features

✅ **JWT Authentication**
- Token in Authorization header
- Expires after configurable duration (default 24h)
- Refresh token support

✅ **Password Security**
- Bcrypt hashing (salt rounds: 10)
- Min 6 characters
- Never returned in responses

✅ **API Key Masking**
- Admin endpoints mask provider API keys
- Shows only last 4 characters
- Full key stored encrypted in database

✅ **RBAC (Role-Based Access Control)**
- 4 predefined roles: admin, operator, user, guest
- Custom policies support
- Permission checks per endpoint

✅ **CORS Configuration**
- Configurable allowed origins
- Credentials support
- Preflight request handling

✅ **Request Validation**
- All inputs validated with Zod
- SQL injection prevention
- XSS protection headers

---

## 📊 Observability

### Logging

**Logger: Pino** (via `@observability/logger`)
```typescript
// Structured logging with context
logger.info({ correlationId, userId, action }, 'User login')
logger.error({ correlationId, error }, 'Chat failed')
logger.warn({ correlationId }, 'Rate limit approaching')
```

**Log Levels**: trace, debug, info, warn, error, fatal

### Distributed Tracing

**Tool: OpenTelemetry + Jaeger**
```typescript
// Auto-instrumented spans
- HTTP request spans
- Database query spans
- Cache operation spans
- External API call spans
```

### Metrics

**Tool: Prometheus** (`prom-client`)

**Standard Metrics**:
```
# HTTP
http_requests_total{method, path, status}
http_request_duration_seconds{method, path, status}

# Chat
chat_completions_total{model, tier, status}
chat_completion_duration_seconds{model, tier}

# Database
database_queries_total{operation, table}
database_query_duration_seconds{operation, table}

# Cache
cache_hits_total{operation}
cache_misses_total{operation}

# Providers
provider_requests_total{provider, status}
provider_response_time_seconds{provider}
```

### Health Monitoring

**Endpoint**: `GET /v1/admin/system/health`
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "providers": {
      "openai": "healthy",
      "anthropic": "healthy"
    }
  },
  "resources": {
    "cpuUsage": 45.3,
    "memoryUsage": 62.1,
    "diskUsage": 38.7
  },
  "uptime": 3600
}
```

---

## 💾 Database Entities

### Core Entities

#### **User**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  tier VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  metadata JSONB,
  INDEX (email),
  INDEX (role),
  INDEX (tier)
);
```

#### **Conversation**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  metadata JSONB,
  INDEX (user_id),
  INDEX (created_at),
  INDEX (status)
);
```

#### **Message**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20),
  content TEXT,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (conversation_id),
  INDEX (user_id),
  INDEX (created_at)
);
```

#### **Model**
```sql
CREATE TABLE models (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id),
  name VARCHAR(255),
  code VARCHAR(100) UNIQUE,
  tier VARCHAR(20),
  max_tokens INTEGER,
  cost_per_1k_tokens JSONB,
  features JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Provider**
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  api_key VARCHAR(500) ENCRYPTED,
  endpoint VARCHAR(500),
  status VARCHAR(20),
  rate_limit INTEGER,
  models JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **AuditLog**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(100),
  actor_id UUID REFERENCES users(id),
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  status VARCHAR(20),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (actor_id),
  INDEX (action),
  INDEX (created_at)
);
```

---

## ⚠️ Error Handling

### Custom Error Classes

**Base Error** (`shared/errors/base.errors.ts`):
```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) { }
}
```

**Error Types**:
```typescript
ValidationError(400)
AuthenticationError(401)
AuthorizationError(403)
NotFoundError(404)
ConflictError(409)
RateLimitError(429)
InternalServerError(500)
ServiceUnavailableError(503)
```

### Error Response Format

```json
{
  "error": "ValidationError",
  "code": "INVALID_REQUEST",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "invalid-email"
  },
  "correlationId": "req-123-abc",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📈 Performance Metrics

### Response Time SLAs

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `/v1/chat/completions` | 800ms | 2s | 5s |
| `/v1/models` | 50ms | 100ms | 200ms |
| `/v1/conversations` | 100ms | 250ms | 500ms |
| `/health` | 5ms | 10ms | 20ms |
| `/metrics` | 50ms | 150ms | 300ms |

### Capacity Targets

- **Concurrent Connections**: 10,000+
- **Requests/Second**: 1,000+ (depends on tier)
- **Database Pool Size**: 20-50 connections
- **Redis Pool Size**: 10-20 connections
- **Cache Hit Rate Target**: >80%
- **Error Rate SLA**: <0.1%
- **Uptime SLA**: 99.9%

### Cost Optimization

✅ Database Connection Pooling
✅ Redis Caching Layer
✅ Rate Limiting
✅ Request Deduplication
✅ Model Tier Routing (cost-aware)

---

## 🗑️ Deprecated & Unused Files

### Files Marked for Removal

#### **Deprecated Route Files**
```
❌ src/routes/v1/admin/         (Empty folder)
   - No endpoints implemented
   - Admin routes moved to individual files
```

#### **Old Integration Files** (Not Found in Current v1.0.0)
```
❌ src/integrations/old-providers/   (if exists)
   - Replaced by @providers/llm package
   - Use adapters/ instead

❌ src/db/migrations/old/             (if exists)
   - Use @infra/postgres migrations
```

#### **Unused Middleware** (Potentially)
```
⚠️ src/middleware/validation.ts
   - Partially used (mostly Zod in routes)
   - Recommend consolidation

⚠️ src/middleware/rate-limit.ts
   - Could use external rate limiter
   - Current implementation is in-memory
```

#### **Test Files Status**
```
✅ tests/                    (Maintained, all passing)
   - 100% pass rate
   - Update needed when new features added
```

### Legacy Configuration

```
⚠️ .env.example sections:
   - OLD_DB_HOST (use DATABASE_URL)
   - OLD_CACHE_TYPE (use REDIS_URL)
   - API_TIMEOUT_MS (use specific timeouts)
```

### Dead Code Candidates

```
⚠️ shared/utils/index.ts
   - Review for unused helper functions
   - Consolidate with @contracts/shared

⚠️ infrastructure/services/
   - password.service.ts (use bcrypt directly)
   - token.service.ts (could use JWT library)
   - Consider extracting to shared packages
```

### Recommendations for Cleanup

**Priority 1 - Remove Now**:
1. Empty `src/routes/v1/admin/` folder
2. Any commented-out code blocks
3. Unused type definitions

**Priority 2 - Consolidate**:
1. Middleware implementations → shared middleware package
2. Utility functions → `@contracts/shared`
3. Services → domain layer packages

**Priority 3 - Refactor**:
1. Move `infrastructure/services/` to domain packages
2. Create shared middleware package
3. Extract error handling to `@contracts/shared`

---

## 📚 Related Documentation

- [Architecture Guide](../docs/architecture/CLEAN_ARCHITECTURE.md)
- [API Reference](../docs/api/README.md)
- [Development Guide](../docs/DEVELOPMENT.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

---

## 🔗 Dependencies

**Core**:
- `fastify@5.6.2` - HTTP framework
- `@fastify/cors@10.1.0` - CORS support
- `@fastify/multipart@9.3.0` - File upload

**Validation**:
- `zod@3.22.4` - Schema validation
- `ajv@8.17.1` - JSON Schema validator

**Database**:
- `@infra/postgres` - PostgreSQL client
- `@infra/redis` - Redis client

**Security**:
- `bcrypt@6.0.0` - Password hashing
- `jsonwebtoken@9.0.3` - JWT handling

**Observability**:
- `@observability/logger` - Structured logging
- `@opentelemetry/*` - Distributed tracing
- `prom-client@15.1.0` - Prometheus metrics

**Business Logic**:
- `@application/core` - Application layer
- `@domain/core` - Domain models
- `@providers/llm` - LLM provider adapters
- `@tools/registry` - Tool registry

---

**Document Version**: v1.0.0  
**Last Updated**: 2024-12-24  
**Status**: ✅ Production Ready
