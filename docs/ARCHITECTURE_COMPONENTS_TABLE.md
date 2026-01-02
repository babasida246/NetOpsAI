# NetOpsAI - Architecture & Components Overview

Bảng chi tiết các chức năng trong **Packages**, **Apps**, **Architecture**, và **Logic Flow** của NetOpsAI.

## 📦 PACKAGES LAYER

| Package | Type | Chức Năng | Mô Tả Chi Tiết | Key Files | Dependencies |
|---------|------|----------|----------------|-----------|--------------|
| **@domain/core** | Domain Logic | Domain Models & Entities | Lớp domain chứa các model cơ bản: User, Conversation, Message, Policy. Định nghĩa các entity rules và business logic độc lập. | `src/models/`, `src/entities/` | None |
| **@contracts/shared** | Interfaces | Shared Contracts & Types | Định nghĩa TypeScript interfaces, DTOs, types chia sẻ giữa các packages. Đảm bảo consistency types across monorepo. | `src/types/`, `src/dtos/` | TypeScript |
| **@config/core** | Configuration | Config Management & Env | Quản lý environment variables, model tiers (T0-T3), configuration defaults. Centralized config cho tất cả services. | `src/config.ts`, `src/tiers.ts` | Zod (validation) |
| **@infra/postgres** | Infrastructure | PostgreSQL Client & Repos | Database client, connection pooling, repository pattern cho CRUD operations. Manages: users, conversations, messages, requests logs. | `src/client.ts`, `src/repos/` | pg, bcrypt |
| **@infra/redis** | Infrastructure | Redis Cache & Sessions | Redis client, caching layer, session management. Handles: token cache, conversation cache, rate limit counters. | `src/client.ts`, `src/cache.ts` | redis, ioredis |
| **@infra/vector** | Infrastructure | Vector DB & Embeddings | Vector embeddings storage cho semantic search. Integration với Qdrant/Pinecone cho RAG. | `src/vector-client.ts` | @langchain/core |
| **@observability/logger** | Observability | Logging & Metrics | Pino logger, Prometheus metrics collection. Tracks: API latency, errors, throughput, tool calls. | `src/logger.ts`, `src/metrics.ts` | pino, prom-client |
| **@providers/llm** | Providers | LLM API Integrations | Abstract LLM provider interface. Implementations: OpenRouter, Anthropic, Mock. Token counting, cost calculation. | `src/providers/`, `src/clients/` | axios, openai |
| **@security/rbac** | Security | RBAC & Auth | Role-based access control, JWT tokens, permissions matrix. Admin roles: admin, operator, viewer. | `src/auth/`, `src/permissions.ts` | jsonwebtoken, bcrypt |
| **@tools/registry** | Tools | Tool Registry & Execution | Central registry cho tất cả tools. Tool definitions, invocation, schema validation. Core tools: echo, time-now. | `src/registry.ts`, `src/tools/` | Zod |
| **@testing/fixtures** | Testing | Test Fixtures & Mocks | Reusable test data, mock factories, test utilities. Giảm code duplication trong tests. | `src/fixtures/`, `src/mocks/` | Vitest |

---

## 🖥️ APPS LAYER

### Gateway API (`apps/gateway-api`)

| Thành Phần | Chức Năng | Mô Tả | Key Routes |
|-----------|----------|-------|-----------|
| **HTTP Server** | REST API | Fastify server với CORS, multipart support. Main entry point cho web-ui. | `GET /health`, `POST /v1/chat` |
| **Chat Orchestrator** | LLM Orchestration | Orchestrates: policy validation → routing → LLM call → tool execution. Core business logic. | `POST /v1/chat`, `POST /v2/chat/stream` |
| **Router Engine** | Model Routing | Tier-based routing logic. Routes requests tới correct LLM based on complexity. T0→free, T3→premium. | Internal component |
| **Policy Engine** | Policy Enforcement | Enforces cost limits, rate limits, quotas, access control policies. Blocks requests nếu violate. | Internal component |
| **Quality Checker** | Output Validation | Validates LLM output quality. Checks: format, safety, length. Triggers escalation nếu needed. | Internal component |
| **Executor Engine** | Tool Execution | Executes tools từ registry. Manages: input validation, timeout, error handling, result formatting. | Internal component |
| **Conversation API** | Conversation CRUD | Manage conversations: list, create, get, delete, summarize. Stores topics, summaries. | `GET /v1/conversations`, `POST /v1/conversations/:id/summarize` |
| **Admin Routes** | Admin Panel API | User mgmt, roles, policies, system health. Protected by `requireAdmin` middleware. | `GET /v1/admin/users`, `PUT /v1/admin/policies` |
| **Stats/Metrics** | Analytics | Cost tracking, latency metrics, error rates, top models/tools. Dashboard data source. | `GET /v1/stats/overview`, `GET /v1/stats/models/top` |
| **Audit Log** | Compliance | Log mọi action: logins, policy changes, tool calls. For compliance & debugging. | `GET /v1/audit/events` |

