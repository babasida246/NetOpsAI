# Getting Started

Complete guide to set up and run NetOpsAI Gateway locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [First Login](#first-login)
- [Common Issues](#common-issues)

---

## Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20+ | `node -v` |
| pnpm | 8+ | `pnpm -v` |
| Docker | 24+ | `docker -v` |
| Docker Compose | 2+ | `docker compose version` |

### Install pnpm (if needed)

```bash
npm install -g pnpm
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/babasida246/NetOpsAI.git
cd NetOpsAI
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all packages in the monorepo workspace.

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Required Variables

Edit `.env` with your values:

```dotenv
# System
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=netopsai_gateway
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/netopsai_gateway

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@localhost:6379

# LLM Providers (at least one required for chat)
OPENROUTER_API_KEY=sk-or-xxx-your-key
OPENAI_API_KEY=sk-xxx-your-key
ANTHROPIC_API_KEY=sk-ant-xxx-your-key

# Security (change in production!)
JWT_SECRET=your-secure-jwt-secret-32-chars-min
ENCRYPTION_KEY=your-32-byte-encryption-key

# Admin User (created on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=Administrator
```

### 3. Optional Variables

```dotenv
# External Integrations
ZABBIX_API_URL=http://zabbix.local/api_jsonrpc.php
ZABBIX_API_TOKEN=your-zabbix-token
FORTIGATE_API_URL=https://fortigate.local
FORTIGATE_API_TOKEN=your-fortigate-token

# Rate Limiting
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Web UI
VITE_API_BASE=http://localhost:3000
```

---

## Database Setup

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for healthy status
docker-compose ps
```

The schema is automatically applied from `packages/infra-postgres/src/schema.sql`.

### Option B: Manual PostgreSQL

1. Create database:

```sql
CREATE DATABASE netopsai_gateway;
```

2. Apply schema:

```bash
psql -U postgres -d netopsai_gateway -f packages/infra-postgres/src/schema.sql
```

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Start API server
pnpm dev

# Terminal 2: Start Web UI
cd apps/web-ui
pnpm dev
```

### Docker Mode (All Services)

```bash
# Build and start everything
docker-compose up -d

# Check status
docker-compose ps

# View API logs
docker-compose logs -f gateway-api
```

### Verify Services

| Service | URL | Expected |
|---------|-----|----------|
| API Health | http://localhost:3000/health | `{"status":"healthy"}` |
| Swagger UI | http://localhost:3000/docs | OpenAPI documentation |
| Web UI | http://localhost:5173 | Login page |

---

## First Login

### Default Admin Credentials

```
Email: admin@example.com (or your ADMIN_EMAIL)
Password: ChangeMe123! (or your ADMIN_PASSWORD)
```

### First Steps After Login

1. **Configure AI Providers** – Go to Models → Add Provider
2. **Add Models** – Import models from OpenRouter or add manually
3. **Create Assets** – Navigate to Asset Management
4. **Try Chat** – Test AI conversation with tools

---

## Common Issues

### 1. Database Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if Postgres is running
docker-compose ps postgres

# If not running
docker-compose up -d postgres

# Check logs
docker-compose logs postgres
```

### 2. Redis Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
docker-compose up -d redis
docker-compose logs redis
```

### 3. Port Already in Use

**Error**: `EADDRINUSE :::3000`

**Solution**:
```bash
# Find process using port
# Windows:
netstat -ano | findstr :3000

# Kill process or change PORT in .env
```

### 4. pnpm Install Fails

**Error**: `Cannot find module`

**Solution**:
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### 5. TypeScript Errors

**Error**: Type errors on build

**Solution**:
```bash
# Check types
pnpm typecheck

# Rebuild all packages
pnpm build
```

### 6. Docker Build Fails

**Error**: Build context errors

**Solution**:
```bash
# Clean Docker cache
docker-compose down --volumes
docker system prune -f
docker-compose build --no-cache
```

---

## Next Steps

- 📖 [Architecture Overview](ARCHITECTURE.md)
- 🔌 [API Reference](API.md)
- 🗄️ [Data Model](DATA_MODEL.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)
