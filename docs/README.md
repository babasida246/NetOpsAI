# NetOpsAI Gateway — Documentation

> Tài liệu kỹ thuật cho nền tảng NetOpsAI Gateway

## Mục lục

### Bắt đầu nhanh

| # | Tài liệu | Mô tả |
|---|----------|-------|
| 1 | [Quick Start](./01-QUICK-START.md) | Chạy trong 5 phút |
| 2 | [Installation](./02-INSTALLATION.md) | Hướng dẫn cài đặt chi tiết |
| 3 | [Configuration](./03-CONFIGURATION.md) | Cấu hình môi trường & hệ thống |

### Modules

| File | Mô tả |
|------|-------|
| [AUTH](./modules/AUTH.md) | Authentication, setup wizard, RBAC |
| [CHAT](./modules/CHAT.md) | AI chat interface và model management |
| [ASSETS](./modules/ASSETS.md) | IT asset lifecycle management |
| [CMDB](./modules/CMDB.md) | Configuration Management Database |
| [WAREHOUSE](./modules/WAREHOUSE.md) | Spare parts và inventory |
| [NETOPS](./modules/NETOPS.md) | Device và configuration management |
| [QLTS](./modules/QLTS.md) | Purchase plans, asset increases |
| [MAINTENANCE](./modules/MAINTENANCE.md) | Repair tickets, scheduled maintenance |

### API Reference

| File | Mô tả |
|------|-------|
| [API Overview](./api/OVERVIEW.md) | REST API, authentication, pagination |

### Development

| File | Mô tả |
|------|-------|
| [Architecture](./dev/ARCHITECTURE.md) | Kiến trúc hệ thống, data flow |
| [Contributing](./dev/CONTRIBUTING.md) | Hướng dẫn đóng góp |

### Deployment

| File | Mô tả |
|------|-------|
| [Docker](./deploy/DOCKER.md) | Docker Compose — Cloud & Edge |

---

## Quick Links

| | |
|-|-|
| [Root README](../README.md) | Tổng quan & Quick Start |
| [Quick Start](./01-QUICK-START.md) | Setup trong 5 phút |
| [API Reference](./api/OVERVIEW.md) | REST API documentation |
| [Docker Guide](./deploy/DOCKER.md) | Container deployment |

## Project Structure

```
MCP server/
├── apps/
│   ├── cloud-api/    # Fastify REST API (Cloud mode, port 3000)
│   ├── edge-api/     # Fastify REST API (Edge mode, port 3001)
│   ├── gateway-mcp/  # MCP protocol gateway
│   ├── gateway-cli/  # CLI interface
│   ├── web-cloud/    # SvelteKit (Cloud)
│   ├── web-edge/     # SvelteKit (Edge)
│   └── web-ui/       # SvelteKit Admin UI (port 5173)
├── packages/         # Shared packages (domain, application, infra…)
├── db/               # Migrations & seed data
├── docker/           # Docker configs
├── scripts/          # Utility scripts (deploy, i18n audit…)
├── tests/e2e/        # Playwright E2E tests
└── docs/             # This documentation
```

## Technology Stack

| Layer | Tech |
|-------|------|
| API | Fastify 5, TypeScript 5.3, Node.js 20 |
| Database | PostgreSQL 16 + Redis 7 |
| Frontend | SvelteKit 2, Svelte 5, TailwindCSS |
| AI / LLM | OpenRouter, OpenAI, Anthropic |
| MCP | Model Context Protocol |
| Testing | Vitest (unit), Playwright (E2E) |
| Observability | Pino, Prometheus, Grafana, Loki |
| Container | Docker Compose (cloud + edge profiles) |