### Gateway MCP (`apps/gateway-mcp`)

| Thành Phần | Chức Năng | Mô Tả | Ngôn Ngữ Kết Nối |
|-----------|----------|-------|-----------------|
| **MCP Server** | Protocol Handler | Implements Model Context Protocol (MCP) specification. Bridges: AI ↔ Tools. | JSON-RPC 2.0 |
| **Tool Registry** | Tool Management | Registers tools from: log-aggregator, sql-ops, network-change packages. | MCP Tool API |
| **Log Aggregator** | Log Tools | Integrates: Zabbix alerts, FortiGate logs, Syslog. Provides: search, parse, stats. | REST/API |
| **SQL Ops** | Database Tools | Execute SQL, explain plans, analyze queries. Connects to PostgreSQL. | PostgreSQL Protocol |
| **Network Change** | Network Tools | VLAN generation, network config validation, topology suggestions. | Network APIs |

### Web UI (`apps/web-ui`)

| Page/Component | Chức Năng | Mô Tả | API Endpoints |
|----------------|----------|-------|---------------|
| **Dashboard** | Metrics View | Real-time stats: requests, latency, cost, error rate. Provider health, recent incidents. | `GET /v1/stats/overview`, `GET /v1/providers/health` |
| **Chat** | Chat Interface | User-facing chat. Send messages, see tool calls, view cost estimation. Supports streaming. | `POST /v1/conversations/:id/messages`, `POST /v2/chat/stream` |
| **Tools Playground** | Tool Testing | Test individual tools. Validate input schemas, view results. | `GET /v1/tools`, `POST /v1/tools/:name/run` |
| **SQL Analyzer** | SQL Tools | Analyze SQL queries, explain plans, get optimization suggestions. | `POST /v1/sql/analyze`, `POST /v1/sql/explain` |
| **Network VLAN** | Network Tools | Generate VLAN configs, validate network topology. | `POST /v1/network/vlan/generate` |
| **Change Requests** | Change Mgmt | Create, approve, apply network changes. Supports rollback. | `GET /v1/network/changes`, `POST /v1/network/changes/:id/approve` |
| **Admin - Users** | User Management | List users, create, edit, disable accounts. Role assignment. | `GET /v1/admin/users`, `PUT /v1/admin/users/:id` |
| **Admin - Roles** | RBAC Management | Manage roles, permissions, permissions matrix visualization. | `GET /v1/admin/roles`, `PUT /v1/admin/roles/:id/permissions` |
| **Admin - Policies** | Policy Editor | View, edit system policies: cost limits, rate limits, quotas. | `GET /v1/admin/policies`, `PUT /v1/admin/policies` |
| **Observability - Logs** | Log Viewer | Search logs by: level, service, correlation ID, time range. | `GET /v1/obs/logs` |
| **Observability - Metrics** | Metrics Dashboard | View system metrics: latency, errors, cost, cache hit rate. | `GET /v1/obs/metrics/latency`, `GET /v1/obs/metrics/cost` |
| **Observability - Traces** | Distributed Tracing | View trace waterfall, request flow, latency breakdown. | `GET /v1/obs/traces` |

### CLI (`apps/gateway-cli`)

| Command | Chức Năng | Mô Tả | Ví Dụ |
|---------|----------|-------|--------|
| `config` | Configuration | Quản lý config files, environment variables. | `gateway-cli config set API_KEY=xxx` |
| `chat` | Send Message | Send message từ CLI, nhận response. | `gateway-cli chat "What is CPU usage?"` |
| `tools` | Tool Management | List tools, run tools, validate schemas từ CLI. | `gateway-cli tools list`, `gateway-cli tools run analyze_sql` |
| `migrations` | DB Migrations | Run database migrations. | `gateway-cli migrations run` |
| `audit` | Audit Trail | View audit logs từ CLI. | `gateway-cli audit events --from 2024-01-01` |

