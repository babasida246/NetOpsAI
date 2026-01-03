# Phase 1 – NetOps Drift, Lint, Change Templates, Health Dashboard

This document captures the full TODO/checklist before implementation.

## Scope (Phase 1)
- Drift detection & compliance linting
- Change templates with approval flow
- Health/SLO dashboard basics
- Integration with config-generator (secure baseline + standard actions)

## TODO & Checklist

### 1) Drift detection & versioning
- [ ] On config upload, compute hash, compare against last version per device; flag drift.
- [ ] Store diff summary (added/removed/changed lines) for quick view.
- [ ] API: include drift info in config detail response.
- [ ] UI: show drift badge on device/config view; link to diff.

### 2) Compliance lint (secure baseline)
- [ ] Create rulepack “secure_baseline” (SSH-only, disable telnet/http, SNMPv3, syslog, NTP, banner, mgmt ACL).
- [ ] Auto-run lint on upload; store findings and compliance status.
- [ ] API: endpoint to fetch lint findings per config/version.
- [ ] UI: findings table + compliance badge.

### 3) Change templates & approvals
- [ ] Define change templates (VLAN add, uplink change, ACL/NAT, secure baseline hardening) with intent params.
- [ ] API: list templates, instantiate change request from template, generate commands (using config-generator).
- [ ] Approval: multi-level approve/reject, with status transitions; track requiredApprovals.
- [ ] UI: wizard to pick template → fill params → preview commands (dry-run) → submit → track status.

### 4) Health/SLO dashboard
- [ ] API health summary per device/site (latency/jitter/loss if available; fallback to lastSeen).
- [ ] Alert rules: interface/neighbor flap (stub if no telemetry); store recent alerts.
- [ ] UI: site/device health cards + recent alerts list.

### 5) Integration hooks
- [ ] Wire config-generator actions (secure_baseline, VLAN, NAT, etc.) into change templates preview.
- [ ] Ensure actions available via `/tools/generate-config` proxy on UI.

### 6) DB/Schema tasks
- [ ] Drift fields (drift_flag, diff_summary) on net_config_versions.
- [ ] Lint results table if not present; store rulepack, findings, status.
- [ ] Change templates table (template id, name, intent params, command template).
- [ ] Approvals table (request id, approver, status, timestamp).
- [ ] Alerts/health table (device/site, type, severity, details, created_at).

### 7) Testing & QA
- [ ] Unit tests for drift calculation and lint invocation.
- [ ] API tests for change template instantiation and approval transitions.
- [ ] UI E2E for template wizard and drift/lint badges.
- [ ] Performance sanity: upload/config diff path under reasonable size limits.

### 8) Rollout notes
- [ ] Migration scripts for new tables/columns.
- [ ] Seed rulepack “secure_baseline”.
- [ ] Feature flags/toggles if needed for incremental release.

## Notes
- Keep changes backward compatible with existing NetOps routes.
- Prefer server-side diff to avoid heavy data to the UI.
- Minimum viable telemetry for health: use lastSeen + optional ping/ICMP data; keep extensible for real metrics later.

---

# Next Phases (Draft Backlog)

## Phase 2 – ACL Intent, Site Templates/ZTP, Inventory/Lifecycle
- **ACL/Firewall intent & conflict check**
  - Intent model (app-to-app), generate multi-vendor rules, conflict/shadow detection, hit-count cleanup.
  - Recertification workflow, scheduled review tasks.
- **Site templates / ZTP**
  - Site bootstrap template (WAN/LAN/VLAN/DHCP/NAT/Firewall), multi-WAN/SD-WAN profile (LB/failover/PBR).
  - ZTP bootstrap scripts per vendor; dry-run/simulate before apply.
- **Inventory & lifecycle**
  - CMDB (model/serial/OS version/EoL/EoS), license/subscription tracking.
  - Firmware upgrade plan (batch) + playbook, staged rollout.

## Phase 3 – Security/SIEM, Capacity/Optimization, What-if Sandbox
- **Security/SIEM**
  - Normalized syslog export, NetFlow/sFlow presets, SIEM integration.
  - Incident playbooks (lockdown interface, block IP, cut route) with approvals.
- **Capacity & optimization**
  - Forecast bandwidth/CPU/memory; suggest QoS/MTU/ECMP tweaks.
  - “What-if” sandbox for route/ACL simulation prior to deploy.

## Phase 4 – Extensibility & UX polish
- Plugin/connector model for telemetry sources.
- UI polish: richer dashboards, per-role views, dark/light theming, accessibility checks.
- Feature flags for incremental rollout and A/B on templates/policies.
