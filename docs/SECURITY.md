# Security Documentation

Security practices, authentication, authorization, and data protection in NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Authorization (RBAC)](#authorization-rbac)
- [Data Protection](#data-protection)
- [Network Security](#network-security)
- [Audit Logging](#audit-logging)
- [Secrets Management](#secrets-management)
- [Security Checklist](#security-checklist)

---

## Overview

### Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        NGINX                                  │
│           (TLS termination, rate limiting)                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                      Gateway API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ JWT Auth     │  │ RBAC        │  │ Policy Engine     │  │
│  │ Middleware   │  │ requireRole  │  │ (rate/budget)     │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Credential Redaction                        │ │
│  │        (sanitize network configs before LLM)            │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                     Data Layer                                │
│  ┌──────────────┐           ┌─────────────────────────────┐  │
│  │ PostgreSQL   │           │ Redis                       │  │
│  │ (encrypted)  │           │ (password protected)        │  │
│  └──────────────┘           └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Credential exposure to LLM | Redaction layer sanitizes all network configs |
| Session hijacking | JWT with short expiry, refresh token rotation |
| Unauthorized access | RBAC with role-based route guards |
| API abuse | Rate limiting per user, budget limits |
| SQL injection | Parameterized queries (no raw SQL) |
| Data breach | Encryption at rest, TLS in transit |

---

## Authentication

### JWT-Based Authentication

```typescript
// Login flow
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Response
{
  "accessToken": "eyJhbG...",  // Short-lived (15 min)
  "refreshToken": "eyJhbG...", // Long-lived (7 days)
  "user": { "id": "...", "email": "...", "role": "admin" }
}
```

### Token Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Access Token TTL | 15 minutes | Short-lived for security |
| Refresh Token TTL | 7 days | Longer for UX |
| Algorithm | HS256 | HMAC-SHA256 |

### Environment Variables

```dotenv
JWT_SECRET=<min-32-characters>
JWT_ACCESS_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_SECRET}
```

### Password Hashing

Passwords are hashed using bcrypt with cost factor 10:

```typescript
import bcrypt from 'bcrypt'

const hash = await bcrypt.hash(password, 10)
const valid = await bcrypt.compare(password, hash)
```

---

## Authorization (RBAC)

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 5 | Full system access |
| `admin` | 4 | Admin panel, user management |
| `it_asset_manager` | 3 | Asset CRUD, inventory |
| `catalog_admin` | 2 | Catalogs, categories, models |
| `viewer` | 1 | Read-only access |

### Route Protection

```typescript
// apps/api/src/routes/v1/assets.helpers.ts

export function requireRole(
  request: FastifyRequest, 
  allowed: string[]
): { userId: string; correlationId: string } {
  const ctx = getUserContext(request)
  const elevated = ['admin', 'super_admin']
  
  if (!allowed.includes(ctx.role) && !elevated.includes(ctx.role)) {
    throw new ForbiddenError('Insufficient role for this action')
  }
  
  return { userId: ctx.userId, correlationId: ctx.correlationId }
}
```

### Usage Example

```typescript
// Require it_asset_manager or higher
const ctx = requireRole(request, ['it_asset_manager'])

// Require catalog_admin or higher
const ctx = requireRole(request, ['catalog_admin'])
```

### Permission Matrix

| Endpoint | viewer | catalog_admin | it_asset_manager | admin |
|----------|--------|---------------|------------------|-------|
| GET /assets | ✅ | ✅ | ✅ | ✅ |
| POST /assets | ❌ | ❌ | ✅ | ✅ |
| DELETE /assets | ❌ | ❌ | ✅ | ✅ |
| POST /catalogs | ❌ | ✅ | ❌ | ✅ |
| DELETE /users | ❌ | ❌ | ❌ | ✅ |

---

## Data Protection

### Credential Redaction

**CRITICAL**: Never send unredacted network credentials to LLM.

The redaction layer (`packages/security/src/netops/redaction.ts`) sanitizes:

| Pattern | Example | Redacted To |
|---------|---------|-------------|
| Passwords | `password cisco123` | `password ***REDACTED***` |
| SNMP communities | `community public` | `community ***REDACTED***` |
| SSH keys | `ssh-rsa AAAA...` | `ssh-rsa ***REDACTED***` |
| API keys | `api_key=sk-xxx` | `api_key=***REDACTED***` |
| Pre-shared keys | `set psksecret xxx` | `set psksecret ***REDACTED***` |
| Private keys | `-----BEGIN PRIVATE KEY-----...` | `***REDACTED***` |

```typescript
import { redactConfig } from '@security'

const safeConfig = redactConfig(rawConfig)
// Now safe to send to LLM
```

### Default Credential Detection

The system flags weak/default credentials:

- `public`, `private` (SNMP defaults)
- `cisco`, `admin`, `password`, `changeme`

### Database Encryption

- TLS for connections (SSL mode)
- Consider column-level encryption for sensitive data
- Encrypted backups recommended

---

## Network Security

### TLS Configuration

```nginx
# Recommended nginx TLS settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
```

### Firewall Rules

```bash
# Allow only necessary ports
# 443 - HTTPS (nginx)
# 80  - HTTP (redirect to HTTPS)
# Internal only:
# 3000 - API (nginx proxies)
# 5432 - PostgreSQL (container network only)
# 6379 - Redis (container network only)
```

### Container Network Isolation

```yaml
# docker-compose.yml
networks:
  frontend:
    # External access
  backend:
    internal: true  # No external access
```

---

## Audit Logging

### What Is Logged

| Event | Logged Data |
|-------|-------------|
| Login | userId, timestamp, IP, success/failure |
| API requests | correlationId, userId, endpoint, method |
| Tool execution | toolName, userId, parameters (redacted) |
| Admin actions | userId, action, target, changes |

### Correlation ID

Every request includes `x-correlation-id` for tracing:

```typescript
// Automatically added to all logs
{
  "correlationId": "abc-123",
  "userId": "user-1",
  "action": "create_asset",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Log Retention

| Log Type | Retention |
|----------|-----------|
| Access logs | 90 days |
| Audit logs | 1 year |
| Error logs | 30 days |

---

## Secrets Management

### Required Secrets

| Secret | Purpose | Generation |
|--------|---------|------------|
| `JWT_SECRET` | Token signing | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Data encryption | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | Database auth | Strong password |
| `REDIS_PASSWORD` | Cache auth | Strong password |

### Secret Generation Script

```powershell
# scripts/generate-secrets.ps1
$secrets = @{
    JWT_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    ENCRYPTION_KEY = -join ((48..57) + (65..70) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
}
$secrets | ConvertTo-Json
```

### Secret Storage

**Development:**
- `.env` file (gitignored)

**Production:**
- Environment variables via orchestrator
- Docker secrets
- HashiCorp Vault (recommended)
- Cloud secrets manager (AWS Secrets Manager, Azure Key Vault)

### Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

---

## Security Checklist

### Development

- [ ] No secrets in code or commits
- [ ] Input validation on all endpoints
- [ ] Parameterized database queries
- [ ] CORS configured properly
- [ ] Dependencies regularly updated

### Deployment

- [ ] TLS enabled (HTTPS only)
- [ ] Strong passwords for all services
- [ ] Rate limiting enabled
- [ ] Firewall configured
- [ ] Secrets managed securely
- [ ] Admin password changed from default

### Operations

- [ ] Audit logs enabled
- [ ] Log monitoring configured
- [ ] Backup encryption enabled
- [ ] Security updates applied
- [ ] Access reviewed quarterly

---

## Incident Response

### Security Incident Procedure

1. **Detect** - Alert triggered or report received
2. **Contain** - Disable affected accounts/services
3. **Investigate** - Review logs with correlation ID
4. **Remediate** - Fix vulnerability, rotate secrets
5. **Report** - Document timeline and actions
6. **Improve** - Update procedures, add monitoring

### Key Contacts

| Role | Responsibility |
|------|----------------|
| Security Lead | Incident coordination |
| On-call Engineer | Technical response |
| Management | Stakeholder communication |

---

## Related Documentation

- 📖 [Runbook](RUNBOOK.md) – Operations guide
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 🔌 [API Reference](API.md) – Authentication endpoints
- 📊 [Observability](OBSERVABILITY.md) – Logging and monitoring
