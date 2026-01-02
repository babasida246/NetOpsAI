# API Multi-Layer Orchestrator for LLM Models - Technical Analysis

## ✅ **YES - API HỖ TRỢ MULTI-LAYER ORCHESTRATOR CHO LLM MODELS**

---

## 📊 Tổng Quan

API có **8-layer orchestration system** được thiết kế đặc biệt để hỗ trợ các mô hình LLM trong việc xử lý các tác vụ network operations (NetOps) một cách có cấu trúc và an toàn.

---

## 🏗️ Kiến Trúc Multi-Layer Orchestrator

### 8 Layers (L0 - L7)

```
┌─────────────────────────────────────────────────┐
│  L7_deploy: Human + Deploy                       │ (No LLM, Final approval & deploy)
├─────────────────────────────────────────────────┤
│  L6_judge: Policy Judge                          │ (Strong LLM tier)
├─────────────────────────────────────────────────┤
│  L5_verification: Verification Builder           │ (No LLM, Deterministic)
├─────────────────────────────────────────────────┤
│  L4_expert: Vendor Expert Config Generator       │ (Strong LLM tier)
├─────────────────────────────────────────────────┤
│  L3_planner: Task Graph Planner                  │ (Cheap LLM tier)
├─────────────────────────────────────────────────┤
│  L2_deterministic: Policy & Lint Engine          │ (No LLM, Deterministic)
├─────────────────────────────────────────────────┤
│  L1_context: Context Builder                     │ (No LLM, Deterministic)
├─────────────────────────────────────────────────┤
│  L0_intake: Intake & Guardrails                  │ (No LLM, Validation)
└─────────────────────────────────────────────────┘
```

---

## 📋 Chi Tiết Các Layers

### **L0: Intake & Guardrails**
- **Mục đích**: Validate input, check permissions, apply guardrails
- **LLM**: ❌ Không sử dụng
- **Retry**: ❌ Không thể retry
- **Kỹ thuật**: Deterministic validation

### **L1: Context Builder**
- **Mục đích**: Build NetOpsContextPack với scope, history, snapshots
- **LLM**: ❌ Không sử dụng
- **Retry**: ✅ Có (max 2 retries)
- **Kỹ thuật**: Aggregates device data, change history, network snapshots

### **L2: Deterministic Engine**
- **Mục đích**: Run lint, compute digests, check policies
- **LLM**: ❌ Không sử dụng
- **Retry**: ✅ Có (max 2 retries)
- **Kỹ thuật**: Policy validation, linting

### **L3: Planner** ⭐ LLM Layer 1
- **Mục đích**: LLM generates TaskGraph with phases and rollback strategy
- **LLM**: ✅ Sử dụng (Cheap tier)
- **Model**: `gpt-4o-mini` (default, configurable)
- **Retry**: ✅ Có (max 3 retries)
- **Output**: 
  - Task phases with dependencies
  - Rollback strategy
  - Verification steps
  - Risk assessment

### **L4: Vendor Expert** ⭐ LLM Layer 2
- **Mục đích**: LLM generates vendor-specific configurations
- **LLM**: ✅ Sử dụng (Strong tier)
- **Model**: `gpt-4o` (default, configurable)
- **Retry**: ✅ Có (max 3 retries)
- **Output**:
  - Per-device generated configs
  - Vendor-specific commands
  - Configuration snippets
  - Verification commands

### **L5: Verification Builder**
- **Mục đích**: Build verification and rollback plans
- **LLM**: ❌ Không sử dụng
- **Retry**: ✅ Có (max 2 retries)
- **Kỹ thuật**: Deterministic plan generation

### **L6: Policy Judge** ⭐ LLM Layer 3
- **Mục đích**: LLM evaluates policy compliance and security
- **LLM**: ✅ Sử dụng (Strong tier)
- **Model**: `gpt-4o` (default, configurable)
- **Retry**: ✅ Có (max 3 retries)
- **Output**:
  - Policy compliance verdict
  - Security review with score (0-100)
  - Impact analysis
  - Approval requirements

### **L7: Human + Deploy**
- **Mục đích**: Human approval and actual deployment
- **LLM**: ❌ Không sử dụng
- **Retry**: ❌ Không thể retry
- **Kỹ thuật**: Manual approval + deployment execution

---

## 🤖 LLM Model Support

### Model Tiers

API định nghĩa 2 tier cho LLM:

