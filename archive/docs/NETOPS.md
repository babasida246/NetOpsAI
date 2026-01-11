# NetSecOps Copilot Module

## Overview

The NetSecOps Copilot is a comprehensive network operations management module providing:

- **Device Inventory Management** - Track Cisco, MikroTik, and FortiGate network devices
- **Configuration Snapshots** - Version-controlled configuration storage with checksums
- **Vendor Config Parsing** - Normalize multi-vendor configs into a unified schema
- **Lint/Policy Engine** - Rule-based compliance checking with custom predicates
- **Change Workflow** - Full state machine for network changes (Draft → Deployed → Closed)
- **Security** - Credential redaction, audit trails, no plaintext secrets

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Gateway API                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    /netops Routes                            │   │
│  │  devices | configs | rulepacks | lint | changes              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐ │
│  │                    NetOpsService                               │ │
│  │  Business logic, validation, audit logging                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌───────────┬───────────────┼───────────────┬───────────────────┐ │
│  │           │               │               │                   │ │
│  ▼           ▼               ▼               ▼                   │ │
│ Repository  Parsers      Lint Engine    Collectors              │ │
│ (PostgreSQL) (Cisco,MikroTik) (Rules,Predicates) (SSH/SNMP)     │ │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Run Database Migration

```bash
# Apply the netops migration
psql -U postgres -d gateway -f packages/infra-postgres/migrations/006_netops_tables.sql
```

### 2. Install Dependencies

```bash
pnpm install
pnpm build
```

### 3. Start API Server

```bash
cd apps/api
pnpm dev
```

### 4. Access API Documentation

Open http://localhost:3000/docs to see the Swagger UI with all NetOps endpoints.

## API Endpoints

### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/netops/devices` | List all devices with filtering |
| POST | `/netops/devices` | Create a new device |
| POST | `/netops/devices/import` | Bulk import devices |
| GET | `/netops/devices/:id` | Get device details |
| PATCH | `/netops/devices/:id` | Update device |
| DELETE | `/netops/devices/:id` | Delete device |
| POST | `/netops/devices/:id/pull-config` | Pull config from device |
| GET | `/netops/devices/:id/configs` | Get device config history |

### Configurations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/netops/configs` | Upload configuration |
| GET | `/netops/configs/:id` | Get config version |
| GET | `/netops/configs/:id/raw` | Get raw config text |
| POST | `/netops/configs/:id/parse-normalize` | Parse and normalize config |
| GET | `/netops/configs/:id/diff?compareWith=` | Compare two configs |

### Rulepacks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/netops/rulepacks` | List all rulepacks |
| POST | `/netops/rulepacks` | Create rulepack |
| GET | `/netops/rulepacks/:id` | Get rulepack details |
| POST | `/netops/rulepacks/:id/activate` | Activate rulepack |

### Lint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/netops/lint/run` | Run lint check |
| GET | `/netops/lint/runs/:id` | Get lint run results |
| GET | `/netops/lint/history` | Get lint history for target |

### Changes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/netops/changes` | List change requests |
| POST | `/netops/changes` | Create change request |
| GET | `/netops/changes/:id` | Get change details |
| POST | `/netops/changes/:id/plan` | Move to planned |
| POST | `/netops/changes/:id/generate` | Generate candidate config |
| POST | `/netops/changes/:id/verify` | Verify candidate |
| POST | `/netops/changes/:id/submit-approval` | Submit for approval |
| POST | `/netops/changes/:id/approve` | Approve change |
| POST | `/netops/changes/:id/reject` | Reject change |
| POST | `/netops/changes/:id/deploy` | Deploy change |
| POST | `/netops/changes/:id/close` | Close change request |

## Data Models

### Device Vendors

- `cisco` - Cisco IOS/IOS-XE
- `mikrotik` - MikroTik RouterOS
- `fortigate` - Fortinet FortiGate

### Device Roles

