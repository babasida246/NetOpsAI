/**
 * Orchestrator Types
 * Type definitions for the multi-layer NetOps orchestration pipeline
 */

// ====================
// ENUMS
// ====================

export type OrchestrationStatus =
    | 'pending'
    | 'running'
    | 'awaiting_approval'
    | 'approved'
    | 'rejected'
    | 'deploying'
    | 'deployed'
    | 'rolled_back'
    | 'failed'
    | 'cancelled'

export type OrchestrationLayer =
    | 'L0_intake'
    | 'L1_context'
    | 'L2_deterministic'
    | 'L3_planner'
    | 'L4_expert'
    | 'L5_verification'
    | 'L6_judge'
    | 'L7_deploy'

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type ModelTier = 'cheap' | 'strong'

// ====================
// ORCHESTRATION RUN
// ====================

export interface OrchestrationRun {
    id: string
    changeRequestId: string | null

    // Intent and scope
    intent: string
    intentParams: Record<string, unknown>
    scope: OrchestrationScope

    // Context pack
    contextPack: NetOpsContextPack | null
    contextPackHash: string | null
    contextPackTokens: number | null

    // Status
    status: OrchestrationStatus
    currentLayer: OrchestrationLayer

    // Risk and approvals
    riskLevel: RiskLevel | null
    requiredApprovals: number
    receivedApprovals: number

    // Gating flags
    hasVerifyPlan: boolean
    hasRollbackPlan: boolean
    hasCriticalFindings: boolean
    criticalFindingsWaived: boolean
    deployEnabled: boolean

    // LLM outputs
    plannerOutput: TaskGraph | null
    expertOutput: ExpertOutput | null
    judgeOutput: JudgeVerdict | null

    // Timing
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date

    // Audit
    createdBy: string

    // Errors
    errorMessage: string | null
    errorDetails: Record<string, unknown> | null
}

export interface OrchestrationScope {
    deviceIds: string[]
    sites: string[]
    roles: string[]
    vendors: string[]
    tags: string[]
}

// ====================
// ORCHESTRATION NODE
// ====================

export interface OrchestrationNode {
    id: string
    runId: string

    // Identity
    nodeType: string
    layer: OrchestrationLayer
    sequenceNum: number

    // Dependencies
    dependsOn: string[]

    // Execution
    status: NodeStatus
    startedAt: Date | null
    completedAt: Date | null
    durationMs: number | null

    // I/O summaries (redacted)
    inputSummary: Record<string, unknown> | null
    outputSummary: Record<string, unknown> | null

    // LLM-specific
    modelUsed: string | null
    modelTier: ModelTier | null
    promptTokens: number | null
    completionTokens: number | null
    llmLatencyMs: number | null
    retryCount: number

    // Errors
    errorMessage: string | null
    errorCode: string | null

    createdAt: Date
    updatedAt: Date
}

// ====================
// CONTEXT PACK
// ====================

export interface NetOpsContextPack {
    // Metadata
    version: 'v1'
    generatedAt: Date
    expiresAt: Date
    hash: string

    // Prompt history (last N relevant exchanges)
    promptHistory: PromptHistoryEntry[]

    // Change history (recent changes in scope)
    changeHistory: ChangeHistoryEntry[]

    // Network snapshot (aggregated stats)
    networkSnapshot: NetworkSnapshot

    // Devices context (sampled/summarized)
    devicesContext: DeviceContextEntry[]

    // Policy context (active rulepacks)
    policyContext: PolicyContextEntry[]

    // Source references for grounding
    sourceRefs: SourceReference[]