1. **Cheap Tier** (Planner L3)
   - Default: `gpt-4o-mini`
   - Env: `NETOPS_CHEAP_MODEL`
   - Use case: Task planning, rapid iteration
   - Cost-optimized

2. **Strong Tier** (Vendor Expert L4, Policy Judge L6)
   - Default: `gpt-4o`
   - Env: `NETOPS_STRONG_MODEL`
   - Use case: Complex configuration, policy evaluation
   - Accuracy-optimized

### Configuration

```typescript
interface LLMConfig {
    cheapModel: string           // Default: gpt-4o-mini
    strongModel: string          // Default: gpt-4o
    maxRetries: number          // Default: 3
    retryDelayMs: number        // Default: 1000
    timeoutMs: number           // Default: 60000
}
```

### Environment Variables
```bash
NETOPS_CHEAP_MODEL=gpt-4o-mini      # Planner layer
NETOPS_STRONG_MODEL=gpt-4o          # Expert & Judge layers
```

---

## 🔄 Orchestration Flow

### Sequential Processing with Gating

```
User Request
    ↓
[L0] Intake & Guardrails (Validation)
    ↓
[L1] Context Builder (Gather context)
    ↓
[L2] Deterministic Engine (Policy check)
    ↓
[L3] Planner (LLM: Generate task graph) ⭐
    ↓
[L4] Vendor Expert (LLM: Generate configs) ⭐
    ↓
[L5] Verification Builder (Build test plans)
    ↓
[L6] Policy Judge (LLM: Final review) ⭐
    ↓
[L7] Human Approval + Deploy
    ↓
Deployment Complete
```

### Key Features

✅ **Sequential Processing**: Each layer passes output to next layer
✅ **Deterministic Validation**: Non-LLM layers use strict business logic
✅ **LLM Integration**: 3 strategic LLM layers with different models
✅ **Retry Logic**: Configurable retries per layer
✅ **State Machine**: Strict status transitions
✅ **Risk Assessment**: Risk level calculation
✅ **Context Packing**: Efficient context management with caching

---

## 📦 Data Structures

### OrchestrationRun

```typescript
interface OrchestrationRun {
    id: string
    changeRequestId: string | null
    
    // Intent and scope
    intent: string
    intentParams: Record<string, unknown>
    scope: OrchestrationScope {
        deviceIds: string[]
        sites: string[]
        roles: string[]
        vendors: string[]
        tags: string[]
    }
    
    // Context pack
    contextPack: NetOpsContextPack | null
    contextPackHash: string | null
    
    // Status
    status: OrchestrationStatus
    currentLayer: OrchestrationLayer
    
    // Risk and approvals
    riskLevel: RiskLevel
    requiredApprovals: number
    receivedApprovals: number
    
    // LLM outputs
    plannerOutput: TaskGraph | null
    expertOutput: ExpertOutput | null
    judgeOutput: JudgeVerdict | null
    
    // Gating flags
    hasVerifyPlan: boolean
    hasRollbackPlan: boolean
    hasCriticalFindings: boolean
    criticalFindingsWaived: boolean
    deployEnabled: boolean
}
```

### OrchestrationNode

```typescript
interface OrchestrationNode {
    id: string
    runId: string
    
    // Layer info
    layer: OrchestrationLayer
    sequenceNum: number
    
    // Execution
    status: NodeStatus
    startedAt: Date | null
    completedAt: Date | null
    durationMs: number | null
    
    // LLM-specific
    modelUsed: string | null
    modelTier: ModelTier | null
    promptTokens: number | null
    completionTokens: number | null
    llmLatencyMs: number | null
    retryCount: number
}
```

---

## 🧠 LLM Prompts & Schemas

### Strict JSON Schemas

Mỗi LLM layer có strict Zod schema validation:

#### L3 Planner Output (TaskGraph)
```typescript
{
    version: 'v1',
    planId: string,
    summary: string,
    riskAssessment: {
        level: 'low' | 'medium' | 'high' | 'critical',
        factors: string[],
        mitigations: string[]
    },
    phases: [
        {
            phaseId: string,
            name: string,
            tasks: Task[],
            rollbackOnFailure: boolean
        }
    ],
    rollbackStrategy: {
        automatic: boolean,
        steps: RollbackStep[]
    },
    verificationSteps: VerificationStep[]
}
```