- `core` - Core/backbone
- `distribution` - Distribution layer
- `access` - Access layer
- `edge` - Edge/border router
- `firewall` - Security device
- `wan` - WAN router

### Change Request Status Flow

```
draft → planned → candidate_ready → verified → waiting_approval → approved → deploying → deployed → verified_post → closed
                                                        ↓
                                                    rejected → draft (or closed)
                                                        
deploying → failed → rolled_back → draft (or closed)
deployed → rolled_back → draft (or closed)
```

## Normalized Config Schema (v1)

All vendor configs are parsed into this unified schema:

```typescript
interface NormalizedConfig {
    schemaVersion: 'v1'
    device: {
        hostname: string
        vendor: 'cisco' | 'mikrotik' | 'fortigate'
        model?: string
        osVersion?: string
    }
    interfaces: Array<{
        name: string
        description?: string
        status: 'up' | 'down' | 'admin-down'
        mode: 'access' | 'trunk' | 'routed' | 'hybrid'
        vlan?: number
        trunkAllowedVlans?: number[]
        ipv4?: string
        ipv4Mask?: string
        ipv6?: string
    }>
    vlans: Array<{
        id: number
        name?: string
        description?: string
    }>
    routing: {
        static: Array<{ network: string; nextHop: string; interface?: string }>
        ospf: Array<{ processId: number; routerId?: string; networks: string[] }>
        bgp: Array<{ asn: number; routerId?: string; neighbors: Array<{...}> }>
    }
    security: {
        acls: Array<{
            name: string
            type?: 'standard' | 'extended'
            entries: Array<{
                seq?: number
                action: 'permit' | 'deny'
                protocol?: string
                src?: string
                dst?: string
                srcPort?: number
                dstPort?: number
                log?: boolean
            }>
        }>
        users: Array<{
            name: string
            privilege?: number
            role?: string
            sshKey?: boolean
        }>
        aaa?: { tacacs?: {...}; radius?: {...} }
    }
    mgmt: {
        ssh?: { enabled: boolean; version?: number; timeout?: number }
        snmp?: { enabled: boolean; version?: string; communities?: string[] }
        ntp?: { servers: string[]; timezone?: string }
        logging?: { servers: string[]; level?: string }
    }
}
```

## Lint Rules

### Built-in Rulepack (baseline-security v1.0.0)

| ID | Name | Severity | Description |
|----|------|----------|-------------|
| SEC-001 | No VLAN 1 Traffic | medium | Interfaces should not use default VLAN 1 |
| SEC-002 | SSH Version 2 Required | high | SSH must be version 2 |
| SEC-003 | No Plaintext Passwords | critical | Configuration must not contain plaintext passwords |
| SEC-004 | ACL Logging on Deny | medium | Deny rules should have logging enabled |
| SEC-005 | No Default Community | critical | SNMP must not use 'public' or 'private' communities |
| MGT-001 | SSH Enabled | high | SSH must be enabled for management |
| MGT-002 | SNMPv3 Only | high | SNMP should use version 3 |
| MGT-003 | Multiple NTP Servers | medium | At least 2 NTP servers required |
| MGT-004 | Syslog Configured | medium | Remote syslog should be configured |
| ACC-001 | Explicit Deny at End | medium | ACLs should have explicit deny at end |

### Custom Rule Types

1. **Match Rules** - JSONPath-based matching
```json
{
    "type": "match",
    "path": "$.mgmt.ssh.version",
    "condition": { "operator": "equals", "value": 2 }
}
```

2. **Custom Predicate Rules** - Built-in functions
```json
{
    "type": "custom",
    "customPredicate": "noVlan1Traffic"
}
```

Available operators: `exists`, `notExists`, `equals`, `notEquals`, `greaterThan`, `lessThan`, `contains`, `notContains`, `matches`, `notEmpty`

