# Configuration Guide

> Complete configuration reference for NetOpsAI Gateway

## Environment Variables

### Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `API_PORT` | No | 3000 | API server port |
| `API_HOST` | No | 0.0.0.0 | API server host |
| `LOG_LEVEL` | No | info | Logging level (debug, info, warn, error) |

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `POSTGRES_USER` | No | postgres | Database username |
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `POSTGRES_DB` | No | netopsai_gateway | Database name |
| `POSTGRES_HOST` | No | localhost | Database host |
| `POSTGRES_PORT` | No | 5432 | Database port |

### Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | - | Redis connection URL |
| `REDIS_HOST` | No | localhost | Redis host |
| `REDIS_PORT` | No | 6379 | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | - | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRES` | No | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRES` | No | 7d | Refresh token expiry |

### AI Providers

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key |
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key |
| `DEFAULT_AI_PROVIDER` | No | openrouter | Default provider |
| `DEFAULT_AI_MODEL` | No | - | Default model ID |

### Web UI Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | /api | API base URL |
| `VITE_APP_TITLE` | No | NetOpsAI | Application title |
| `VITE_DEFAULT_LOCALE` | No | vi | Default language (vi, en) |

## Configuration Files

### docker-compose.yml

Main Docker Compose configuration:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-netopsai_gateway}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  gateway-api:
    build:
      context: .
      dockerfile: apps/cloud-api/Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web-ui:
    build:
      context: .
      dockerfile: apps/web-ui/Dockerfile
    ports:
      - "5173:3000"
    depends_on:
      - gateway-api

volumes:
  postgres_data:
  redis_data:
```

### tsconfig.base.json

TypeScript configuration for the monorepo:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## System Settings

Settings configured through the Setup Wizard or Admin panel:

### Company Information

| Setting | Description |
|---------|-------------|
| Company Name | Organization name displayed in UI |
| Company Email | Contact email address |
| Company Phone | Contact phone number |
| Company Address | Physical address |

### Localization

| Setting | Options | Description |
|---------|---------|-------------|
| Default Language | vi, en | UI language |
| Timezone | Asia/Ho_Chi_Minh, etc. | System timezone |
| Date Format | DD/MM/YYYY, MM/DD/YYYY | Date display format |
| Currency | VND, USD | Default currency |

### Security Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Session Timeout | 30 minutes | Inactive session expiry |
| Max Login Attempts | 5 | Before account lockout |
| Password Min Length | 8 | Minimum password length |
| Require Special Chars | Yes | Password complexity |

## AI Provider Configuration

### OpenRouter (Recommended)

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
DEFAULT_AI_PROVIDER=openrouter
```

Supported models:
- anthropic/claude-3-opus
- anthropic/claude-3-sonnet
- openai/gpt-4-turbo
- google/gemini-pro

### OpenAI Direct

```env
OPENAI_API_KEY=sk-xxxxx
DEFAULT_AI_PROVIDER=openai
```

### Anthropic Direct

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
DEFAULT_AI_PROVIDER=anthropic
```

## Logging Configuration

### Log Levels

| Level | Description |
|-------|-------------|
| error | Error conditions |
| warn | Warning conditions |
| info | Informational messages |
| debug | Debug-level messages |
| trace | Trace-level messages |

### Log Files

```
logs/
├── api-start.log      # API startup logs
├── api-start.err.log  # API error logs
└── app.log            # Application logs
```

### Structured Logging (Pino)

```json
{
  "level": "info",
  "time": 1706612400000,
  "pid": 1,
  "hostname": "gateway-api",
  "reqId": "abc-123",
  "msg": "Request completed",
  "req": {
    "method": "GET",
    "url": "/api/v1/health"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 5
}
```

## Performance Tuning

### PostgreSQL

```sql
-- Recommended settings for 8GB RAM
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 64MB
max_connections = 100
```

### Redis

```conf
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### Node.js

```env
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

## Next Steps

- [Authentication Setup](./modules/AUTH.md)
- [AI Provider Setup](./modules/CHAT.md#ai-providers)
- [Docker Deployment](./deploy/DOCKER.md)