#### L4 Vendor Expert Output
```typescript
{
    version: 'v1',
    generatedAt: Date,
    deviceConfigs: [
        {
            deviceId: string,
            vendor: string,
            configSnippet: string,
            commands: GeneratedCommand[],
            verifyCommands: string[]
        }
    ],
    commandsSummary: {
        totalCommands: number,
        bySection: Record<string, number>
    },
    warnings: string[]
}
```

#### L6 Policy Judge Output
```typescript
{
    version: 'v1',
    evaluatedAt: Date,
    verdict: 'approve' | 'reject' | 'needs_review',
    confidence: number,
    policyCompliance: {
        passed: number,
        failed: number,
        findings: PolicyFinding[]
    },
    securityReview: {
        score: number,
        issues: SecurityIssue[]
    },
    approvalRequirements: {
        requiredApprovers: number,
        requiredRoles: string[]
    }
}
```

---

## 🔐 Context Packing & Optimization

### NetOpsContextPack

```typescript
interface NetOpsContextPack {
    version: 'v1'
    generatedAt: Date
    expiresAt: Date
    hash: string
    
    // Components
    promptHistory: PromptHistoryEntry[]
    changeHistory: ChangeHistoryEntry[]
    networkSnapshot: NetworkSnapshot
    devicesContext: DeviceContextEntry[]
    policyContext: PolicyContextEntry[]
    sourceRefs: SourceReference[]
    
    // Token tracking
    tokenEstimates: {
        total: number,
        promptHistory: number,
        changeHistory: number,
        networkSnapshot: number,
        devicesContext: number,
        policyContext: number,
        sourceRefs: number
    }
}
```

### Caching Strategy
- ✅ Hash-based cache key generation
- ✅ Configurable cache expiration
- ✅ Token estimation and optimization

---

## 📍 File Locations

```
apps/api/src/modules/netops/
├── orchestrator/
│   ├── orchestrator.ts          # Main orchestrator engine
│   ├── types.ts                 # Type definitions & LAYER_CONFIG
│   ├── llm-wrapper.ts           # LLM integration wrapper
│   ├── llm-schemas.ts           # Zod schemas & prompts
│   ├── state-machine.ts         # Status/layer transitions
│   ├── context-builder.ts       # Context packing logic
│   └── index.ts                 # Exports
├── netops.routes.ts             # API routes (includes orchestration endpoints)
├── netops.service.ts            # Business logic
├── netops.schema.ts             # Request/response schemas
└── netops.types.ts              # Local type definitions
```

---

## 🔌 API Endpoints (Orchestration)

### Create Orchestration Run
```http
POST /netops/orchestration/runs
Content-Type: application/json

{
    "intent": "Enable VLAN 100 on core switches",
    "intentParams": {
        "vlan_id": 100,
        "vlan_name": "Production"
    },
    "scope": {
        "roles": ["core"],
        "vendors": ["cisco"]
    }
}
```

**Response**: `201 Created`
```json
{
    "id": "run-uuid",
    "status": "pending",
    "currentLayer": "L0_intake",
    "createdAt": "2025-12-25T..."
}
```

### List Orchestration Runs
```http
GET /netops/orchestration/runs?status=running&limit=20&offset=0
```

### Get Run Details
```http
GET /netops/orchestration/runs/{runId}
```

### Approve/Reject Run
```http
POST /netops/orchestration/runs/{runId}/approve
Content-Type: application/json

{
    "decision": "approve",
    "comment": "Approved after review"
}
```

### Waive Critical Findings
```http
POST /netops/orchestration/runs/{runId}/waive
Content-Type: application/json

{
    "reason": "Waiver justified for emergency change"
}
```

---

## 🧪 Testing & Mock

### Mock LLM Client (Development)

```typescript
export class MockLLMClient implements LLMClient {
    async complete(request: LLMRequest): Promise<LLMResponse> {
        // Generates mock responses for testing
        // - Task graphs for Planner
        // - Config outputs for Vendor Expert
        // - Verdicts for Policy Judge
    }
}
```

Location: `llm-wrapper.ts` lines 68-100+

---

## ⚙️ Configuration & Environment

### Required Environment Variables
```bash
# LLM Model Selection
NETOPS_CHEAP_MODEL=gpt-4o-mini
NETOPS_STRONG_MODEL=gpt-4o

# Orchestrator Settings
NETOPS_DEPLOY_ENABLED=true
NETOPS_HIGH_RISK_APPROVALS_REQUIRED=2
```

