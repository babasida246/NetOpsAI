![alt text](image.png)# NetOpsAI Gateway Documentation

Welcome to the NetOpsAI Gateway documentation. This index provides a guided path through all documentation.

---

## Quick Links

| I want to... | Go to |
|--------------|-------|
| Set up the project | [Getting Started](GETTING_STARTED.md) |
| Understand the architecture | [Architecture](ARCHITECTURE.md) |
| Use the API | [API Reference](API.md) |
| Deploy to production | [Deployment](DEPLOYMENT.md) |
| Troubleshoot issues | [Runbook](RUNBOOK.md) |
| Contribute code | [Contributing](CONTRIBUTING.md) |

---

## Documentation Map

```
                    ┌─────────────────┐
                    │     README      │
                    │  (Project Root) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴────────┐     │     ┌────────┴────────┐
     │ GETTING_STARTED │     │     │   ARCHITECTURE  │
     │    (Setup)      │     │     │    (Design)     │
     └─────────────────┘     │     └─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌───────┴───────┐
│  DATA_MODEL   │   │      API        │   │    TOOLS      │
│  (Database)   │   │   (Endpoints)   │   │  (Registry)   │
└───────────────┘   └─────────────────┘   └───────────────┘
                             │
                    ┌────────┴────────┐
                    │   MCP_SERVERS   │
                    │(AI Tool Servers)│
                    └─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌───────┴───────┐
│  DEPLOYMENT   │   │    RUNBOOK      │   │   SECURITY    │
│  (Production) │   │ (Operations)    │   │  (Auth/RBAC)  │
└───────────────┘   └─────────────────┘   └───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌───────┴───────┐
│ OBSERVABILITY │   │   DEVELOPMENT   │   │    TESTING    │
│ (Logging)     │   │   (Coding)      │   │   (Tests)     │
└───────────────┘   └─────────────────┘   └───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌───────┴───────┐
│  CONTRIBUTING │   │   DECISIONS     │   │   ROADMAP     │
│  (PRs/Issues) │   │   (ADRs)        │   │   (Future)    │
└───────────────┘   └─────────────────┘   └───────────────┘
```

---

## Reading Paths

### 🚀 New Developer Path

1. [README](../README.md) – Project overview
2. [Getting Started](GETTING_STARTED.md) – Setup environment
3. [Architecture](ARCHITECTURE.md) – Understand the system
4. [Development](DEVELOPMENT.md) – Coding standards
5. [Testing](TESTING.md) – Write tests
6. [Contributing](CONTRIBUTING.md) – Submit PRs

### 🔌 API Consumer Path

1. [Getting Started](GETTING_STARTED.md) – Setup
2. [API Reference](API.md) – Endpoints
3. [Tools](TOOLS.md) – Available tools
4. [MCP Servers](MCP_SERVERS.md) – AI integrations

### 🏗️ Architect Path

1. [Architecture](ARCHITECTURE.md) – System design
2. [Data Model](DATA_MODEL.md) – Database schema
3. [Decisions](DECISIONS.md) – ADRs
4. [Security](SECURITY.md) – Auth & security

### 📦 DevOps Path

1. [Deployment](DEPLOYMENT.md) – Production setup
2. [Runbook](RUNBOOK.md) – Operations guide
3. [Observability](OBSERVABILITY.md) – Monitoring
4. [Security](SECURITY.md) – Security practices

---

## Document Inventory

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [README](../README.md) | Project overview | Everyone |
| [GETTING_STARTED](GETTING_STARTED.md) | Setup guide | Developers |
| [ARCHITECTURE](ARCHITECTURE.md) | System design | Architects, Developers |
| [DATA_MODEL](DATA_MODEL.md) | Database schema | Backend Developers |
| [API](API.md) | REST API reference | API Consumers |
| [TOOLS](TOOLS.md) | Tool registry guide | AI Developers |
| [MCP_SERVERS](MCP_SERVERS.md) | MCP implementations | AI Developers |

### Operations Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [DEPLOYMENT](DEPLOYMENT.md) | Production deployment | DevOps |
| [RUNBOOK](RUNBOOK.md) | Operations procedures | DevOps, SRE |
| [SECURITY](SECURITY.md) | Security practices | Security, DevOps |
| [OBSERVABILITY](OBSERVABILITY.md) | Logging & monitoring | DevOps, SRE |

### Development Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [DEVELOPMENT](DEVELOPMENT.md) | Coding standards | Developers |
| [TESTING](TESTING.md) | Test strategies | Developers |
| [CONTRIBUTING](CONTRIBUTING.md) | Contribution guide | Contributors |
| [DECISIONS](DECISIONS.md) | ADRs | Architects, Leads |
| [ROADMAP](ROADMAP.md) | Future plans | Everyone |

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| README | ✅ Complete | January 2024 |
| GETTING_STARTED | ✅ Complete | January 2024 |
| ARCHITECTURE | ✅ Complete | January 2024 |
| DATA_MODEL | ✅ Complete | January 2024 |
| API | ✅ Complete | January 2024 |
| TOOLS | ✅ Complete | January 2024 |
| MCP_SERVERS | ✅ Complete | January 2024 |
| DEPLOYMENT | ✅ Complete | January 2024 |
| RUNBOOK | ✅ Complete | January 2024 |
| SECURITY | ✅ Complete | January 2024 |
| OBSERVABILITY | ✅ Complete | January 2024 |
| DEVELOPMENT | ✅ Complete | January 2024 |
| TESTING | ✅ Complete | January 2024 |
| CONTRIBUTING | ✅ Complete | January 2024 |
| DECISIONS | ✅ Complete | January 2024 |
| ROADMAP | ✅ Complete | January 2024 |

---

## Feedback

Found an issue or want to improve the docs?

- Open an issue with `[Docs]` prefix
- Submit a PR to the `docs/` folder
- Check [Contributing](CONTRIBUTING.md) for guidelines

---

**NetOpsAI Gateway** | [GitHub](https://github.com/babasida246/NetOpsAI) | [Issues](https://github.com/babasida246/NetOpsAI/issues)