---

## 🏗️ ARCHITECTURE LAYERS

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│          Presentation Layer                      │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │  Web UI      │  Gateway MCP │  Gateway CLI │ │
│  └──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          Application Layer                       │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │ Chat         │  Policy      │  Router      │ │
│  │ Orchestrator │  Engine      │  Engine      │ │
│  └──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          Domain Layer                            │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │  Models      │  Rules       │  Interfaces  │ │
│  │  Entities    │  Business    │  Contracts   │ │
│  └──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          Infrastructure Layer                    │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │  PostgreSQL  │  Redis       │  OpenRouter  │ │
│  │  Client      │  Cache       │  LLM Client  │ │
│  └──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
Web UI/CLI Request
    ↓
Fastify HTTP Handler
    ↓
Middleware (Auth, Correlation ID, Rate Limit)
    ↓
Route Handler
    ↓
Chat Orchestrator
    ├→ Policy Engine (Check limits)
    ├→ Router Engine (Decide model tier)
    ├→ LLM Provider (Get response)
    ├→ Executor Engine (Run tools if needed)
    │  ├→ Tool Registry (Get tool definition)
    │  ├→ MCP Server (Execute tool)
    │  └→ Database/External APIs
    ├→ Quality Checker (Validate output)
    └→ Audit Logger (Log action)
    ↓
Response to Client
```

---

## 🔄 LOGIC FLOW - Key Workflows

### 1. Chat Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER SENDS MESSAGE                                           │
│    UI → POST /v1/conversations/:id/messages                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. REQUEST VALIDATION                                           │
│    • Check JWT token                                            │
│    • Validate correlation ID                                    │
│    • Extract user context                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. POLICY CHECK (Policy Engine)                                 │
│    • Cost limit exceeded? → Reject                              │
│    • Rate limit exceeded? → Reject                              │
│    • Quota exceeded? → Reject                                   │
│    • Access allowed? → Continue                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ROUTING DECISION (Router Engine)                             │
│    • Analyze message complexity                                 │
│    • Check user tier                                            │
│    • Select model:                                              │
│      T0 (free) → OpenRouter free model                          │
│      T1 (basic) → GPT-3.5                                       │
│      T2 (advanced) → Claude                                     │
│      T3 (premium) → GPT-4                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. TOOL DETECTION                                               │
│    • Analyze message for SQL patterns                           │
│    • Check for Zabbix/FortiGate keywords                        │
│    • Identify required tools                                    │
│    • Decision: Direct LLM call or tool-assisted                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. LLM CALL                                                     │
│    • Send context: conversation history, tools available       │
│    • Constraint: max tokens, temperature                        │
│    • Get response with tool calls or text                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. TOOL EXECUTION (if needed)                                   │
│    For each tool call:                                          │
│    • Look up tool in registry                                   │
│    • Validate input against schema                              │
│    • Execute tool (timeout: 30s)                                │
│    • Format result                                              │
│    • Add to context for final answer                            │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. QUALITY CHECK (Quality Checker)                              │
│    • Safety checks (no harmful content)                         │
│    • Format validation                                          │
│    • Length checks (not too verbose)                            │
│    • Escalation if quality low                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. RESPONSE & LOGGING                                           │
│    • Save message to database                                   │
│    • Calculate and store cost                                   │
│    • Update usage metrics                                       │
│    • Log to audit trail                                         │
│    • Send response to UI                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Tool Execution Flow (Detailed)

```
Tool Call from LLM
    ↓
Tool Registry Lookup
    ├─ Tool found? → Continue
    └─ Not found? → Error response

    ↓
Tool Definition Retrieved
    • Input schema (Zod)
    • Description
    • Implementation function

    ↓
Input Validation
    • Parse JSON
    • Validate against schema
    • Type check
    ├─ Valid? → Continue
    └─ Invalid? → Return schema error

    ↓
Pre-Execution Checks
    • User has permission?
    • Rate limit allow?
    • User quota available?
    ├─ All OK? → Continue
    └─ Check failed? → Return error

    ↓
Tool Execution
    ├─ SQL Tools → PostgreSQL query
    ├─ Log Tools → Zabbix/FortiGate API call
    ├─ Network Tools → Network validation
    └─ Timeout after 30s

    ↓
Result Processing
    • Format output
    • Truncate if too large
    • Extract key info
    • Calculate cost

    ↓
