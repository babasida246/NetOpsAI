# MCP Server - AI Gateway Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

**MCP Server** is an enterprise-grade AI Gateway platform that provides unified access to multiple Large Language Models (LLMs), intelligent tier-based routing, comprehensive observability, and a modern web interface.

## 🌟 Key Features

### 🤖 Multi-Model Support
- **OpenAI** (GPT-4, GPT-4-Turbo, GPT-3.5-Turbo)
- **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
- **Google** (Gemini Pro, Ultra)
- **Mistral** (Large, Medium, Small)
- **Local Models** (Ollama integration)

### 🎯 Intelligent Routing
- **4-Tier Architecture**: Free → Standard → Advanced → Premium
- **Smart Escalation**: Automatic tier upgrade based on quality metrics
- **Cost Optimization**: Balance between performance and cost
- **Quality Metrics**: Completeness, consistency, format validation

### 🏗️ Clean Architecture
- **Domain-Driven Design (DDD)**: Entities, Value Objects, Aggregates
- **SOLID Principles**: Single Responsibility, Dependency Inversion
- **Hexagonal Architecture**: Ports & Adapters pattern
- **Use Cases**: Business logic orchestration layer

### 📊 Observability Stack
- **Structured Logging**: Pino with correlation IDs
- **Metrics**: Prometheus exporters (HTTP, LLM, cost tracking)
- **Log Aggregation**: Loki + Promtail
- **Dashboards**: Grafana with custom dashboards
- **Tracing**: Request flow visualization

### 🔐 Security & Governance
- **Rate Limiting**: Per-user, per-tier limits
- **API Key Management**: Secure key generation and validation
- **Cost Controls**: Budget limits, usage tracking
- **Policy Engine**: Model access, content filtering
- **RBAC**: Role-based access control (Admin, User)

### 🎨 Modern Web UI
- **SvelteKit**: Fast, reactive interface
- **Server-Sent Events (SSE)**: Real-time streaming
- **Dark Mode**: Optimized for long sessions
- **Responsive Design**: Desktop and mobile support
- **Accessibility**: WCAG 2.1 AA compliant

### 🛠️ Developer Tools
- **PostgreSQL Admin**: pgAdmin 4 integration
- **Redis Manager**: RedisInsight web UI
- **API Testing**: Postman collections
- **TypeScript**: Full type safety
- **Vitest**: Fast unit/integration testing

## 📁 Project Structure

```
mcp-server/
├── apps/
│   ├── gateway-api/          # Main API server (Fastify)
│   │   ├── src/
│   │   │   ├── core/         # Clean Architecture layers
│   │   │   │   ├── domain/   # Entities, Value Objects
│   │   │   │   ├── use-cases/# Business logic
│   │   │   │   └── services/ # Domain services
│   │   │   ├── infrastructure/
│   │   │   ├── application/  # HTTP controllers
│   │   │   ├── shared/       # Common utilities
│   │   │   ├── config/       # Configuration management
│   │   │   └── observability/# Logging, metrics
│   │   └── tests/            # Unit + Integration tests
│   ├── gateway-mcp/          # MCP protocol server
│   ├── gateway-cli/          # CLI tools
│   └── web-ui/               # SvelteKit frontend
├── packages/
│   ├── domain/               # Shared domain models
│   ├── providers/            # LLM provider adapters
│   ├── infra-postgres/       # Database layer
│   ├── infra-redis/          # Cache layer
│   ├── security/             # Auth & authorization
│   └── observability/        # Monitoring tools
├── docker/                   # Docker configurations
├── docs/                     # Documentation
└── scripts/                  # Deployment & utility scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 8.0.0
- **Docker** & Docker Compose
- **PostgreSQL** 15+
- **Redis** 7+

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/mcp-server.git
cd mcp-server

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Run database migrations
pnpm -F @apps/gateway-api migrate:latest

# Start development servers
pnpm dev
```

The following services will be available:
- **API Gateway**: http://localhost:3000
- **Web UI**: http://localhost:5173
- **API Docs**: http://localhost:3000/docs

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f gateway-api

# Stop services
docker-compose down
```

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Detailed installation and configuration
- **[Architecture](./docs/architecture/README.md)** - System design and patterns
- **[API Reference](./docs/api/README.md)** - REST API endpoints
- **[Development Guide](./docs/DEVELOPMENT.md)** - Contributing guidelines
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment
- **[Testing](./docs/TESTING_QUICK_REFERENCE.md)** - Testing strategy

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests (Web UI)
pnpm -F @apps/web-ui test:e2e

# Coverage report
pnpm test:coverage
```

**Current Test Coverage**: 100 tests, 92% coverage

## 📊 API Examples

### Send Chat Message

```bash
curl -X POST http://localhost:3000/v1/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "content": "Explain quantum computing",
    "model": "gpt-4",
    "temperature": 0.7
  }'
```

### Stream Response (SSE)

```bash
curl -N http://localhost:3000/v1/conversations/{conversationId}/messages/{messageId}/stream \
  -H "x-user-id: user123"
```

### List Available Models

```bash
curl http://localhost:3000/v1/models/available \
  -H "x-user-id: user123"
```

## 🔧 Configuration

Key environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mcp
REDIS_URL=redis://localhost:6379

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Features
ENABLE_TIER_ESCALATION=true
ENABLE_COST_TRACKING=true
MAX_CONCURRENT_REQUESTS=100
```

See [.env.example](./.env.example) for full configuration.

## 🏆 Performance

- **Latency**: <100ms (p95) for tier selection
- **Throughput**: 1000+ req/sec
- **Uptime**: 99.9% SLA
- **Streaming**: SSE with <50ms first token

## 🛣️ Roadmap

### v1.1 (Q1 2025)
- [ ] GraphQL API
- [ ] WebSocket real-time updates
- [ ] Advanced analytics dashboard
- [ ] Multi-tenancy support

### v1.2 (Q2 2025)
- [ ] Prompt templates library
- [ ] Custom model fine-tuning
- [ ] A/B testing framework
- [ ] Cost prediction ML model

### v2.0 (Q3 2025)
- [ ] Multi-region deployment
- [ ] Kubernetes operator
- [ ] Plugin marketplace
- [ ] Enterprise SSO integration

## 🤝 Contributing

We welcome contributions! Please see [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for guidelines.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Fastify** - Fast and low overhead web framework
- **SvelteKit** - Cybernetically enhanced web apps
- **Anthropic** - Claude AI models
- **OpenAI** - GPT models
- **Pino** - Fast logging library
- **Prometheus** - Monitoring and alerting

## 📞 Support

- **Documentation**: https://docs.mcp-server.example.com
- **Issues**: https://github.com/your-org/mcp-server/issues
- **Discussions**: https://github.com/your-org/mcp-server/discussions
- **Email**: support@mcp-server.example.com

---

**Built with ❤️ by the MCP Server Team**