    // Token estimates
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

export interface PromptHistoryEntry {
    timestamp: Date
    role: 'user' | 'assistant'
    content: string  // Truncated if too long
    intent?: string
    wasSuccessful?: boolean
}

export interface ChangeHistoryEntry {
    changeId: string
    title: string
    status: string
    riskLevel: RiskLevel
    affectedDevices: number
    createdAt: Date
    completedAt: Date | null
    outcome: 'success' | 'failed' | 'rolled_back' | 'pending'
}

export interface NetworkSnapshot {
    totalDevices: number
    devicesByVendor: Record<string, number>
    devicesBySite: Record<string, number>
    devicesByRole: Record<string, number>
    devicesByStatus: Record<string, number>
    recentConfigChanges: number  // Last 24h
    activeChanges: number
    pendingApprovals: number
}

export interface DeviceContextEntry {
    id: string
    name: string
    hostname: string
    vendor: string
    role: string
    site: string
    status: string
    lastConfigAt: Date | null
    configDigest: string | null  // Deterministic summary
}

export interface PolicyContextEntry {
    id: string
    name: string
    vendor: string
    ruleCount: number
    enabledRules: number
    criticalRules: number
    highRules: number
}

export interface SourceReference {
    type: 'device' | 'config' | 'rulepack' | 'change' | 'doc'
    id: string
    label: string
    relevanceScore: number
}

// ====================
// TASK GRAPH (Planner Output)
// ====================

export interface TaskGraph {
    version: 'v1'
    planId: string
    summary: string
    riskAssessment: RiskAssessment

    // Phases (sequential)
    phases: TaskPhase[]

    // Rollback strategy
    rollbackStrategy: RollbackStrategy

    // Verification steps
    verificationSteps: VerificationStep[]
}

export interface RiskAssessment {
    level: RiskLevel
    factors: string[]
    mitigations: string[]
    affectedServices: string[]
    estimatedDowntime: string | null
    requiresMaintenanceWindow: boolean
}

export interface TaskPhase {
    phaseId: string
    name: string
    description: string
    order: number

    // Tasks within phase (can be parallel)
    tasks: Task[]

    // Pre/post conditions
    preConditions: Condition[]
    postConditions: Condition[]

    // Rollback for this phase
    rollbackOnFailure: boolean
}

export interface Task {
    taskId: string
    deviceId: string
    deviceName: string
    action: 'configure' | 'verify' | 'backup' | 'restore' | 'wait' | 'notify'
    description: string

    // Config generation hints
    configHints?: {
        sections: string[]  // Which config sections to modify
        commands?: string[] // Suggested commands (vendor-specific)
    }

    // Dependencies within phase
    dependsOn: string[]

    // Timing
    estimatedDurationSec: number
    timeout: number

    // Retry policy
    maxRetries: number
    retryDelaySec: number
}

export interface Condition {
    type: 'ping' | 'port_check' | 'snmp_poll' | 'api_check' | 'manual'
    target?: string
    expectedValue?: string
    timeout: number
}

export interface RollbackStrategy {
    automatic: boolean
    triggers: string[]  // Conditions that trigger rollback
    steps: RollbackStep[]
}

export interface RollbackStep {
    order: number
    deviceId: string
    action: 'restore_config' | 'run_command' | 'notify'
    description: string
}

export interface VerificationStep {
    stepId: string
    name: string
    type: 'connectivity' | 'service' | 'metric' | 'manual'
    target?: string
    expectedOutcome: string
    timeout: number
}

// ====================
// EXPERT OUTPUT
// ====================

export interface ExpertOutput {
    version: 'v1'
    generatedAt: string

    // Per-device generated configs
    deviceConfigs: DeviceConfigOutput[]

    // Commands summary
    commandsSummary: {
        totalCommands: number
        bySection: Record<string, number>
    }

    // Warnings from expert
    warnings: string[]
}

export interface DeviceConfigOutput {
    deviceId: string
    deviceName: string
    vendor: string

    // Generated config (redacted for storage)
    configSnippet: string
    configLines: number

    // Structured commands
    commands: GeneratedCommand[]

    // Verification commands
    verifyCommands: string[]
}

export interface GeneratedCommand {
    order: number
    command: string
    section: string
    purpose: string
    isReversible: boolean
    rollbackCommand?: string
}

// ====================
// JUDGE VERDICT
// ====================

export interface JudgeVerdict {
    version: 'v1'
    evaluatedAt: string

    // Overall verdict
    verdict: 'approve' | 'reject' | 'needs_review'
    confidence: number  // 0-1

