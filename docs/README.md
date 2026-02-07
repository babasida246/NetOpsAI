# IT Service Hub Documentation

> Complete documentation for the IT Service Hub platform

## 📚 Documentation Index

### Getting Started
- [Quick Start Guide](./01-QUICK-START.md) - Get up and running in 5 minutes
- [Installation Guide](./02-INSTALLATION.md) - Detailed installation instructions
- [Configuration](./03-CONFIGURATION.md) - Environment and system configuration

### Core Modules
- [Authentication](./modules/AUTH.md) - User authentication, setup wizard, RBAC
- [Chat & AI](./modules/CHAT.md) - AI chat interface and model management
- [Asset Management](./modules/ASSETS.md) - IT asset lifecycle management
- [CMDB](./modules/CMDB.md) - Configuration Management Database
- [Warehouse](./modules/WAREHOUSE.md) - Spare parts and inventory
- [Network Operations](./modules/NETOPS.md) - Device and configuration management
- [QLTS](./modules/QLTS.md) - Purchase plans and asset increases
- [Maintenance](./modules/MAINTENANCE.md) - Repair tickets and scheduled maintenance

### API Reference
- [API Overview](./api/OVERVIEW.md) - REST API documentation, authentication, pagination

### Development
- [Architecture](./dev/ARCHITECTURE.md) - System architecture overview
- [Contributing](./dev/CONTRIBUTING.md) - How to contribute

### Deployment
- [Docker Deployment](./deploy/DOCKER.md) - Docker Compose setup

---

## Quick Links

| Topic | Description |
|-------|-------------|
| [Quick Start](./01-QUICK-START.md) | 5-minute setup guide |
| [Setup Wizard](./modules/AUTH.md#setup-wizard) | First-time system configuration |
| [API Reference](./api/OVERVIEW.md) | Developer API documentation |
| [Docker Guide](./deploy/DOCKER.md) | Container deployment |

## Project Structure

```
IT-Service-Hub/
├── apps/
│   ├── api/           # Fastify REST API (Port 3000)
│   ├── web-ui/        # SvelteKit Web Interface (Port 8080)
│   ├── gateway-mcp/   # AI MCP Server (Port 3001)
│   └── gateway-cli/   # CLI Tool
├── packages/          # Shared packages
├── db/               # Database schemas and migrations
├── docker/           # Docker configurations
├── tests/            # Test suites
└── docs/             # This documentation
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit, Tailwind CSS, Flowbite |
| Backend | Node.js, Fastify, TypeScript |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| ORM | Drizzle |
| Auth | JWT (bcrypt $2b) |
| AI | OpenAI, Anthropic Claude |
| Deploy | Docker, Docker Compose |

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: This folder
- Changelog: [CHANGELOG.md](../CHANGELOG.md)
