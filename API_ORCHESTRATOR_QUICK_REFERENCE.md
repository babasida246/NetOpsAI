# 🎯 Multi-Layer LLM Orchestrator - Quick Reference

## ✅ ANSWER: **YES - FULLY SUPPORTED**

API có **8-layer orchestration system** với **3 LLM layers** tích hợp.

---

## 📊 Quick Overview

### 8-Layer Architecture
```
L0 (Intake) → L1 (Context) → L2 (Deterministic) → 
L3 (Planner🤖) → L4 (Expert🤖) → L5 (Verification) → 
L6 (Judge🤖) → L7 (Deploy)
```

### LLM Layers
| Layer | Task | Model | Tier |
|-------|------|-------|------|
| **L3** | Generate task plan | gpt-4o-mini | Cheap |
| **L4** | Generate configs | gpt-4o | Strong |
| **L6** | Policy review | gpt-4o | Strong |

---

## 🔧 Configuration

```bash
# Environment Variables
NETOPS_CHEAP_MODEL=gpt-4o-mini          # L3 Planner
NETOPS_STRONG_MODEL=gpt-4o              # L4, L6
NETOPS_DEPLOY_ENABLED=true
NETOPS_HIGH_RISK_APPROVALS_REQUIRED=2
```

---

## 🚀 Usage Example

```bash
# Start orchestration run
POST /netops/orchestration/runs
{
    "intent": "Enable VLAN 100 on core switches",
    "scope": {
        "roles": ["core"],
        "vendors": ["cisco"]
    }
}

# Get status
GET /netops/orchestration/runs/{runId}

# Approve
POST /netops/orchestration/runs/{runId}/approve
{
    "decision": "approve",
    "comment": "Approved"
}
```

---

## 📁 Code Structure

```
orchestrator/
├── orchestrator.ts       # Main engine
├── types.ts              # Definitions + LAYER_CONFIG
├── llm-wrapper.ts        # LLM integration
├── llm-schemas.ts        # Zod schemas + prompts
├── state-machine.ts      # Status transitions
└── context-builder.ts    # Context packing
```

---

## ⚡ Key Features

✅ Configurable LLM models (cheap/strong)
✅ Strict JSON schema validation
✅ Automatic retry logic (3 retries per LLM layer)
✅ Risk-based approval gates
✅ Automatic rollback planning
✅ Token usage tracking
✅ Context caching & optimization
✅ Full audit trail

---

## 📖 Layer Details

### L3: Planner (Cheap LLM)
- Generates task graph with phases
- Rollback strategy planning
- Risk assessment

### L4: Vendor Expert (Strong LLM)
- Per-device config generation
- Vendor-specific commands
- Verification commands

### L6: Policy Judge (Strong LLM)
- Policy compliance check
- Security review (0-100 score)
- Approval requirements

---

## 🔍 Status Flow

```
pending → running → awaiting_approval → approved → 
deploying → deployed
                  ↓
                rejected / failed / rolled_back
```

---

## 📊 Risk Levels

- `low` - Single approval
- `medium` - Single approval
- `high` - Multiple approvals (configurable)
- `critical` - Multiple approvals + waiver option

---

**Full Analysis**: See `API_MULTI_LAYER_ORCHESTRATOR_ANALYSIS.md`
