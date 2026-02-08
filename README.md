# NetOpsAI Gateway

> **AI-Powered IT Operations Platform** – Orchestrate LLM models, manage IT assets, and automate network operations.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

NetOpsAI Gateway is a comprehensive monorepo platform that provides:

- **🤖 AI Gateway** – Multi-provider LLM orchestration with tier-based routing
- **📦 IT Asset Management** – Full lifecycle tracking, inventory, and maintenance
- **🔧 Network Operations** – Device configuration, change management, rulepacks
- **🛠️ Tool Registry** – Extensible tools with AJV schema validation
- **📡 MCP Servers** – Model Context Protocol servers for specialized integrations
- **🖥️ Web UI** – Modern SvelteKit dashboard with i18n (EN/VI)

## Features

| Module | Description |
|--------|-------------|
| **Chat/Orchestrator** | Multi-model conversation with automatic tier escalation |
| **Model Registry** | Manage AI providers (OpenRouter, OpenAI, Anthropic) |
| **Asset Management** | Assets, vendors, models, categories, locations |
| **CMDB** | Configuration Items, relationships, services |
| **Warehouse** | Spare parts, stock documents, movements |
| **Maintenance** | Repair orders, tickets, workflow requests |
| **Inventory** | Periodic inventory sessions and scanning |
| **NetOps** | Device management, changes, rulepacks, configs |
| **Observability** | Structured logging (Pino), Prometheus metrics |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+ (or via Docker)
- Redis 7+ (or via Docker)

### 1. Clone & Install

```bash
git clone https://github.com/babasida246/NetOpsAI.git
cd NetOpsAI

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start with Docker

```bash
# Start all services (Postgres, Redis, API, Web UI)
docker-compose up -d

# View logs
docker-compose logs -f gateway-api
```

### 3b. Start Edge Stack

```bash
# Edge data services (Postgres + Redis)
docker compose -f docker-compose.edge.data.yml up -d

# Edge apps (edge-api + web-edge)
docker compose -f docker-compose.edge.app.yml up -d
```

### 4. Start Development Mode

```bash
# Start API + MCP Gateway
pnpm dev

# In another terminal, start Web UI
cd apps/web-ui && pnpm dev
```

### 5. Access

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/docs |
| pgAdmin | http://localhost:5050 |

## Project Structure

```
netopsai/
├── apps/
│   ├── api/                 # Fastify API server
│   ├── gateway-mcp/         # MCP protocol gateway
│   ├── gateway-cli/         # CLI interface
│   └── web-ui/              # SvelteKit frontend
├── packages/
│   ├── domain/              # Domain entities & value objects
│   ├── application/         # Use cases & services
│   ├── contracts/           # Shared types & interfaces
│   ├── infra-postgres/      # PostgreSQL repositories
│   ├── infra-redis/         # Redis cache client
│   ├── infra-netdevice/     # Network device parsers
│   ├── tools/               # Tool registry & definitions
│   ├── mcp-servers/         # MCP server implementations
│   ├── observability/       # Logging & metrics
│   ├── security/            # Auth & JWT
│   └── config/              # Shared configuration
├── docker/                  # Docker configs (nginx, grafana, etc.)
├── docs/                    # Documentation
└── scripts/                 # Utility scripts
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/GETTING_STARTED.md) | Setup and first run |
| [Architecture](docs/ARCHITECTURE.md) | System design & data flow |
| [API Reference](docs/API.md) | REST API endpoints |
| [Data Model](docs/DATA_MODEL.md) | Database schema |
| [Tools](docs/TOOLS.md) | Tool registry guide |
| [MCP Servers](docs/MCP_SERVERS.md) | MCP integrations |
| [Deployment](docs/DEPLOYMENT.md) | Docker & production |
| [Runbook](docs/RUNBOOK.md) | Operations & troubleshooting |
| [Development](docs/DEVELOPMENT.md) | Coding standards |
| [Contributing](docs/CONTRIBUTING.md) | How to contribute |

## Scripts

```bash
# Development
pnpm dev              # Start API + MCP gateway
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests (Playwright)
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check

# Docker
pnpm docker:up        # Start containers
pnpm docker:down      # Stop containers
pnpm docker:logs      # View logs
pnpm docker:build     # Rebuild images

# Validation
pnpm validate         # Validate deployment
```

## Tech Stack

- **Runtime**: Node.js 20, TypeScript 5.3
- **API Framework**: Fastify 5
- **Database**: PostgreSQL 15 + Redis 7
- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS
- **Testing**: Vitest, Playwright
- **Build**: tsup, Vite
- **Container**: Docker, Docker Compose

## License

MIT License – see [LICENSE](LICENSE) for details.

---

**NetOpsAI** – Bridging AI and IT Operations