### Orchestrator Config
```typescript
interface OrchestratorConfig {
    deployEnabled: boolean
    highRiskApprovalsRequired: number
    enableContextCache: boolean
    llmConfig?: Partial<LLMConfig>
}
```

---

## 📊 Layer Execution Summary

| Layer | Name | LLM | Model Tier | Retries | Purpose |
|-------|------|-----|-----------|---------|---------|
| L0 | Intake | ❌ | - | 0 | Input validation |
| L1 | Context | ❌ | - | 2 | Build context |
| L2 | Deterministic | ❌ | - | 2 | Policy check |
| **L3** | **Planner** | **✅** | **Cheap** | **3** | **Task plan** |
| **L4** | **Vendor Expert** | **✅** | **Strong** | **3** | **Config gen** |
| L5 | Verification | ❌ | - | 2 | Build tests |
| **L6** | **Policy Judge** | **✅** | **Strong** | **3** | **Review** |
| L7 | Deploy | ❌ | - | 0 | Human approval |

---

## 🎯 Key Capabilities

✅ **Multi-Model Support**: Configurable cheap & strong LLM models
✅ **Strict Schema Validation**: Zod-based validation for all LLM outputs
✅ **Retry Logic**: Configurable retries with exponential backoff
✅ **Context Optimization**: Token estimation & caching
✅ **Risk Assessment**: Automatic risk level calculation
✅ **Approval Gates**: Requirement-based approval workflow
✅ **Rollback Planning**: Automatic rollback strategy generation
✅ **State Machine**: Strict status transition validation
✅ **Audit Trail**: Complete audit logging of all operations
✅ **Token Tracking**: LLM token usage monitoring

---

## 📈 Advanced Features

### 1. Risk-Based Approval Requirements
```typescript
// High risk changes require multiple approvals
requiredApprovals = riskLevel === 'critical' 
    ? config.highRiskApprovalsRequired 
    : 1
```

### 2. Waiver Support
```typescript
// Can waive critical findings with justification
criticalFindingsWaived = true // After approval
```

### 3. Verification & Rollback Planning
- Automatic verification step generation
- Automatic rollback strategy generation
- Pre-flight condition checking
- Post-flight condition verification

### 4. Context Caching
- Hash-based deduplication
- Configurable expiration
- Token estimate tracking

---

## 🔍 Example Orchestration Run Flow

```
1. User submits intent: "Enable VLAN 100 on core switches"
   └─> L0_intake: Validate input, permissions ✓
   
2. L1_context: Gather network context
   ├─ Recent changes history
   ├─ Current device state
   ├─ Active policies
   └─ Return: NetOpsContextPack
   
3. L2_deterministic: Run linting & policy checks
   ├─ Verify scope matches policies
   ├─ Check for conflicts
   └─ Flag critical issues
   
4. L3_planner: LLM generates task graph
   ├─ Model: gpt-4o-mini (cheap)
   ├─ Prompt: "Plan VLAN 100 rollout"
   └─ Output: TaskGraph with phases, rollback strategy
   
5. L4_vendor_expert: LLM generates configs
   ├─ Model: gpt-4o (strong)
   ├─ Prompt: "Generate Cisco commands for VLAN 100"
   └─ Output: Per-device configs, verify commands
   
6. L5_verification: Build verification plan
   ├─ Create post-deployment tests
   ├─ Setup connectivity checks
   └─ Generate metric checks
   
7. L6_judge: LLM reviews for compliance
   ├─ Model: gpt-4o (strong)
   ├─ Prompt: "Review for policy compliance & security"
   └─ Output: Verdict + approval requirements
   
8. L7_deploy: Human approval & deployment
   ├─ Status: "awaiting_approval"
   ├─ User: Reviews and approves
   └─ Status: "approved" → "deploying" → "deployed"
```

---

## ✨ Conclusion

**API HOÀN TOÀN HỖ TRỢ Multi-Layer Orchestrator cho LLM Models** với:
- ✅ 8 layers xây dựng (L0-L7)
- ✅ 3 LLM layers (L3 Planner, L4 Expert, L6 Judge)
- ✅ 2 model tiers (cheap, strong)
- ✅ Strict schema validation
- ✅ Retry logic & error handling
- ✅ Risk assessment & approval gates
- ✅ Full audit trail
- ✅ Context optimization

Đây là một hệ thống orchestration **production-ready** cho network operations automation.

---

**Document Generated**: December 25, 2025
**Source**: `apps/api/src/modules/netops/orchestrator/`
