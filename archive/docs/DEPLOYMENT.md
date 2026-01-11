# Deployment Guide

## Overview

NetOpsAI có thể được triển khai trên nhiều nền tảng khác nhau. Tài liệu này bao gồm các hướng dẫn cho:

- Docker & Docker Compose
- Kubernetes
- Traditional VMs (Linux, Windows)
- Cloud platforms (AWS, Azure, GCP)

## Prerequisites

### System Requirements

```
CPU: 2 cores minimum
RAM: 4GB minimum (8GB recommended)
Disk: 20GB SSD
OS: Linux, Windows Server, macOS
```

### Required Services

```
PostgreSQL 13+
Redis 6+
Node.js 18+
```

## Docker Deployment

### Single Container

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml .
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start
CMD ["pnpm", "start"]
```

### Build Image

```bash
# Build
docker build -t netopsai-gateway:4.0.0 .

# Tag
docker tag netopsai-gateway:4.0.0 netopsai-gateway:latest

# Push to registry
docker push netopsai-gateway:4.0.0
```

### Run Container

```bash
docker run -d \
  --name netopsai-gateway \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e DATABASE_URL=postgresql://user:pass@db:5432/NetOpsAI \
  -e REDIS_URL=redis://redis:6379 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  netopsai-gateway:latest
```

## Docker Compose

### Production Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: netopsai-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: netopsai_gateway
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/infra-postgres/src/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: netopsai-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: netopsai-api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      LOG_LEVEL: info
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/netopsai_gateway
      REDIS_URL: redis://redis:6379
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  cli:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: netopsai-cli
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/netopsai_gateway
      REDIS_URL: redis://redis:6379
    entrypoint: pnpm --filter gateway-cli dev seed
    profiles:
      - setup

volumes:
  postgres_data:
  redis_data:
```

### Environment File

```bash
# .env
DB_PASSWORD=secure-password-here
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE
```

### Deploy

```bash
# Start all services
docker-compose up -d

# Seed database (first time only)
docker-compose --profile setup up cli

# View logs
docker-compose logs -f api

# Stop
docker-compose down

# Backup
docker-compose exec postgres pg_dump netopsai_gateway > backup.sql
```

## Kubernetes Deployment

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: netopsai-gateway-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
```

### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: netopsai-gateway-secret
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  REDIS_URL: <base64-encoded>
  OPENROUTER_API_KEY: <base64-encoded>
```

### StatefulSet (with persistent storage)

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: netopsai-gateway-secret
              key: DB_PASSWORD
        - name: POSTGRES_DB
          value: netopsai_gateway
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### Deployment (for stateless API)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netopsai-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: netopsai-gateway
  template:
    metadata:
      labels:
        app: netopsai-gateway
    spec:
      containers:
      - name: api
        image: netopsai-gateway:4.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: netopsai-gateway-config
        - secretRef:
            name: netopsai-gateway-secret
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: netopsai-gateway
spec:
  type: LoadBalancer
  selector:
    app: netopsai-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace NetOpsAI

# Apply configs
kubectl apply -f k8s/ -n NetOpsAI

# Check status
kubectl get pods -n NetOpsAI
kubectl get svc -n NetOpsAI

# View logs
kubectl logs -f deployment/netopsai-gateway -n NetOpsAI

# Scale
kubectl scale deployment netopsai-gateway --replicas=5 -n NetOpsAI

# Update image
kubectl set image deployment/netopsai-gateway \
  api=netopsai-gateway:4.1.0 -n NetOpsAI

