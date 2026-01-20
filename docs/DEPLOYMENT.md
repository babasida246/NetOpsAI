# Deployment Guide

Complete guide for deploying NetOpsAI Gateway in production.

## Table of Contents

- [Overview](#overview)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [TLS/SSL Configuration](#tlsssl-configuration)
- [Reverse Proxy](#reverse-proxy)
- [Monitoring Setup](#monitoring-setup)
- [Scaling Considerations](#scaling-considerations)
- [Backup Strategy](#backup-strategy)

---

## Overview

### Deployment Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (nginx/HAProxy)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌──────┴──────┐
│   Gateway API │   │   Gateway API   │   │   Web UI    │
│   (Node.js)   │   │   (Node.js)     │   │  (Static)   │
└───────┬───────┘   └────────┬────────┘   └─────────────┘
        │                    │
        └────────┬───────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────┴───────┐ ┌───────┴───────┐
│   PostgreSQL  │ │     Redis     │
│   (Primary)   │ │   (Cluster)   │
└───────────────┘ └───────────────┘
```

### Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 100 GB SSD |
| Node.js | 20.x | 20.x LTS |
| PostgreSQL | 15 | 16 |
| Redis | 7 | 7.2 |

---

## Docker Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/babasida246/NetOpsAI.git
cd NetOpsAI

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start all services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f gateway-api
```

### Docker Compose Services

| Service | Container | Port |
|---------|-----------|------|
| `gateway-api` | netopsai-gateway-api | 3000 |
| `web-ui` | netopsai-gateway-webui | 3003 |
| `postgres` | netopsai-gateway-postgres | 5432 |
| `redis` | netopsai-gateway-redis | 6379 |
| `nginx` | netopsai-gateway-nginx | 80, 443 |
| `prometheus` | netopsai-prometheus | 9090 |
| `grafana` | netopsai-grafana | 3001 |

### Build Production Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build gateway-api

# Build with no cache
docker-compose build --no-cache
```

### Container Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart gateway-api

# View logs
docker-compose logs -f gateway-api
docker-compose logs --tail=100 postgres

# Execute command in container
docker-compose exec gateway-api sh
docker-compose exec postgres psql -U postgres -d netopsai_gateway
```

---

## Environment Configuration

### Required Variables

```dotenv
# System
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (PostgreSQL)
POSTGRES_USER=netopsai
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=netopsai_gateway
DATABASE_URL=postgresql://netopsai:<password>@postgres:5432/netopsai_gateway
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Cache (Redis)
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Security
JWT_SECRET=<32+-character-secret>
JWT_ACCESS_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=<32-byte-hex-key>

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
ADMIN_NAME=Administrator
```

### LLM Provider Keys

```dotenv
# OpenRouter (recommended)
OPENROUTER_API_KEY=sk-or-v1-xxx

# OpenAI (optional)
OPENAI_API_KEY=sk-xxx

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-xxx
```

### External Integrations

```dotenv
# Zabbix monitoring
ZABBIX_API_URL=https://zabbix.yourdomain.com/api_jsonrpc.php
ZABBIX_API_TOKEN=your-token

# FortiGate firewall
FORTIGATE_API_URL=https://fortigate.yourdomain.com
FORTIGATE_API_TOKEN=your-token
```

### Rate Limiting

```dotenv
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Database Setup

### Initial Setup

The schema is automatically applied on container startup from:
`packages/infra-postgres/src/schema.sql`

### Manual Migration

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d netopsai_gateway

# Apply schema
\i /docker-entrypoint-initdb.d/01-schema.sql
```

### Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres netopsai_gateway > backup.sql

# Backup with compression
docker-compose exec postgres pg_dump -U postgres netopsai_gateway | gzip > backup.sql.gz
```

### Restore

```bash
# Restore from backup
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d netopsai_gateway
```

---

## TLS/SSL Configuration

### Using Let's Encrypt

1. Edit `docker/nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://gateway-api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

2. Mount certificates in docker-compose.yml:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt/live/yourdomain.com:/etc/nginx/ssl:ro
```

### Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem \
  -out docker/nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

---

## Reverse Proxy

### Nginx Configuration

```nginx
# docker/nginx/nginx.conf
upstream gateway_api {
    server gateway-api:3000;
    keepalive 32;
}

upstream web_ui {
    server web-ui:3003;
}

server {
    listen 80;
    server_name _;
    
    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # API
    location /api/ {
        proxy_pass http://gateway_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-Id $request_id;
    }
    
    # Swagger docs
    location /docs {
        proxy_pass http://gateway_api/docs;
    }
    
    # Health check
    location /health {
        proxy_pass http://gateway_api/health;
    }
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    
    # Web UI
    location / {
        proxy_pass http://web_ui/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Monitoring Setup

### Prometheus

Metrics endpoint: `http://gateway-api:3000/metrics`

```yaml
# docker/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'gateway-api'
    static_configs:
      - targets: ['gateway-api:3000']
    metrics_path: /metrics
```

### Grafana Dashboards

Access: http://localhost:3001

Default login: `admin` / `admin`

Pre-configured dashboards in `docker/grafana/dashboards/`

### Log Aggregation (Loki)

Promtail config: `docker/promtail/config.yml`

```yaml
scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log
```

---

## Scaling Considerations

### Horizontal Scaling (API)

```yaml
# docker-compose.yml
gateway-api:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '1'
        memory: 1G
```

### Load Balancing

```nginx
upstream gateway_api {
    least_conn;
    server gateway-api-1:3000 weight=1;
    server gateway-api-2:3000 weight=1;
    server gateway-api-3:3000 weight=1;
    keepalive 32;
}
```

### Redis Cluster

For high availability, configure Redis Sentinel or Cluster mode.

### Database Replication

Configure PostgreSQL streaming replication for read replicas.

---

## Backup Strategy

### Automated Backups

Create `/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec -T postgres pg_dump -U postgres netopsai_gateway | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Redis backup
docker-compose exec -T redis redis-cli -a $REDIS_PASSWORD BGSAVE
docker cp netopsai-gateway-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
```

Schedule with cron:

```bash
0 2 * * * /scripts/backup.sh
```

### Restore Procedure

1. Stop services:
```bash
docker-compose stop gateway-api
```

2. Restore database:
```bash
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U postgres -d netopsai_gateway
```

3. Restart services:
```bash
docker-compose start gateway-api
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Strong passwords set for all services
- [ ] TLS certificates installed
- [ ] Database backups configured
- [ ] Monitoring enabled
- [ ] Rate limiting enabled
- [ ] Firewall rules configured
- [ ] Health checks working
- [ ] Log aggregation configured
- [ ] Admin account secured

---

## Next Steps

- 📖 [Runbook](RUNBOOK.md) – Operations guide
- 🔌 [API Reference](API.md) – Endpoints
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
