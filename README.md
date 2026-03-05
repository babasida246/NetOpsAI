# NetOpsAI Gateway

> **AI-Powered IT Operations Platform** — Orchestrate LLM models, manage IT assets, and automate network operations across Cloud and Edge deployments.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-orange.svg)](https://kit.svelte.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-yellow.svg)](https://fastify.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Tổng quan

NetOpsAI Gateway là một nền tảng monorepo hỗ trợ hai chế độ triển khai:

| Chế độ | Apps | Mô tả |
|--------|------|-------|
| **Cloud** | `cloud-api` + `web-cloud` | API gateway đầy đủ + dashboard cloud |
| **Edge** | `edge-api` + `web-edge` | Lightweight agent chạy tại site/chi nhánh |
| **Web UI** | `web-ui` | Admin dashboard chính (SvelteKit) |
| **MCP** | `gateway-mcp` | Model Context Protocol server cho AI integrations |
| **CLI** | `gateway-cli` | Command-line interface cho automation |

## Tính năng

| Module | Mô tả |
|--------|-------|
| 🤖 **AI Gateway** | Multi-provider LLM orchestration, tier-based routing, chat |
| 📦 **IT Asset Management** | Vòng đời thiết bị, inventory, quản lý kho, bảo trì |
| 🗺 **CMDB** | Configuration Items, relationships, services, topology |
| 🔧 **Network Operations** | Device management, change calendar, rulepacks |
| 📊 **Analytics** | Dashboard, cost analysis, depreciation reports |
| ⚙️ **Automation** | Rules engine, scheduled tasks, webhook integrations |
| 🔐 **Security & RBAC** | Role-based access, permission matrix, audit log, JIT access |
| 📡 **MCP Servers** | Specialized integrations (net-tools, assets, AI models) |

## Quick Start

### Yêu cầu

- Node.js 20+, pnpm 8+
- Docker & Docker Compose
- PostgreSQL 16+, Redis 7+

### 1. Cài đặt

```bash
git clone <repo-url>
cd "MCP server"
pnpm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env với credentials thực tế
```

### 3. Chạy với Docker (Khuyến nghị)

```bash
# Edge deployment (local dev)
docker compose -f docker-compose.edge.data.yml up -d   # PostgreSQL + Redis
docker compose -f docker-compose.edge.app.yml up -d    # API + Web

# Cloud deployment
docker compose -f docker-compose.cloud.data.yml up -d
docker compose -f docker-compose.cloud.app.yml up -d
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| Edge API | http://localhost:3001 |
| Cloud API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/docs |
| pgAdmin | http://localhost:5050 |
| RedisInsight | http://localhost:5540 |

### 4. Chạy Development mode

```bash
# Edge (default)
pnpm dev

# Cloud
pnpm dev:cloud

# Chỉ Web UI
pnpm dev:web
```

### 5. Setup Wizard (lần đầu)

Mở http://localhost:5173/setup → thực hiện 6 bước:
1. Database initialization
2. Tạo tài khoản admin
3. System settings
4. AI provider configuration
5. Seed data (optional)
6. Hoàn tất

## Cấu trúc Project

```
MCP server/
├── apps/
│   ├── cloud-api/        # @apps/cloud-api — Fastify API (Cloud mode, port 3000)
│   ├── edge-api/         # @apps/edge-api — Fastify API (Edge mode, port 3001)
│   ├── gateway-mcp/      # MCP protocol gateway
│   ├── gateway-cli/      # CLI interface
│   ├── web-cloud/        # SvelteKit dashboard (Cloud)
│   ├── web-edge/         # SvelteKit dashboard (Edge)
│   └── web-ui/           # SvelteKit admin UI chính (port 5173)
├── packages/
│   ├── domain/           # Entities & value objects
│   ├── application/      # Use cases, services (CMDB, Analytics, Automation…)
│   ├── contracts/        # Shared types & interfaces
│   ├── infra-postgres/   # PostgreSQL repositories
│   ├── infra-redis/      # Redis cache client
│   ├── infra-netdevice/  # Network device parsers
│   ├── infra-vector/     # Vector DB client
│   ├── mcp-servers/      # MCP server implementations
│   ├── providers/        # AI provider adapters
│   ├── security/         # Auth & JWT
│   ├── tools/            # Tool registry & definitions
│   ├── observability/    # Logging (Pino) & Prometheus metrics
│   └── config/           # Shared configuration
├── db/
│   ├── migrations/       # SQL migration files
│   ├── init/             # Init scripts (tenants, entitlements)
│   └── seed-*.sql        # Seed data files
├── docker/               # Docker configs (nginx, grafana, prometheus, loki…)
├── scripts/              # Utility scripts (deploy, smoke-test, i18n audit…)
├── tests/
│   └── e2e/              # Playwright E2E tests
└── docs/                 # Tài liệu chi tiết
```

## Lệnh thường dùng

```bash
# --- Development ---
pnpm dev               # Edge mode (edge-api + web-edge)
pnpm dev:cloud         # Cloud mode (cloud-api + web-cloud)
pnpm dev:web           # Web UI admin (port 5173)

# --- Build ---
pnpm build             # Build tất cả
pnpm build:api         # Build cloud-api
pnpm build:edge        # Build edge-api
pnpm build:web         # Build web-ui

# --- Testing ---
pnpm test              # Unit tests (Vitest, tất cả packages)
pnpm test:unit         # Unit tests chỉ (no watch)
pnpm test:integration  # Integration tests (cloud-api)
pnpm test:e2e          # E2E tests (Playwright)
pnpm test:e2e:web-ui   # E2E cho Web UI

# --- Docker ---
pnpm docker:up         # Start tất cả containers
pnpm docker:down       # Stop containers
pnpm docker:logs       # Xem logs
pnpm docker:rebuild    # Rebuild images + restart

# --- Code Quality ---
pnpm lint              # ESLint
pnpm typecheck         # TypeScript check
pnpm check-errors      # Lint + typecheck

# --- Deployment ---
pnpm deploy            # Deploy (scripts/deploy.sh)
pnpm validate          # Validate deployment
```

## Biến môi trường chính

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret cho access tokens |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENAI_API_KEY` | OpenAI API key (tùy chọn) |

Xem `.env.example` để biết đầy đủ.

## Tài liệu

Xem thư mục [`docs/`](docs/README.md):

| File | Nội dung |
|------|----------|
| [Quick Start](docs/01-QUICK-START.md) | Chạy trong 5 phút |
| [Installation](docs/02-INSTALLATION.md) | Hướng dẫn cài đặt chi tiết |
| [Configuration](docs/03-CONFIGURATION.md) | Cấu hình môi trường & hệ thống |
| [API Overview](docs/api/OVERVIEW.md) | REST API, authentication, pagination |
| [Architecture](docs/dev/ARCHITECTURE.md) | Kiến trúc hệ thống, data flow |
| [Docker Deployment](docs/deploy/DOCKER.md) | Triển khai với Docker Compose |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20, TypeScript 5.3 |
| API Framework | Fastify 5 |
| Database | PostgreSQL 16 + Redis 7 |
| Frontend | SvelteKit 2, Svelte 5, Tailwind CSS |
| AI / LLM | OpenRouter, OpenAI, Anthropic adapters |
| MCP | Model Context Protocol (gateway-mcp) |
| Testing | Vitest, Playwright |
| Observability | Pino logging, Prometheus metrics, Grafana, Loki |
| Container | Docker Compose (cloud + edge profiles) |

## License

MIT — see [LICENSE](LICENSE)

---

*NetOpsAI Gateway v6.0 — Building the bridge between AI and IT Operations*