Available predicates: `noVlan1Traffic`, `sshEnabled`, `sshV2Only`, `snmpV3Only`, `multipleNtpServers`, `aclHasExplicitDeny`, `noPlaintextPasswords`, `noDefaultCommunity`, `syslogConfigured`, `aclDenyLogging`

## Security

### Credential Redaction

All configurations are automatically redacted before storage:

- Passwords (enable, line, user)
- Secret keys (PSK, pre-shared)
- SSH private keys
- SNMP communities
- TACACS/RADIUS keys
- Certificates and private keys

Redacted patterns are replaced with `[REDACTED:type]` markers.

### Audit Trail

All operations are logged to `net_audit_events`:

- Device CRUD operations
- Configuration uploads/pulls
- Lint runs
- Change state transitions
- Approvals/rejections

### Forbidden Defaults Check

Configs are scanned for dangerous defaults:
- `password cisco`
- `community public`
- `enable secret admin`
- `password admin123`

## Testing

### Run Unit Tests

```bash
# Parser and lint tests
cd packages/infra-netdevice
pnpm test

# API module tests
cd apps/api
pnpm test
```

### Test Coverage

```bash
pnpm test:coverage
```

## File Structure

```
packages/
├── contracts/src/netops/
│   ├── types.ts          # All TypeScript interfaces
│   └── index.ts
├── security/src/netops/
│   ├── redaction.ts      # Credential redaction
│   └── index.ts
├── infra-netdevice/
│   ├── src/
│   │   ├── parsers/
│   │   │   ├── base.ts       # BaseParser abstract class
│   │   │   ├── cisco.parser.ts
│   │   │   ├── mikrotik.parser.ts
│   │   │   ├── fortigate.parser.ts
│   │   │   └── index.ts
│   │   ├── lint/
│   │   │   ├── engine.ts     # LintEngine with rules
│   │   │   └── index.ts
│   │   ├── collectors/
│   │   │   └── index.ts      # Mock + vendor collectors
│   │   └── index.ts
│   └── tests/
│       ├── parsers.test.ts
│       └── lint.test.ts
├── infra-postgres/migrations/
│   └── 006_netops_tables.sql

apps/api/src/modules/netops/
├── netops.schema.ts      # Zod validation schemas
├── netops.repository.ts  # PostgreSQL data access
├── netops.service.ts     # Business logic
├── netops.routes.ts      # Fastify route handlers
└── index.ts
```

## Multi-Layer Orchestrator

### Overview

The Multi-Layer Orchestrator provides an LLM-driven pipeline for intelligent network change management. It combines deterministic checks with AI-powered planning and verification across 8 layers.

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ORCHESTRATION PIPELINE                              │
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │   L0    │→│   L1    │→│   L2    │→│   L3    │→│   L4    │           │
│  │ Intake  │  │ Context │  │Determin.│  │ Planner │  │ Expert  │           │
│  │(Scope)  │  │(Build)  │  │(Lint)   │  │(Tasks)  │  │(Execute)│           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│       │                          │                          │               │
│       │                          │  Findings?               │               │
│       │                          ▼                          │               │
│       │              ┌─────────────────┐                   │               │
│       │              │ Waiver/Override │                   │               │
│       │              └─────────────────┘                   │               │
│       │                                                    ▼               │
│       │                                        ┌─────────────────────┐     │
│       │                                        │       L5            │     │
│       │                                        │   Verification      │     │
│       │                                        │ (Verify+Rollback)   │     │
│       │                                        └─────────────────────┘     │
│       │                                                    │               │
│       │  ┌───────────────────────────────────────────────────────┐        │
│       │  │                        L6                             │        │
│       │  │                      Judge                            │        │
│       │  │    (Safety Assessment, Verdict: approve/reject)       │        │
│       │  └───────────────────────────────────────────────────────┘        │
│       │                                        │                           │
│       │                     ┌──────────────────▼──────────────────┐       │
│       │                     │              L7                      │       │
│       │                     │            Deploy                    │       │
│       │                     │  (Feature Flag + Approval Gates)     │       │
│       │                     └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layer Details

