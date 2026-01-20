# Observability Guide

Logging, metrics, tracing, and monitoring configuration for NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Logging](#logging)
- [Metrics](#metrics)
- [Tracing](#tracing)
- [Monitoring Stack](#monitoring-stack)
- [Dashboards](#dashboards)
- [Alerting](#alerting)

---

## Overview

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐   │
│  │ PinoLogger  │  │ prom-client │  │ Correlation ID         │   │
│  │ (JSON logs) │  │ (metrics)   │  │ (x-correlation-id)     │   │
│  └──────┬──────┘  └──────┬──────┘  └────────────────────────┘   │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────┐ ┌─────────────────┐
│ Loki            │ │ Prometheus      │
│ (log storage)   │ │ (metrics store) │
└────────┬────────┘ └────────┬────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
           ┌─────────────┐
           │  Grafana    │
           │ (dashboards)│
           └─────────────┘
```

### Key Components

| Component | Purpose | Port |
|-----------|---------|------|
| PinoLogger | Structured JSON logging | - |
| prom-client | Prometheus metrics | :3000/metrics |
| Promtail | Log shipper to Loki | 9080 |
| Loki | Log aggregation | 3100 |
| Prometheus | Metrics collection | 9090 |
| Grafana | Visualization | 3001 |

---

## Logging

### Configuration

```typescript
// packages/observability/src/PinoLogger.ts
import { pino } from 'pino'

export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error'
    pretty?: boolean  // Human-readable in development
}

export class PinoLogger implements ILogger {
    constructor(config: LoggerConfig) {
        this.logger = pino({
            level: config.level,
            transport: config.pretty ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            } : undefined
        })
    }
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Errors requiring immediate attention |
| `warn` | Unexpected conditions, not errors |
| `info` | Important business events |
| `debug` | Development troubleshooting |

### Environment Configuration

```dotenv
LOG_LEVEL=info          # Production
LOG_LEVEL=debug         # Development
LOG_PRETTY=true         # Human-readable (dev only)
```

### Structured Logging

All logs include structured context:

```typescript
logger.info('Asset created', {
    correlationId: 'abc-123',
    userId: 'user-1',
    assetId: 'asset-456',
    action: 'create'
})
```

Output (JSON):
```json
{
  "level": "info",
  "time": 1705312200000,
  "correlationId": "abc-123",
  "userId": "user-1",
  "assetId": "asset-456",
  "action": "create",
  "msg": "Asset created"
}
```

### Correlation ID

Every request includes `x-correlation-id` header for tracing:

```typescript
// Automatically propagated through child loggers
const childLogger = logger.child({ correlationId: 'abc-123' })
childLogger.info('Processing request')  // Includes correlationId
```

---

## Metrics

### Prometheus Endpoint

Metrics available at: `GET /metrics`

### Available Metrics

#### SSE Streaming

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `sse_connections_active` | Gauge | - | Active SSE connections |
| `sse_first_token_latency` | Histogram | - | Time to first token (s) |
| `sse_stream_duration` | Histogram | - | Total stream duration (s) |
| `sse_errors_total` | Counter | error_code | Streaming errors |

#### Chat Requests

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `chat_requests_total` | Counter | tier, importance, status | Total chat requests |
| `chat_duration` | Histogram | tier | Request duration (s) |

#### Token Usage

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tokens_used_total` | Counter | tier, type | Tokens consumed |
| `token_cost_total` | Counter | tier | Cost in USD |

#### MCP Tools

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `mcp_tool_calls_total` | Counter | tool, status | Tool invocations |
| `mcp_tool_duration` | Histogram | tool | Execution time (s) |

#### Database

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `db_query_duration` | Histogram | operation | Query time (s) |
| `db_connection_pool` | Gauge | state | Pool connections |

#### Cache

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `cache_hits_total` | Counter | cache_type | Cache hits |
| `cache_misses_total` | Counter | cache_type | Cache misses |

### Recording Metrics

```typescript
import { chatRequests, chatDuration } from '@observability'

// Counter
chatRequests.labels('tier1', 'high', 'success').inc()

// Histogram
const end = chatDuration.startTimer({ tier: 'tier1' })
// ... do work ...
end()  // Records duration
```

---

## Tracing

### Request Flow Tracing

Each request is traced via correlation ID:

```
[Request] x-correlation-id: abc-123
    │
    ├─→ [API Gateway] correlationId: abc-123
    │       │
    │       ├─→ [ChatService] correlationId: abc-123
    │       │       │
    │       │       └─→ [ToolRegistry] correlationId: abc-123
    │       │
    │       └─→ [Database] correlationId: abc-123
    │
    └─→ [Response] x-correlation-id: abc-123
```

### Finding Related Logs

```bash
# Loki/Grafana query
{app="gateway-api"} |= "abc-123"

# Docker logs
docker-compose logs gateway-api | grep "abc-123"
```

---

## Monitoring Stack

### Docker Compose Setup

```yaml
# docker-compose.logging.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - ./docker/grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./docker/loki/config.yml:/etc/loki/config.yml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./docker/promtail/config.yml:/etc/promtail/config.yml
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
```

### Prometheus Configuration

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gateway-api'
    static_configs:
      - targets: ['gateway-api:3000']
    metrics_path: /metrics
```

### Promtail Configuration

```yaml
# docker/promtail/config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: msg
            correlationId: correlationId
```

---

## Dashboards

### Pre-configured Dashboards

Located in `docker/grafana/dashboards/`:

| Dashboard | Purpose |
|-----------|---------|
| API Overview | Request rates, latencies, errors |
| Chat Metrics | Token usage, model performance |
| Tool Execution | MCP tool call stats |
| Database | Query performance, pool status |
| Cache | Hit rates, memory usage |

### Grafana Access

- URL: http://localhost:3001
- Default login: `admin` / `admin`
- Data sources: Prometheus, Loki (pre-configured)

### Key Panels

#### Request Rate
```promql
rate(chat_requests_total[5m])
```

#### Error Rate
```promql
rate(chat_requests_total{status="error"}[5m]) / rate(chat_requests_total[5m])
```

#### P95 Latency
```promql
histogram_quantile(0.95, rate(chat_duration_bucket[5m]))
```

#### Active Connections
```promql
sse_connections_active
```

---

## Alerting

### Recommended Alerts

#### High Error Rate
```yaml
alert: HighErrorRate
expr: rate(chat_requests_total{status="error"}[5m]) > 0.01
for: 5m
labels:
  severity: critical
annotations:
  summary: "High error rate detected"
```

#### Slow Responses
```yaml
alert: SlowResponses
expr: histogram_quantile(0.95, rate(chat_duration_bucket[5m])) > 5
for: 5m
labels:
  severity: warning
annotations:
  summary: "P95 latency exceeds 5 seconds"
```

#### Database Connection Pool Exhausted
```yaml
alert: DBPoolExhausted
expr: db_connection_pool{state="idle"} < 2
for: 5m
labels:
  severity: critical
annotations:
  summary: "Database connection pool nearly exhausted"
```

#### High SSE Error Rate
```yaml
alert: SSEErrors
expr: rate(sse_errors_total[5m]) > 0.1
for: 5m
labels:
  severity: warning
annotations:
  summary: "High SSE streaming error rate"
```

### Alert Channels

Configure in Grafana → Alerting → Contact points:

- Email
- Slack
- PagerDuty
- Discord
- Webhook

---

## Best Practices

### Logging
- Use structured logs (JSON)
- Include correlation ID in all logs
- Log at appropriate levels
- Avoid logging sensitive data

### Metrics
- Use meaningful metric names
- Include relevant labels
- Set appropriate histogram buckets
- Avoid high-cardinality labels

### Tracing
- Propagate correlation ID through all services
- Log entry/exit points
- Include timing information

---

## Related Documentation

- 📖 [Runbook](RUNBOOK.md) – Troubleshooting guide
- 📦 [Deployment](DEPLOYMENT.md) – Monitoring setup
- 🔐 [Security](SECURITY.md) – Audit logging
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