Metrics Update
    • Record tool call
    • Update execution time
    • Track success/failure
    • Log to audit trail

    ↓
Return to LLM Context
    • Add as assistant message
    • Continue generation
```

### 3. Authentication & Authorization Flow

```
Browser → Web UI
    ↓
POST /api/v1/auth/login
    ├─ Email/Password validation
    ├─ User lookup from database
    ├─ Bcrypt password check
    │   ├─ Match? → Generate JWT token
    │   └─ No match? → 401 Unauthorized
    ├─ Load user permissions based on role
    └─ Return JWT token + user data

    ↓
Web UI stores token in localStorage
    ↓
All subsequent requests include: Authorization: Bearer <JWT>

    ↓
On request:
    1. Extract JWT from header
    2. Verify signature with JWT_SECRET
    3. Decode token payload (user ID, role)
    4. Load user from database
    5. Check role permissions
    6. Allow/deny operation

    ↓
Admin routes protected with requireAdmin middleware
    ├─ Check user role
    ├─ Must be 'admin'
    └─ Audit log all admin actions
```

### 4. Caching Strategy

```
Cache Hierarchy:
    ↓
Application (In-Memory) [Fastest, smallest]
    ↓ (Miss)
Redis Cache [Fast, medium]
    ├─ Models list (TTL: 1h)
    ├─ Conversations (TTL: 1h)
    ├─ User permissions (TTL: 30m)
    ├─ Rate limit counters (TTL: varies)
    └─ Response cache (TTL: varies)
    ↓ (Miss)
Database [Slow, large]
    ├─ Query & store
    └─ Update cache
```

### 5. Error Handling & Escalation Flow

```
Request Processing
    ↓
Error occurs (LLM fail, tool fail, policy violation)
    ↓
Error Categorization:
    ├─ Retryable? (network timeout, transient)
    │  └─ Retry up to 3 times with exponential backoff
    ├─ Non-retryable? (invalid input, auth failed)
    │  └─ Return error immediately
    └─ Critical? (system down, data loss risk)
       └─ Escalate & alert

    ↓
Response Generation:
    • Error code (standard error codes)
    • Error message (user-friendly)
    • Details (for debugging)
    • Suggestion (how to fix)

    ↓
Logging:
    • Error level log
    • Stack trace
    • Context (user, correlation ID)
    • Metrics increment

    ↓
Audit Log:
    • Record failure
    • Store error details
    • User notification (if needed)

    ↓
Return Error Response
```

---

## 📊 Data Model Overview

### Core Entities

```sql
Users
├─ id (PK)
├─ email (unique)
├─ password_hash
├─ name
├─ role (admin, operator, viewer)
├─ status (active, disabled)
└─ created_at, last_login

Conversations
├─ id (PK)
├─ user_id (FK)
├─ title
├─ topic (inferred from messages)
├─ summary (cached)
├─ message_count
├─ created_at, updated_at

Messages
├─ id (PK)
├─ conversation_id (FK)
├─ role (user, assistant)
├─ content
├─ tool_calls (JSON)
├─ cost (calculated)
├─ model_used
└─ created_at

Requests (for metrics)
├─ id (PK)
├─ user_id (FK)
├─ model (gpt-4, claude, etc)
├─ provider (openrouter, anthropic)
├─ status_code
├─ latency_ms
├─ cost
├─ error_type
└─ created_at

Policies
├─ id (PK)
├─ name
├─ type (cost_limit, rate_limit, quota, access_control)
├─ config (JSON)
├─ status (active, inactive)
└─ created_at

