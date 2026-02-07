# NON-FUNCTIONAL REQUIREMENTS (Yêu cầu phi chức năng)

## 1. Performance (Hiệu năng)

### 1.1 Response Time

| Loại request | Target | Max |
|--------------|--------|-----|
| Page load (initial) | < 2s | 3s |
| Page load (subsequent) | < 1s | 2s |
| API response (simple) | < 200ms | 500ms |
| API response (complex) | < 1s | 3s |
| Search results | < 500ms | 1s |
| Report generation | < 5s | 30s |
| Export (< 1000 rows) | < 3s | 10s |
| Export (> 10000 rows) | Background job | Email delivery |

### 1.2 Throughput

| Metric | Target |
|--------|--------|
| Concurrent users | 100+ |
| API requests/second | 500+ |
| Batch import | 1000 records/minute |
| Database queries | Optimized with indexing |

### 1.3 Resource Usage

| Resource | Limit |
|----------|-------|
| Memory per user session | < 50MB |
| Database connections | Pool: 10-50 |
| File upload size | 10MB per file |
| Image processing | < 5s per image |

---

## 2. Scalability (Khả năng mở rộng)

### 2.1 Data Volume

| Entity | Supported Scale |
|--------|-----------------|
| Assets | 100,000+ |
| Users | 10,000+ |
| Transactions/year | 1,000,000+ |
| Audit logs | Unlimited (archiving) |

### 2.2 Architecture Scaling

```
┌───────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                          │
└───────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  App 1    │    │  App 2    │    │  App N    │
   └───────────┘    └───────────┘    └───────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
   ┌───────────────────────────────────────────────────────┐
   │              DATABASE CLUSTER                         │
   │   ┌─────────┐         ┌─────────┐         ┌─────────┐│
   │   │ Primary │ ──────► │ Replica │ ──────► │ Replica ││
   │   └─────────┘         └─────────┘         └─────────┘│
   └───────────────────────────────────────────────────────┘
```

### 2.3 Horizontal Scaling

- Stateless API servers
- Shared session store (Redis)
- Database read replicas
- File storage (S3/MinIO)

---

## 3. Availability (Tính khả dụng)

### 3.1 Uptime Target

| Environment | SLA |
|-------------|-----|
| Production | 99.5% (1.8 days downtime/year) |
| Planned maintenance | < 4 hours/month, off-peak |

### 3.2 Failover

| Component | Strategy |
|-----------|----------|
| Application | Multiple instances, auto-restart |
| Database | Primary-Replica failover |
| Cache | Redis cluster/sentinel |
| File storage | Replicated storage |

### 3.3 Disaster Recovery

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 4 hours |
| RPO (Recovery Point Objective) | < 1 hour |
| Backup frequency | Daily full, hourly incremental |
| Backup retention | 30 days |
| Offsite backup | Yes (different region) |

---

## 4. Security (Bảo mật)

### 4.1 Authentication

| Requirement | Implementation |
|-------------|----------------|
| Password policy | Min 8 chars, upper/lower/number/special |
| Password hashing | bcrypt (cost 12) |
| Multi-factor auth | TOTP (optional per org) |
| Session timeout | 8 hours idle, 24 hours max |
| Login attempts | 5 failed → 15 min lockout |
| SSO integration | SAML 2.0, OAuth 2.0, LDAP |

### 4.2 Authorization

| Requirement | Implementation |
|-------------|----------------|
| Role-based access | 5 roles predefined |
| Org-level isolation | Data segregation |
| Field-level permissions | Sensitive fields restricted |
| API authorization | JWT with scopes |

### 4.3 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Data in transit | TLS 1.3 |
| Data at rest | AES-256 encryption |
| Sensitive fields | Encrypted (product keys, credentials) |
| PII handling | Compliant with privacy laws |
| Audit logging | All data changes logged |

### 4.4 Security Standards

- OWASP Top 10 compliance
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (tokens)
- Rate limiting
- Security headers (CSP, HSTS, X-Frame-Options)

---

## 5. Reliability (Độ tin cậy)

### 5.1 Data Integrity

| Requirement | Implementation |
|-------------|----------------|
| Database transactions | ACID compliant |
| Referential integrity | Foreign key constraints |
| Optimistic locking | Version fields |
| Data validation | Server-side + client-side |
| Audit trail | Immutable logs |

### 5.2 Error Handling

| Scenario | Behavior |
|----------|----------|
| API error | Structured error response, logging |
| Timeout | Retry with exponential backoff |
| Database error | Transaction rollback |
| Unexpected error | Graceful degradation, alert |