# Rollback
kubectl rollout undo deployment/netopsai-gateway -n NetOpsAI
```

## AWS Deployment

### ECS Task Definition

```json
{
  "family": "netopsai-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "netopsai-gateway",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/netopsai-gateway:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:NetOpsAI/db-url"
        },
        {
          "name": "OPENROUTER_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:NetOpsAI/openrouter-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/netopsai-gateway",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### RDS Setup

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier netopsai-postgres \
  --engine postgres \
  --engine-version 15.3 \
  --db-instance-class db.t3.micro \
  --allocated-storage 100 \
  --master-username postgres \
  --master-user-password $DB_PASSWORD \
  --db-name netopsai_gateway \
  --publicly-accessible false

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier netopsai-postgres \
  --query 'DBInstances[0].Endpoint.Address'
```

### ElastiCache Setup

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id netopsai-redis \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id netopsai-redis \
  --show-cache-node-info
```

## Health Checks & Monitoring

### Health Endpoints

```bash
# Liveness (is process running?)
GET /health/live

# Readiness (can accept requests?)
GET /health/ready

# Full health check
GET /health
```

### Prometheus Metrics

```typescript
// Future: Add metrics endpoint
GET /metrics
```

Output format:
```
# HELP netopsai_gateway_requests_total Total requests
# TYPE netopsai_gateway_requests_total counter
netopsai_gateway_requests_total{method="POST",endpoint="/v1/chat"} 1234

# HELP netopsai_gateway_escalations_total Total escalations
# TYPE netopsai_gateway_escalations_total counter
netopsai_gateway_escalations_total 56

# HELP netopsai_gateway_quality_score Average quality score
# TYPE netopsai_gateway_quality_score gauge
netopsai_gateway_quality_score 0.87
```

### Logging

All requests logged with:
- Timestamp
- Correlation ID
- User ID
- Endpoint
- Method
- Status code
- Response time
- Errors (if any)

### Alerting

Suggested alerts:
- API response time > 5s
- Error rate > 5%
- Database connection failures
- Redis connection failures
- Escalation rate > 30%

## Zero-Downtime Deployment

### Rolling Update

```bash
# Update image
docker pull netopsai-gateway:4.1.0

# Graceful shutdown (10s timeout)
docker stop -t 10 netopsai-gateway

# Start new version
docker run -d netopsai-gateway:4.1.0
```

### Blue-Green Deployment

```bash
# 1. Run new version (green)
docker run -d --name netopsai-gateway-green netopsai-gateway:4.1.0

# 2. Test green
curl http://localhost:3001/health

# 3. Switch traffic (update reverse proxy/load balancer)
# nginx: upstream_server = netopsai-gateway-green:3000

# 4. Keep old version (blue) for rollback
docker rename netopsai-gateway netopsai-gateway-blue

# 5. Rename green to production
docker rename netopsai-gateway-green netopsai-gateway
```

## Backup & Recovery

### Database Backup

```bash
# Regular backup
0 2 * * * pg_dump netopsai_gateway | gzip > /backups/netopsai-$(date +%Y%m%d).sql.gz

# Point-in-time recovery
pg_basebackup -D /backup/base -Ft -z -P -U postgres

# Restore
gunzip < netopsai-20240101.sql.gz | psql netopsai_gateway
```

### Redis Backup

```bash
# Enable AOF (append-only file)
# redis.conf: appendonly yes

# Backup RDB
docker exec netopsai-redis redis-cli BGSAVE
docker cp netopsai-redis:/data/dump.rdb ./redis-backup.rdb

# Restore
docker cp redis-backup.rdb netopsai-redis:/data/dump.rdb
docker restart netopsai-redis
```

## Performance Tuning

### PostgreSQL

```sql
-- Increase connection pool
max_connections = 200

-- Buffer pool
shared_buffers = 256MB
effective_cache_size = 1GB

-- WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Redis

```conf
# Eviction policy
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfsync everysec

# Client output buffer
client-output-buffer-limit normal 0 0 0
```

### Application

```typescript
// Increase pool sizes
const pgClient = new PgClient({
  max: 50,    // Was 10
  min: 10     // Was 2
})
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker logs netopsai-gateway

# Check connectivity
docker exec netopsai-gateway nc -zv postgres 5432
docker exec netopsai-gateway nc -zv redis 6379

# Check env vars
docker exec netopsai-gateway env | grep DATABASE
```

### High Latency

```bash
# Check database
psql -h db -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"

# Check Redis
redis-cli --latency
redis-cli --bigkeys

# Check network
docker exec netopsai-gateway curl -w "@curl-format.txt" https://openrouter.ai/api/v1/models
```

### Memory Issues

```bash
# Monitor container memory
docker stats netopsai-gateway

# Node heap snapshot
node --inspect dist/server.js
# Visit chrome://inspect

# Identify leaks
pnpm add -D clinic
clinic doctor -- pnpm start
```