| Layer | Name | Description | Model Tier |
|-------|------|-------------|------------|
| L0 | Intake | Parse intent, resolve scope, validate targets | None |
| L1 | Context | Build NetOpsContextPack with config digests | None |
| L2 | Deterministic | Run lint engine, check baseline compliance | None |
| L3 | Planner | Generate task graph via LLM | Cheap (gpt-4o-mini) |
| L4 | Expert | Execute tasks, produce candidate configs | Strong (gpt-4o) |
| L5 | Verification | Ensure verify/rollback plans exist | None |
| L6 | Judge | Safety assessment, final verdict | Strong (gpt-4o) |
| L7 | Deploy | Apply changes with all gates checked | None |

### Context Pack

The ContextBuilder creates a token-efficient summary for LLM consumption:

```typescript
interface NetOpsContextPack {
    version: 'v1'
    generatedAt: Date
    expiresAt: Date
    hash: string

    // Prompt history (last N interactions)
    promptHistory: Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp: Date
    }>

    // Change history (recent changes in scope)
    changeHistory: Array<{
        changeId: string
        title: string
        status: string
        deviceIds: string[]
        createdAt: Date
    }>

    // Network snapshot
    networkSnapshot: {
        totalDevices: number
        devicesByVendor: Record<string, number>
        devicesBySite: Record<string, number>
        devicesByRole: Record<string, number>
        devicesByStatus: Record<string, number>
        recentConfigChanges: number
        activeChanges: number
        pendingApprovals: number
    }

    // Device context (config digests, not full configs)
    devicesContext: Array<{
        deviceId: string
        hostname: string
        vendor: string
        site?: string
        role?: string
        configDigest: ConfigDigest
    }>

    // Policy context (active rulepacks)
    policyContext: Array<{
        rulepackId: string
        name: string
        ruleCount: number
        enabledRules: string[]
    }>

    // Token estimates for budgeting
    tokenEstimates: {
        total: number
        promptHistory: number
        changeHistory: number
        networkSnapshot: number
        devicesContext: number
        policyContext: number
        sourceRefs: number
    }
}
```

### Deploy Gating Rules

Deployment (L7) is protected by multiple gates:

1. **Feature Flag**: `NETOPS_DEPLOY_ENABLED` environment variable must be `true`
2. **Verify Plan**: Must have a verification plan from L5
3. **Rollback Plan**: Must have a rollback plan from L5
4. **Critical Findings**: Either no critical findings, or findings must be waived
5. **Approvals**: Sufficient approvals based on risk level
6. **Judge Verdict**: Judge must return `approve` verdict

### Risk Assessment

Risk levels are automatically calculated:

| Risk Level | Required Approvals | Criteria |
|------------|-------------------|----------|
| Low | 1 | ≤3 devices, no routing/security changes, non-production |
| Medium | 1 | ≤10 devices, minor changes, single site |
| High | 2+ | >10 devices, routing changes, production |
| Critical | 2+ | >50 devices, multi-site, security policy changes |

