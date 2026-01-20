# Roadmap

Future development plans for NetOpsAI Gateway.

## Vision

NetOpsAI Gateway aims to be the leading open-source AI-powered network operations platform, enabling network engineers to automate complex tasks through natural language interaction.

---

## Phases

### Phase 1: Core Foundation ✅
*Completed*

- [x] Multi-provider LLM integration (OpenRouter, OpenAI, Anthropic)
- [x] MCP server architecture for tools
- [x] PostgreSQL-based persistence
- [x] Redis caching layer
- [x] JWT authentication
- [x] Role-based access control
- [x] SvelteKit Web UI with i18n
- [x] Asset management module
- [x] CMDB integration
- [x] Docker deployment

### Phase 2: Network Automation 🔄
*In Progress*

- [x] FortiGate firewall integration
- [x] Zabbix monitoring integration
- [x] Credential redaction for security
- [ ] Multi-vendor device support
  - [ ] Cisco IOS/IOS-XE
  - [ ] Juniper JunOS
  - [ ] Arista EOS
  - [ ] MikroTik RouterOS
- [ ] Configuration backup and restore
- [ ] Change management workflow
- [ ] Rollback automation

### Phase 3: Observability & Monitoring
*Planned*

- [ ] Real-time log streaming
- [ ] Alert correlation with AI
- [ ] Performance anomaly detection
- [ ] Capacity planning recommendations
- [ ] SLA monitoring and reporting
- [ ] Custom dashboard builder

### Phase 4: Multi-Tenancy & Enterprise
*Planned*

- [ ] Full multi-tenant isolation
- [ ] SSO integration (SAML, OIDC)
- [ ] Audit trail and compliance reports
- [ ] API rate limiting per tenant
- [ ] Custom tool marketplace
- [ ] White-labeling support

### Phase 5: Advanced AI Features
*Planned*

- [ ] Autonomous remediation workflows
- [ ] Predictive failure analysis
- [ ] Natural language policy definition
- [ ] Context-aware recommendations
- [ ] Knowledge graph for network topology
- [ ] Fine-tuned domain models

---

## Feature Requests

### High Priority

| Feature | Status | Target |
|---------|--------|--------|
| Cisco device support | Planned | Q2 2024 |
| Configuration diff viewer | Planned | Q2 2024 |
| Webhook integrations | Planned | Q2 2024 |
| Mobile-responsive UI | In Progress | Q1 2024 |

### Medium Priority

| Feature | Status | Target |
|---------|--------|--------|
| Ansible playbook integration | Planned | Q3 2024 |
| Terraform provider | Planned | Q3 2024 |
| Slack/Teams bot | Planned | Q3 2024 |
| Scheduled tasks | Planned | Q3 2024 |

### Community Requested

| Feature | Votes | Status |
|---------|-------|--------|
| Multi-language support | 15+ | ✅ Done (vi, en) |
| Dark mode | 12+ | ✅ Done |
| API rate limiting | 8+ | Planned |
| Export to PDF | 5+ | Backlog |

---

## Contributing to Roadmap

We welcome community input on our roadmap!

### How to Suggest Features

1. Check existing [issues](https://github.com/babasida246/NetOpsAI/issues)
2. Create a new issue with `[Feature Request]` prefix
3. Describe the use case and expected behavior
4. Vote on existing feature requests with 👍

### Prioritization Criteria

| Factor | Weight |
|--------|--------|
| Community demand | High |
| Strategic alignment | High |
| Implementation effort | Medium |
| Maintenance burden | Medium |

---

## Release Schedule

| Version | Target Date | Focus |
|---------|-------------|-------|
| 1.1.0 | Q1 2024 | Bug fixes, i18n |
| 1.2.0 | Q2 2024 | Network automation |
| 1.3.0 | Q3 2024 | Observability |
| 2.0.0 | Q4 2024 | Multi-tenancy |

---

## Long-term Goals

### 2024

- [ ] Support 10+ network device vendors
- [ ] 99.9% uptime SLA capability
- [ ] 1000+ active installations
- [ ] Enterprise support offering

### 2025

- [ ] SaaS offering
- [ ] Partner ecosystem
- [ ] Certification program
- [ ] Industry compliance certifications

---

## Deprecated Features

| Feature | Deprecated | Removed | Replacement |
|---------|------------|---------|-------------|
| Legacy chat API | v1.0 | v2.0 | OpenAI-compatible API |

---

## Related Documentation

- 📘 [Contributing](CONTRIBUTING.md) – How to contribute
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
- 🚀 [Getting Started](GETTING_STARTED.md) – Setup guide
