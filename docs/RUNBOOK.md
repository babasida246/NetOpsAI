# Operations Runbook

Operational procedures for troubleshooting, maintenance, and incident response.

## Table of Contents

- [Health Checks](#health-checks)
- [Common Issues](#common-issues)
- [Debugging Guide](#debugging-guide)
- [Performance Issues](#performance-issues)
- [Database Operations](#database-operations)
- [Cache Operations](#cache-operations)
- [Rollback Procedures](#rollback-procedures)
- [Incident Response](#incident-response)

---

## Health Checks

### API Health

```bash
# Quick health check
curl http://localhost:3000/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}

# Ready check (includes dependencies)
curl http://localhost:3000/api/v1/health/ready
```

### Dependency Health

```bash
# Database connectivity
docker-compose exec postgres pg_isready -U postgres

# Redis connectivity
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Check all container status
docker-compose ps
```

### Healthcheck Checklist

| Check | Command | Expected |
|-------|---------|----------|
| API responding | `curl localhost:3000/health` | `{"status":"ok"}` |
| PostgreSQL ready | `pg_isready` | `accepting connections` |
| Redis ready | `redis-cli ping` | `PONG` |
| Nginx accessible | `curl localhost:80` | HTTP 200/301 |
| Web UI accessible | `curl localhost:3003` | HTTP 200 |

---

## Common Issues

### Issue: API returns 503 Service Unavailable

**Symptoms:**
- All API requests return 503
- Health check fails

**Diagnosis:**
```bash
# Check API logs
docker-compose logs --tail=100 gateway-api

# Check if container is running
docker-compose ps gateway-api
```

**Resolution:**
```bash
# Restart API service
docker-compose restart gateway-api

# If OOM, increase memory limit
docker-compose down
# Edit docker-compose.yml to increase memory
docker-compose up -d
```

---

### Issue: Database Connection Failed

**Symptoms:**
- Error: "ECONNREFUSED" or "connection refused"
- Error: "too many connections"

**Diagnosis:**
```bash
# Check PostgreSQL status
docker-compose logs postgres

# Check connections
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Kill idle connections
docker-compose exec postgres psql -U postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < now() - interval '10 minutes';
"
```

---

### Issue: Redis Connection Failed

**Symptoms:**
- Error: "Redis connection to redis:6379 failed"
- Cache misses on all requests

**Diagnosis:**
```bash
# Check Redis status
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Check memory
docker-compose exec redis redis-cli -a $REDIS_PASSWORD info memory
```

**Resolution:**
```bash
# Restart Redis
docker-compose restart redis

# Clear all cache if memory full
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

---

### Issue: Authentication Failures

**Symptoms:**
- Error: "Invalid token"
- Error: "Token expired"
- 401 on all authenticated requests

**Diagnosis:**
```bash
# Check JWT configuration
docker-compose exec gateway-api env | grep JWT

# Verify token
# Decode JWT at jwt.io
```

**Resolution:**
```bash
# If secret changed, all users need to re-login
# Clear all sessions
docker-compose exec redis redis-cli -a $REDIS_PASSWORD KEYS "session:*" | xargs redis-cli DEL

# Regenerate secrets
./scripts/generate-secrets.sh
docker-compose restart gateway-api
```

---

### Issue: LLM Provider Errors

**Symptoms:**
- Error: "Provider unavailable"
- Timeout on chat completions
- Error: "Rate limit exceeded"

**Diagnosis:**
```bash
# Check provider configuration
docker-compose exec gateway-api env | grep API_KEY

# Test provider directly
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
```

**Resolution:**
```bash
# If rate limited, wait or switch provider
# Update priority in UI or database

# If API key invalid
# Update .env and restart
docker-compose restart gateway-api
```

---

## Debugging Guide

### By Symptom

#### "Cannot connect to database"

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check credentials:
   ```bash
   docker-compose exec gateway-api env | grep POSTGRES
   ```

3. Test connection:
   ```bash
   docker-compose exec postgres psql -U netopsai -d netopsai_gateway -c "SELECT 1"
   ```

4. Check network:
   ```bash
   docker-compose exec gateway-api ping postgres
   ```

#### "Slow API responses"

1. Check API metrics:
   ```bash
   curl localhost:3000/metrics | grep http_request_duration
   ```

2. Check database slow queries:
   ```bash
   docker-compose exec postgres psql -U postgres -c "
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   "
   ```

3. Check Redis cache hit ratio:
   ```bash
   docker-compose exec redis redis-cli -a $REDIS_PASSWORD info stats | grep hit
   ```

4. Check container resources:
   ```bash
   docker stats
   ```

#### "WebSocket disconnections"

1. Check nginx timeout settings
2. Check proxy headers:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. Increase timeouts:
   ```nginx
   proxy_read_timeout 300s;
   proxy_send_timeout 300s;
   ```

### Enable Debug Logging

```bash
# Temporarily enable debug
docker-compose exec gateway-api sh -c "LOG_LEVEL=debug node dist/index.js"

# Or set in .env and restart
echo "LOG_LEVEL=debug" >> .env
docker-compose restart gateway-api
```

### Correlation ID Tracking

All requests include `x-correlation-id` header. Use it to trace request flow:

```bash
# Find all logs for a request
docker-compose logs gateway-api | grep "abc-123-correlation-id"
```

---

## Performance Issues

### High CPU Usage

```bash
# Identify hot container
docker stats

# Check Node.js event loop
curl localhost:3000/metrics | grep nodejs_eventloop

# Profile (if enabled)
# Add --inspect flag to Node.js
```

### High Memory Usage

```bash
# Check container memory
docker stats --no-stream

# Check Node.js heap
curl localhost:3000/metrics | grep nodejs_heap

# Trigger GC (if --expose-gc enabled)
```

### Database Slow Queries

```bash
# Enable slow query log
docker-compose exec postgres psql -U postgres -c "
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
"

# View slow queries
docker-compose logs postgres | grep "duration:"
```

---

## Database Operations

### Vacuum and Analyze

```bash
# Full vacuum (heavy, blocks writes)
docker-compose exec postgres vacuumdb -U postgres -d netopsai_gateway --full

# Routine vacuum (lightweight)
docker-compose exec postgres vacuumdb -U postgres -d netopsai_gateway --analyze
```

### Index Maintenance

```bash
# Check index usage
docker-compose exec postgres psql -U postgres -d netopsai_gateway -c "
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
"

# Reindex
docker-compose exec postgres psql -U postgres -d netopsai_gateway -c "
REINDEX DATABASE netopsai_gateway;
"
```

### Table Statistics

```bash
# Table sizes
docker-compose exec postgres psql -U postgres -d netopsai_gateway -c "
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
"
```

---

## Cache Operations

### Clear Specific Cache

```bash
# Clear model cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD KEYS "model:*" | xargs redis-cli DEL

# Clear session cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD KEYS "session:*" | xargs redis-cli DEL

# Clear all cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Monitor Cache

```bash
# Real-time monitoring
docker-compose exec redis redis-cli -a $REDIS_PASSWORD monitor

# Memory analysis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD memory doctor
```

---

## Rollback Procedures

### Code Rollback

```bash
# List recent deployments
git log --oneline -10

# Rollback to previous version
git checkout <previous-commit>

# Rebuild and restart
docker-compose build gateway-api
docker-compose up -d gateway-api
```

### Database Rollback

```bash
# Stop API
docker-compose stop gateway-api

# Restore from backup
gunzip -c /backups/db_20240115_020000.sql.gz | \
  docker-compose exec -T postgres psql -U postgres -d netopsai_gateway

# Start API
docker-compose start gateway-api
```

### Configuration Rollback

```bash
# Restore .env from backup
cp .env.backup .env

# Restart services
docker-compose down
docker-compose up -d
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Service down | 15 minutes |
| P2 | Major feature broken | 1 hour |
| P3 | Minor issue | 4 hours |
| P4 | Cosmetic/low impact | Next sprint |

### P1 Response Procedure

1. **Acknowledge** (0-5 min)
   - Join incident channel
   - Acknowledge incident

2. **Assess** (5-15 min)
   - Check health endpoints
   - Review error logs
   - Identify impacted services

3. **Mitigate** (15-30 min)
   - Restart affected services
   - Scale up if needed
   - Rollback if necessary

4. **Communicate** (ongoing)
   - Update status page
   - Notify stakeholders

5. **Postmortem** (24-48 hours)
   - Document timeline
   - Identify root cause
   - Create action items

### Emergency Contacts

| Role | Responsibility |
|------|----------------|
| On-call Engineer | First responder |
| Tech Lead | Escalation |
| Platform Team | Infrastructure |
| DBA | Database issues |

### Quick Recovery Commands

```bash
# Nuclear option - restart everything
docker-compose down
docker-compose up -d

# Check all services
docker-compose ps
docker-compose logs --tail=50

# Health check
curl localhost:3000/health
curl localhost:3003
```

---

## Maintenance Windows

### Scheduled Maintenance

1. Announce maintenance window
2. Enable maintenance mode:
   ```bash
   # In nginx, return 503 with maintenance page
   ```
3. Perform maintenance
4. Test services
5. Disable maintenance mode
6. Announce completion

### Zero-Downtime Deployment

1. Build new image
2. Start new containers
3. Health check new containers
4. Switch traffic
5. Stop old containers

---

## Monitoring Alerts

### Recommended Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| API Down | health check fails 3x | P1 |
| High Error Rate | 5xx > 1% | P2 |
| High Latency | p95 > 5s | P2 |
| Database Full | disk > 80% | P2 |
| Redis OOM | memory > 90% | P2 |
| Certificate Expiry | < 7 days | P3 |

---

## Related Documentation

- 📦 [Deployment Guide](DEPLOYMENT.md) – Setup and configuration
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 🔌 [API Reference](API.md) – Endpoints
- 🔐 [Security](SECURITY.md) – Security practices