### Orchestration API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/netops/orchestration/runs` | Create orchestration run |
| GET | `/netops/orchestration/runs` | List runs with filters |
| GET | `/netops/orchestration/runs/:runId` | Get run details |
| POST | `/netops/orchestration/runs/:runId/execute` | Execute pipeline (L0-L6) |
| POST | `/netops/orchestration/runs/:runId/approve` | Record approval |
| POST | `/netops/orchestration/runs/:runId/waive` | Waive critical findings |
| POST | `/netops/orchestration/runs/:runId/deploy` | Deploy (L7) |
| POST | `/netops/orchestration/runs/:runId/cancel` | Cancel run |
| GET | `/netops/orchestration/runs/:runId/nodes` | Get execution nodes |
| GET | `/netops/orchestration/runs/:runId/context-pack` | Get context pack |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NETOPS_DEPLOY_ENABLED` | `false` | Enable/disable L7 deploy |
| `NETOPS_LLM_PROVIDER` | `openai` | LLM provider (openai, azure) |
| `NETOPS_CHEAP_MODEL` | `gpt-4o-mini` | Model for L3 Planner |
| `NETOPS_STRONG_MODEL` | `gpt-4o` | Model for L4 Expert, L6 Judge |
| `NETOPS_MAX_TOKENS` | `8192` | Max tokens per LLM call |
| `NETOPS_CONTEXT_CACHE_TTL` | `300` | Context pack cache TTL (seconds) |

### Database Schema

```sql
-- Orchestration runs
CREATE TABLE net_orchestration_runs (
    id UUID PRIMARY KEY,
    change_request_id UUID REFERENCES net_change_requests,
    intent TEXT NOT NULL,
    intent_params JSONB DEFAULT '{}',
    scope JSONB NOT NULL,
    context_pack JSONB,
    context_pack_hash VARCHAR(64),
    context_pack_tokens INTEGER,
    status orchestration_status NOT NULL DEFAULT 'pending',
    current_layer orchestration_layer NOT NULL DEFAULT 'L0_intake',
    risk_level VARCHAR(20),
    required_approvals INTEGER DEFAULT 1,
    received_approvals INTEGER DEFAULT 0,
    has_verify_plan BOOLEAN DEFAULT FALSE,
    has_rollback_plan BOOLEAN DEFAULT FALSE,
    has_critical_findings BOOLEAN DEFAULT FALSE,
    critical_findings_waived BOOLEAN DEFAULT FALSE,
    deploy_enabled BOOLEAN DEFAULT TRUE,
    planner_output JSONB,
    expert_output JSONB,
    judge_output JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orchestration execution nodes
CREATE TABLE net_orchestration_nodes (
    id UUID PRIMARY KEY,
    run_id UUID REFERENCES net_orchestration_runs ON DELETE CASCADE,
    layer orchestration_layer NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    status node_status NOT NULL DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    llm_model VARCHAR(100),
    llm_tokens_in INTEGER,
    llm_tokens_out INTEGER,
    llm_latency_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Usage Example

```typescript
// 1. Create orchestration run
const run = await netopsService.createOrchestrationRun({
    intent: 'Update interface descriptions for all access switches at HQ site',
    intentParams: {
        descriptionPattern: '{port}-{vlan}-{location}'
    },
    scope: {
        sites: ['HQ'],
        roles: ['access']
    }
}, 'user-001')

// 2. Execute pipeline (L0 through L6)
const executed = await netopsService.executeOrchestrationRun(run.id)

// 3. Check if approval needed
if (executed.status === 'awaiting_approval') {
    // Record approvals
    await netopsService.recordOrchestrationApproval(run.id, {
        approver: 'manager-001',
        comment: 'Approved for off-hours deployment'
    })
}

// 4. Waive findings if needed
if (executed.hasCriticalFindings) {
    await netopsService.waiveOrchestrationFindings(run.id, {
        waiver: 'Accepted risk for legacy device compatibility',
        waivedBy: 'security-admin'
    })
}

// 5. Deploy (L7)
const deployed = await netopsService.deployOrchestrationRun(run.id)
```

## Future Enhancements

### Phase 2
- Real SSH/SNMP collectors (replace mocks)
- Vault integration for credential management
- Device fact collection (serial, inventory)

### Phase 3
- LLM-assisted config generation (now in Orchestrator)
- Candidate config diff preview
- Automated deployment with rollback (now in Orchestrator)

### Phase 4
- Multi-tenant isolation
- RBAC for change approvals
- Scheduled compliance scans

### Phase 5
- Real LLM provider integration (OpenAI, Azure)
- Streaming responses for long operations
- Cost tracking and quota management
- A/B testing for model selection

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update this documentation
4. Run lint and tests before PR

## License

Internal use only. Part of the MCP Server project.
