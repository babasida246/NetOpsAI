# NetOpsAI - Deployment Guide

## Overview

This guide covers deploying the NetOpsAI system using Docker containers.

## Prerequisites

### Hardware Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 20GB disk space
- **Recommended**: 8GB RAM, 4 CPU cores, 50GB disk space

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for generating secrets)

### Verify Prerequisites

```bash
# Check Docker
docker --version
docker compose version

# Check Git
git --version

# Check OpenSSL
openssl version
```

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/netopsai-it-gateway.git
cd netopsai-it-gateway
```

### 2. Validate Prerequisites

```bash
./scripts/validate-deployment.sh
```

### 3. Configure Environment

```bash
# Copy production template
cp .env.production.example .env.production

# Generate secure secrets
./scripts/generate-secrets.sh

# Edit .env.production with generated secrets
nano .env.production
```

### 4. Deploy

```bash
./scripts/deploy.sh production
```

## Architecture

```
                    ┌─────────────────┐
                    │     Nginx       │
                    │   (Port 80/443) │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Gateway API │  │  Gateway MCP │  │  Gateway CLI │
    │  (Port 3000) │  │  (Port 3001) │  │   (Tools)    │
    └──────┬───────┘  └──────┬───────┘  └──────────────┘
           │                 │
           └────────┬────────┘
                    │
           ┌────────┴────────┐
           │                 │
           ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │  PostgreSQL  │  │    Redis     │
    │  (Port 5432) │  │  (Port 6379) │
    └──────────────┘  └──────────────┘
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `API_PORT` | API service port | `3000` |
| `MCP_PORT` | MCP service port | `3001` |
| `POSTGRES_DB` | Database name | `netopsai_gateway` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | Required |
| `REDIS_PASSWORD` | Redis password | Required |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `ENCRYPTION_KEY` | Data encryption key | Required |

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main production configuration |
| `docker-compose.dev.yml` | Development overrides |
| `docker-compose.logging.yml` | Monitoring stack (Prometheus, Grafana, Loki) |

## Deployment Modes

### Production Deployment

```bash
# Basic deployment
docker-compose up -d

# With nginx proxy
docker-compose --profile proxy up -d

# With monitoring
docker-compose -f docker-compose.yml -f docker-compose.logging.yml up -d
```

### Development Deployment

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Health Checks

### Manual Health Check

```bash
# API health
curl http://localhost:3000/health

# Ready check
curl http://localhost:3000/health/ready
```

### Expected Response

```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "postgres": true,
    "redis": true
  }
}
```

## Monitoring

### Grafana Dashboard

- URL: http://localhost:3002
- Default credentials: admin / (from GRAFANA_PASSWORD)

### Prometheus

- URL: http://localhost:9090
- Metrics endpoint: http://localhost:3000/metrics

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f gateway-api

# View last 100 lines
docker-compose logs --tail=100 gateway-api
```

## Backup & Restore

### Database Backup

```bash
# Create backup
docker exec netopsai-gateway-postgres pg_dump -U postgres netopsai_gateway > backup-$(date +%Y%m%d).sql

# Compressed backup
docker exec netopsai-gateway-postgres pg_dump -U postgres netopsai_gateway | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# Restore from backup
cat backup.sql | docker exec -i netopsai-gateway-postgres psql -U postgres netopsai_gateway

# From compressed backup
gunzip -c backup.sql.gz | docker exec -i netopsai-gateway-postgres psql -U postgres netopsai_gateway
```

### Redis Backup

```bash
# Trigger backup
docker exec netopsai-gateway-redis redis-cli BGSAVE

# Copy backup file
docker cp netopsai-gateway-redis:/data/dump.rdb ./redis-backup.rdb
```

## Scaling

### Horizontal Scaling

```bash
# Scale API to 3 instances
docker-compose up -d --scale gateway-api=3

# Note: Requires load balancer (nginx) configuration
```

### Resource Adjustment

Edit `docker-compose.yml` to adjust resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Rollback

### Automatic Rollback

```bash
./scripts/rollback.sh
```

### Manual Rollback

```bash
# Stop current version
docker-compose down

# Checkout previous version
git checkout HEAD~1

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Security Best Practices

### 1. Secrets Management
- Never commit `.env.production` to version control
- Use `./scripts/generate-secrets.sh` for secure passwords
- Rotate secrets periodically

### 2. Network Security
- Use internal Docker network for inter-service communication
- Only expose necessary ports
- Enable firewall rules

### 3. SSL/TLS
- Configure SSL certificates in `docker/nginx/ssl/`
- Enable HTTPS redirect in nginx configuration
- Use Let's Encrypt for free certificates

### 4. Updates
- Keep Docker images updated
- Monitor security advisories
- Test updates in staging first

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Support

1. Check logs: `docker-compose logs -f`
2. Run validation: `./scripts/validate-deployment.sh`
3. Check health: `curl http://localhost:3000/health`
4. Review documentation in `docs/`
5. Open issue on GitHub

