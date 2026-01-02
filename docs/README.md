# MCP Server Documentation

Welcome to the MCP Server documentation. This guide will help you understand, deploy, and extend the AI Gateway platform.

## 📚 Documentation Index

### Getting Started
- **[Quick Start](../README.md#quick-start)** - Get up and running in 5 minutes
- **[Setup Guide](./SETUP.md)** - Detailed installation and configuration
- **[Development Guide](./DEVELOPMENT.md)** - Local development workflow

### Architecture
- **[System Architecture](./architecture/README.md)** - High-level system design
- **[Clean Architecture](./architecture/CLEAN_ARCHITECTURE.md)** - DDD patterns and layers
- **[Components Table](./ARCHITECTURE_COMPONENTS_TABLE.md)** - All system components

### API Documentation
- **[REST API Reference](./api/README.md)** - Complete endpoint documentation
- **[Gateway API Index](./GATEWAY_API_INDEX.md)** - Documentation index for Gateway API
- **[Gateway API Features](./GATEWAY_API_FEATURES.md)** - Detailed feature documentation (1078 lines)
- **[Gateway API Quick Summary](./GATEWAY_API_QUICK.md)** - Quick reference guide
- **[Gateway API Cleanup](./GATEWAY_API_CLEANUP.md)** - Deprecated files & cleanup roadmap
- **[MCP Protocol](./mcp/README.md)** - Model Context Protocol specs

### Operations
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment
- **[Monitoring](./deployment/MONITORING.md)** - Observability stack setup

### Testing
- **[Testing Guide](./TESTING_QUICK_REFERENCE.md)** - Testing strategy

### Tools
- **[Database GUI](./DATABASE_GUI_TOOLS.md)** - pgAdmin setup and usage
- **[Gateway API Cleanup Guide](./GATEWAY_API_QUICK.md#-files-to-remove--cleanup)** - Deprecated files and cleanup recommendations

### Guides
- **[Chat Usage Guide](./guides/HUONG_DAN_SU_DUNG_CHAT.md)** - How to use chat features
- **[Admin Guide](./guides/ADMIN_QUICK_START.md)** - Admin panel usage
- **[Developer Guide](./guides/DEVELOPER_GUIDE.md)** - Contributing code

### Reference
- **[Quick Reference](./QUICK_REFERENCE.md)** - Common commands and patterns
- **[Accessibility](./ACCESSIBILITY.md)** - WCAG compliance guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Web UI (SvelteKit)                   │
│                     http://localhost:5173                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/SSE
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Gateway API (Fastify)                     │
│                    http://localhost:3000                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Clean Architecture Layers                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Domain Layer (Entities, Value Objects)        │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │  Use Cases (Business Logic)                    │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │  Services (Chat, Workflow, Policy)             │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │  Infrastructure (Repositories, Adapters)       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└───┬─────────────┬──────────────┬──────────────┬────────────┘
    │             │              │              │
    ▼             ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐
│Postgres │  │  Redis  │  │   LLMs   │  │ Observability│
│  :5432  │  │  :6379  │  │(Multiple)│  │ (Prom/Loki)  │
└─────────┘  └─────────┘  └──────────┘  └──────────────┘
```

## 🎯 Key Concepts

### 1. Clean Architecture

The codebase follows Clean Architecture principles with clear separation:

- **Domain Layer**: Business entities and rules (framework-agnostic)
- **Use Case Layer**: Application-specific business logic
- **Interface Layer**: HTTP controllers, WebSocket handlers
- **Infrastructure Layer**: Database, cache, external services

### 2. Tier-Based Routing

Requests are routed through 4 tiers based on complexity and importance:

- **Tier 0 (Free)**: Mistral Small, Gemini Flash - Fast, low-cost
- **Tier 1 (Standard)**: GPT-3.5, Claude Haiku - Balanced
- **Tier 2 (Advanced)**: GPT-4, Claude Sonnet - High quality
- **Tier 3 (Premium)**: GPT-4-Turbo, Claude Opus - Best quality

Quality metrics trigger automatic escalation to higher tiers.

### 3. Observability

Comprehensive monitoring with:

- **Structured Logs**: JSON logs with correlation IDs (Pino + Loki)
- **Metrics**: Prometheus exporters for HTTP, LLM, costs
- **Dashboards**: Grafana with pre-built dashboards
- **Alerting**: Prometheus Alertmanager integration

## 📊 Core Entities

```typescript
// User Entity
{
  id: string
  email: string
  role: 'admin' | 'user'
  tier: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'deleted'
}

// Conversation Entity
{
  id: string
  userId: string
  title: string
  archived: boolean
  pinned: boolean
}

// Message Entity
{
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  tokens?: number
  cost?: number
}
```

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/mcp-server.git
cd mcp-server
pnpm install

# Setup environment
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Run migrations
pnpm -F @apps/gateway-api migrate:latest

# Start development
pnpm dev
```

## 📞 Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Browse guides and references

---

**Next Steps**: Start with the [Setup Guide](./SETUP.md) or explore the [API Reference](./api/README.md).