    // Policy compliance
    policyCompliance: {
        passed: number
        failed: number
        warnings: number
        findings: PolicyFinding[]
    }

    // Security review
    securityReview: {
        score: number  // 0-100
        issues: SecurityIssue[]
        recommendations: string[]
    }

    // Change impact
    impactAnalysis: {
        affectedDevices: number
        affectedServices: string[]
        estimatedRisk: RiskLevel
        potentialIssues: string[]
    }

    // Approval requirements
    approvalRequirements: {
        requiredApprovers: number
        requiredRoles: string[]
        reason: string
    }

    // Reasoning
    reasoning: string
}

export interface PolicyFinding {
    ruleId: string
    ruleName: string
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    message: string
    deviceId?: string
    path?: string
    remediation?: string
}

export interface SecurityIssue {
    type: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    affectedDevices: string[]
    recommendation: string
}

// ====================
// REQUEST/RESPONSE TYPES
// ====================

export interface CreateOrchestrationRunInput {
    intent: string
    intentParams?: Record<string, unknown>
    scope?: Partial<OrchestrationScope>
    changeRequestId?: string
}

export interface OrchestrationRunFilters {
    status?: OrchestrationStatus
    changeRequestId?: string
    createdBy?: string
    riskLevel?: RiskLevel
    fromDate?: Date
    toDate?: Date
    limit?: number
    offset?: number
}

export interface RunStepResult {
    success: boolean
    nodeId: string
    layer: OrchestrationLayer
    output?: unknown
    error?: {
        code: string
        message: string
        retryable: boolean
    }
    metrics?: {
        durationMs: number
        tokens?: number
        retries?: number
    }
}

// ====================
// LAYER DEFINITIONS
// ====================

export const LAYER_ORDER: OrchestrationLayer[] = [
    'L0_intake',
    'L1_context',
    'L2_deterministic',
    'L3_planner',
    'L4_expert',
    'L5_verification',
    'L6_judge',
    'L7_deploy'
]

export const LAYER_CONFIG: Record<OrchestrationLayer, {
    name: string
    description: string
    requiresLLM: boolean
    modelTier: ModelTier | null
    canRetry: boolean
    maxRetries: number
}> = {
    'L0_intake': {
        name: 'Intake & Guardrails',
        description: 'Validate input, check permissions, apply guardrails',
        requiresLLM: false,
        modelTier: null,
        canRetry: false,
        maxRetries: 0
    },
    'L1_context': {
        name: 'Context Builder',
        description: 'Build NetOpsContextPack with scope, history, snapshots',
        requiresLLM: false,
        modelTier: null,
        canRetry: true,
        maxRetries: 2
    },
    'L2_deterministic': {
        name: 'Deterministic Engine',
        description: 'Run lint, compute digests, check policies',
        requiresLLM: false,
        modelTier: null,
        canRetry: true,
        maxRetries: 2
    },
    'L3_planner': {
        name: 'Planner',
        description: 'LLM generates TaskGraph with phases and rollback',
        requiresLLM: true,
        modelTier: 'cheap',
        canRetry: true,
        maxRetries: 3
    },
    'L4_expert': {
        name: 'Vendor Expert',
        description: 'LLM generates vendor-specific configurations',
        requiresLLM: true,
        modelTier: 'strong',
        canRetry: true,
        maxRetries: 3
    },
    'L5_verification': {
        name: 'Verification Builder',
        description: 'Build verification and rollback plans',
        requiresLLM: false,
        modelTier: null,
        canRetry: true,
        maxRetries: 2
    },
    'L6_judge': {
        name: 'Policy Judge',
        description: 'LLM evaluates policy compliance and security',
        requiresLLM: true,
        modelTier: 'strong',
        canRetry: true,
        maxRetries: 3
    },
    'L7_deploy': {
        name: 'Human + Deploy',
        description: 'Human approval and actual deployment',
        requiresLLM: false,
        modelTier: null,
        canRetry: false,
        maxRetries: 0
    }
}