Tool Calls (audit)
├─ id (PK)
├─ user_id (FK)
├─ tool_name
├─ input (JSON)
├─ output (JSON)
├─ status (success, failed)
├─ duration_ms
├─ cost
└─ created_at
```

---

## 🔌 External Integrations

| Integration | Purpose | Mô Tả | Giao Diện | Status |
|------------|---------|-------|----------|--------|
| **OpenRouter API** | LLM Provider | Truy cập 200+ LLM models qua single API. Handles billing. | REST API | ✅ Active |
| **PostgreSQL** | Database | Persistent storage cho users, conversations, policies, audit logs. | psycopg2 | ✅ Active |
| **Redis** | Cache & Sessions | In-memory cache, rate limit counters, session store. | redis-py | ✅ Active |
| **Zabbix API** | Monitoring | Fetch alerts, problems, metrics từ Zabbix. Requires Zabbix server. | JSON-RPC | 🚧 In Dev |
| **FortiGate API** | Firewall Logs | Get firewall events, traffic logs, policies. Requires FortiGate. | REST API | 🚧 In Dev |
| **Syslog** | Log Collection | Collect system logs từ servers. Supports RFC 3164. | UDP 514 | 🚧 In Dev |
| **Jaeger** | Distributed Tracing | Trace requests across services. Visualization & analysis. | gRPC | ✅ Configured |
| **Prometheus** | Metrics | Scrape metrics cho Grafana dashboards. Port 9090. | HTTP | ✅ Configured |
| **Grafana** | Dashboards | Visualization của metrics. Custom dashboards. | HTTP | ✅ Configured |
| **Loki** | Log Aggregation | Central log storage. Queries via LogQL. | HTTP | ✅ Configured |

---

## 📈 Metrics & Monitoring

### Key Metrics Tracked

| Metric | Type | Purpose | Label |
|--------|------|---------|-------|
| `requests_total` | Counter | Total API requests | method, endpoint, status |
| `request_duration_seconds` | Histogram | API latency | endpoint, status |
| `llm_calls_total` | Counter | LLM API calls | model, provider, status |
| `llm_cost_total` | Counter | Cumulative cost | model, provider |
| `tool_calls_total` | Counter | Tool executions | tool, status |
| `tool_duration_seconds` | Histogram | Tool execution time | tool |
| `cache_hits_total` | Counter | Cache hit count | cache_type |
| `cache_misses_total` | Counter | Cache miss count | cache_type |
| `db_query_duration_seconds` | Histogram | Database query latency | operation |
| `db_connection_pool` | Gauge | Active connections | state (idle/active) |
| `policy_violations_total` | Counter | Policy check failures | policy_type |

---

## 🚀 Request Lifecycle Summary

```
1. REQUEST ARRIVES (Web UI / CLI / API Client)
   ↓
2. SERVER RECEIVES (Fastify HTTP handler)
   ↓
3. MIDDLEWARE (Auth, correlation ID, rate limiting)
   ↓
4. VALIDATION (Input schema, JWT)
   ↓
5. EXECUTION:
   • Policy check (cost, rate, quota)
   • Routing (choose model tier)
   • LLM call (OpenRouter API)
   • Tool execution (if needed)
   • Quality check
   ↓
6. RESPONSE FORMATTING (JSON, stream, etc)
   ↓
7. LOGGING & METRICS (Audit, Prometheus)
   ↓
8. RESPONSE SENT (HTTP 200, error code, etc)
   ↓
9. CLIENT RECEIVES & DISPLAYS
```

---

## 🔐 Security Layers

| Layer | Mechanism | Details |
|-------|-----------|---------|
| **Authentication** | JWT Tokens | Tokens include: user ID, email, role. Expires in 24h. Stored in localStorage. |
| **Authorization** | RBAC | 3 roles: admin (full), operator (manage), viewer (read-only). Middleware checks permissions. |
| **API Keys** | Bearer Tokens | LLM API keys stored in .env, never exposed to client. |
| **Rate Limiting** | Redis Counters | Per-user rate limits. Configurable by policy. |
| **Input Validation** | Zod Schema | All inputs validated against schema before processing. |
| **SQL Injection** | Parameterized Queries | All DB queries use parameterized statements. No string concatenation. |
| **CORS** | Whitelist | CORS enabled for web-ui domain only. |
| **Audit Logging** | PostgreSQL | All actions logged: user, timestamp, action, result. |
| **Encryption** | bcrypt + JWT_SECRET | Passwords hashed with bcrypt. JWTs signed with secret. |

---

## 🎯 Quick Start for Understanding Flow

**Minimal request path:**
1. User clicks "Send" in chat
2. Web-UI: `POST /api/v1/conversations/{id}/messages`
3. Proxy: `/api/` → `http://gateway-api:3000/`
4. Gateway-API Handler receives, validates, extracts user from JWT
5. Policy Engine approves (within limits)
6. Router chooses LLM (e.g., GPT-3.5 for T1)
7. OpenRouter API called → response
8. Tools? If yes → Tool execution loop
9. Quality check → Audit log
10. Response sent back → Web-UI displays → User sees answer

**Total latency: ~2-5 seconds** (varies by LLM, tool complexity)

---

*Last Updated: Dec 24, 2025*
*Version: 6.0.0*