### 5.3 Monitoring

| Component | Metrics |
|-----------|---------|
| Application | Response time, error rate, throughput |
| Database | Query time, connections, locks |
| Infrastructure | CPU, memory, disk, network |
| Business | Active users, transactions/day |

---

## 6. Usability (Tính khả dụng)

### 6.1 User Interface

| Requirement | Target |
|-------------|--------|
| Responsive design | Desktop, Tablet, Mobile |
| Accessibility | WCAG 2.1 Level AA |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Loading indicators | All async operations |
| Error messages | Clear, actionable |

### 6.2 User Experience

| Requirement | Implementation |
|-------------|----------------|
| Navigation | Consistent, breadcrumbs |
| Search | Global search, filters, auto-complete |
| Forms | Inline validation, auto-save drafts |
| Tables | Sorting, filtering, pagination |
| Shortcuts | Keyboard navigation |

### 6.3 Localization

| Requirement | Implementation |
|-------------|----------------|
| Languages | Vietnamese (default), English |
| Date/Time | User timezone, locale format |
| Numbers | Locale-specific formatting |
| Currency | VND (default), multi-currency support |

---

## 7. Maintainability (Khả năng bảo trì)

### 7.1 Code Quality

| Requirement | Standard |
|-------------|----------|
| Code style | ESLint/Prettier configured |
| Documentation | JSDoc for functions |
| Test coverage | > 70% |
| Code review | Required for all changes |
| Static analysis | SonarQube integration |

### 7.2 Deployment

| Requirement | Implementation |
|-------------|----------------|
| CI/CD | Automated build, test, deploy |
| Environments | Dev → Staging → Production |
| Rollback | One-click rollback |
| Blue-green deployment | Zero downtime |
| Configuration | Environment variables |

### 7.3 Logging

| Level | Content |
|-------|---------|
| ERROR | Exceptions, failures |
| WARN | Unusual conditions |
| INFO | Business events |
| DEBUG | Development details |

| Requirement | Implementation |
|-------------|----------------|
| Structured logs | JSON format |
| Log aggregation | ELK/Loki stack |
| Log retention | 90 days |
| Sensitive data | Never log passwords, tokens |

---

## 8. Compatibility (Khả năng tương thích)

### 8.1 Integration

| System | Method |
|--------|--------|
| LDAP/AD | DirectBind, Search |
| SAML IdP | SAML 2.0 assertions |
| Email | SMTP, SendGrid |
| File storage | S3 compatible |
| Monitoring | Prometheus metrics |

### 8.2 API Standards

| Requirement | Implementation |
|-------------|----------------|
| Style | RESTful |
| Format | JSON |
| Versioning | URL path (/api/v1/) |
| Documentation | OpenAPI 3.0 (Swagger) |
| Rate limiting | Token bucket |

### 8.3 Import/Export

| Format | Support |
|--------|---------|
| Excel | .xlsx import/export |
| CSV | Import/export |
| PDF | Export reports |
| JSON | API responses |

---

## 9. Compliance (Tuân thủ)

### 9.1 Data Privacy

| Regulation | Requirements |
|------------|--------------|
| PDPA | Personal data protection |
| Right to be forgotten | Data deletion workflow |
| Data portability | Export user data |
| Consent management | Configurable |

### 9.2 Audit Requirements

| Requirement | Implementation |
|-------------|----------------|
| Who | User identification |
| What | Action performed |
| When | Timestamp (UTC) |
| Where | IP address, location |
| Before/After | Data change tracking |
| Retention | 7 years minimum |

### 9.3 Industry Standards

| Standard | Scope |
|----------|-------|
| ISO 27001 | Security management |
| SOC 2 | Security, availability |
| ITIL | IT service management |

---

## 10. Environment Requirements

### 10.1 Development

| Component | Specification |
|-----------|---------------|
| OS | Windows/macOS/Linux |
| Node.js | 20.x LTS |
| Database | PostgreSQL 15+ |
| Cache | Redis 7+ |
| IDE | VS Code recommended |

### 10.2 Production

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 500 GB SSD |
| Database | 4 cores, 8 GB | 8 cores, 16 GB |
| Network | 100 Mbps | 1 Gbps |

### 10.3 Docker

```yaml
# Minimum requirements
services:
  app:
    mem_limit: 1g
    cpus: 1.0
  database:
    mem_limit: 2g
    cpus: 2.0
  redis:
    mem_limit: 256m
    cpus: 0.5
```
