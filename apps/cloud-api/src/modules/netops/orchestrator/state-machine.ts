/**
 * State Machine
 * Status transitions, guards, and layer management for orchestration runs
 */

import type {
    OrchestrationStatus,
    OrchestrationLayer,
    OrchestrationRun,
    RiskLevel,
    LAYER_ORDER
} from './types.js'

// ====================
// STATUS TRANSITIONS
// ====================

/**
 * Valid status transitions
 */
const STATUS_TRANSITIONS: Record<OrchestrationStatus, OrchestrationStatus[]> = {
    'pending': ['running', 'cancelled', 'failed'],
    'running': ['awaiting_approval', 'failed', 'cancelled'],
    'awaiting_approval': ['approved', 'rejected', 'cancelled'],
    'approved': ['deploying', 'cancelled'],
    'rejected': [], // Terminal state
    'deploying': ['deployed', 'rolled_back', 'failed'],
    'deployed': ['rolled_back'], // Can rollback after deploy
    'rolled_back': [], // Terminal state
    'failed': [], // Terminal state
    'cancelled': [] // Terminal state
}

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(
    from: OrchestrationStatus,
    to: OrchestrationStatus
): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Get all valid next statuses from current status
 */
export function getValidNextStatuses(status: OrchestrationStatus): OrchestrationStatus[] {
    return STATUS_TRANSITIONS[status] || []
}

/**
 * Check if status is terminal (no further transitions possible)
 */
export function isTerminalStatus(status: OrchestrationStatus): boolean {
    return STATUS_TRANSITIONS[status]?.length === 0
}

// ====================
// LAYER TRANSITIONS
// ====================

const LAYER_ORDER_ARRAY: OrchestrationLayer[] = [
    'L0_intake',
    'L1_context',
    'L2_deterministic',
    'L3_planner',
    'L4_expert',
    'L5_verification',
    'L6_judge',
    'L7_deploy'
]

/**
 * Get the next layer in sequence
 */
export function getNextLayer(current: OrchestrationLayer): OrchestrationLayer | null {
    const idx = LAYER_ORDER_ARRAY.indexOf(current)
    if (idx === -1 || idx >= LAYER_ORDER_ARRAY.length - 1) {
        return null
    }
    return LAYER_ORDER_ARRAY[idx + 1]
}

/**
 * Get the previous layer in sequence
 */
export function getPreviousLayer(current: OrchestrationLayer): OrchestrationLayer | null {
    const idx = LAYER_ORDER_ARRAY.indexOf(current)
    if (idx <= 0) {
        return null
    }
    return LAYER_ORDER_ARRAY[idx - 1]
}

/**
 * Get layer index (0-7)
 */
export function getLayerIndex(layer: OrchestrationLayer): number {
    return LAYER_ORDER_ARRAY.indexOf(layer)
}

/**
 * Check if a layer has been completed
 */
export function isLayerCompleted(
    currentLayer: OrchestrationLayer,
    checkLayer: OrchestrationLayer
): boolean {
    return getLayerIndex(currentLayer) > getLayerIndex(checkLayer)
}

// ====================
// GUARDS
// ====================

export interface GuardResult {
    allowed: boolean
    reason?: string
    requiredAction?: string
}

/**
 * Check if run can proceed to next layer
 */
export function canProceedToNextLayer(run: OrchestrationRun): GuardResult {
    // Check terminal status
    if (isTerminalStatus(run.status)) {
        return {
            allowed: false,
            reason: `Run is in terminal status: ${run.status}`
        }
    }

    // Check layer-specific guards
    switch (run.currentLayer) {
        case 'L0_intake':
            return checkIntakeGuards(run)
        case 'L1_context':
            return checkContextGuards(run)
        case 'L2_deterministic':
            return checkDeterministicGuards(run)
        case 'L3_planner':
            return checkPlannerGuards(run)
        case 'L4_expert':
            return checkExpertGuards(run)
        case 'L5_verification':
            return checkVerificationGuards(run)
        case 'L6_judge':
            return checkJudgeGuards(run)
        case 'L7_deploy':
            return checkDeployGuards(run)
        default:
            return { allowed: true }
    }
}

function checkIntakeGuards(run: OrchestrationRun): GuardResult {
    // Intent must be present
    if (!run.intent || run.intent.trim().length === 0) {
        return {
            allowed: false,
            reason: 'Intent is required',
            requiredAction: 'Provide a valid intent description'
        }
    }

    // Scope must have at least some targeting
    const scope = run.scope
    if (!scope.deviceIds.length && !scope.sites.length && !scope.roles.length && !scope.vendors.length) {
        return {
            allowed: false,
            reason: 'Scope must target at least one device or filter',
            requiredAction: 'Specify deviceIds, sites, roles, or vendors'
        }
    }

    return { allowed: true }
}

function checkContextGuards(run: OrchestrationRun): GuardResult {
    // Context pack should be built
    if (!run.contextPack) {
        return {
            allowed: false,
            reason: 'Context pack has not been built',
            requiredAction: 'Build context pack first'
        }
    }

    return { allowed: true }
}

function checkDeterministicGuards(run: OrchestrationRun): GuardResult {
    // Context pack required
    if (!run.contextPack) {
        return {
            allowed: false,
            reason: 'Context pack required for deterministic checks'
        }
    }

    return { allowed: true }
}

function checkPlannerGuards(run: OrchestrationRun): GuardResult {
    // Must have passed L2
    if (!isLayerCompleted(run.currentLayer, 'L2_deterministic')) {
        return {
            allowed: false,
            reason: 'Deterministic layer must complete first'
        }
    }

    return { allowed: true }
}

function checkExpertGuards(run: OrchestrationRun): GuardResult {
    // Must have planner output
    if (!run.plannerOutput) {
        return {
            allowed: false,
            reason: 'Planner output (TaskGraph) is required',
            requiredAction: 'Run planner layer first'
        }
    }

    return { allowed: true }
}

function checkVerificationGuards(run: OrchestrationRun): GuardResult {
    // Must have expert output
    if (!run.expertOutput) {
        return {
            allowed: false,
            reason: 'Expert output is required',
            requiredAction: 'Run expert layer first'
        }
    }

    return { allowed: true }
}

function checkJudgeGuards(run: OrchestrationRun): GuardResult {
    // Must have verification
    if (!run.hasVerifyPlan) {
        return {
            allowed: false,
            reason: 'Verification plan is required before judge evaluation',
            requiredAction: 'Build verification plan first'
        }
    }

    return { allowed: true }
}

function checkDeployGuards(run: OrchestrationRun): GuardResult {
    // Deploy feature flag
    if (!run.deployEnabled) {
        return {
            allowed: false,
            reason: 'Deployment is disabled by feature flag',
            requiredAction: 'Enable NETOPS_DEPLOY_ENABLED or contact admin'
        }
    }

    // Must have judge verdict
    if (!run.judgeOutput) {
        return {
            allowed: false,
            reason: 'Judge verdict is required',
            requiredAction: 'Run judge layer first'
        }
    }

    // Judge must approve
    if (run.judgeOutput.verdict === 'reject') {
        return {
            allowed: false,
            reason: 'Judge rejected the change',
            requiredAction: 'Review and address judge findings'
        }
    }

    // Must have verify plan
    if (!run.hasVerifyPlan) {
        return {
            allowed: false,
            reason: 'Verification plan is required for deployment',
            requiredAction: 'Build verification plan'
        }
    }

    // Must have rollback plan
    if (!run.hasRollbackPlan) {
        return {
            allowed: false,
            reason: 'Rollback plan is required for deployment',
            requiredAction: 'Build rollback plan'
        }
    }

    // Check critical findings
    if (run.hasCriticalFindings && !run.criticalFindingsWaived) {
        return {
            allowed: false,
            reason: 'Critical findings must be resolved or waived',
            requiredAction: 'Resolve findings or request waiver'
        }
    }

    // Check approvals
    if (run.receivedApprovals < run.requiredApprovals) {
        return {
            allowed: false,
            reason: `Insufficient approvals: ${run.receivedApprovals}/${run.requiredApprovals}`,
            requiredAction: 'Request more approvals'
        }
    }

    return { allowed: true }
}

// ====================
// RISK-BASED APPROVALS
// ====================

/**
 * Calculate required approvals based on risk level
 */
export function calculateRequiredApprovals(
    riskLevel: RiskLevel,
    highRiskApprovalsRequired: number = 2
): number {
    switch (riskLevel) {
        case 'critical':
            return Math.max(highRiskApprovalsRequired, 2)
        case 'high':
            return highRiskApprovalsRequired
        case 'medium':
            return 1
        case 'low':
            return 1
        default:
            return 1
    }
}

/**
 * Determine risk level based on various factors
 */
export function assessRiskLevel(factors: {
    deviceCount: number
    hasRoutingChanges: boolean
    hasSecurityChanges: boolean
    hasVlanChanges: boolean
    affectedSites: number
    isProduction: boolean
}): RiskLevel {
    let score = 0

    // Device count impact
    if (factors.deviceCount > 50) score += 3
    else if (factors.deviceCount > 10) score += 2
    else if (factors.deviceCount > 1) score += 1

    // Change type impact
    if (factors.hasRoutingChanges) score += 2
    if (factors.hasSecurityChanges) score += 2
    if (factors.hasVlanChanges) score += 1

    // Site spread impact
    if (factors.affectedSites > 5) score += 2
    else if (factors.affectedSites > 1) score += 1

    // Production impact
    if (factors.isProduction) score += 2

    // Map score to risk level
    if (score >= 8) return 'critical'
    if (score >= 5) return 'high'
    if (score >= 2) return 'medium'
    return 'low'
}

// ====================
// STATE MACHINE CLASS
// ====================

export class OrchestrationStateMachine {
    private run: OrchestrationRun

    constructor(run: OrchestrationRun) {
        this.run = run
    }

    /**
     * Get current state
     */
    getState(): { status: OrchestrationStatus; layer: OrchestrationLayer } {
        return {
            status: this.run.status,
            layer: this.run.currentLayer
        }
    }

    /**
     * Check if can transition to status
     */
    canTransitionTo(status: OrchestrationStatus): boolean {
        return canTransitionTo(this.run.status, status)
    }

    /**
     * Check if can proceed to next layer
     */
    canProceed(): GuardResult {
        return canProceedToNextLayer(this.run)
    }

    /**
     * Get next layer
     */
    getNextLayer(): OrchestrationLayer | null {
        return getNextLayer(this.run.currentLayer)
    }

    /**
     * Check if run is in terminal state
     */
    isTerminal(): boolean {
        return isTerminalStatus(this.run.status)
    }

    /**
     * Get completion percentage (0-100)
     */
    getProgress(): number {
        const layerIndex = getLayerIndex(this.run.currentLayer)
        const totalLayers = LAYER_ORDER_ARRAY.length

        if (this.run.status === 'deployed') return 100
        if (isTerminalStatus(this.run.status)) return layerIndex * (100 / totalLayers)

        return Math.round((layerIndex / totalLayers) * 100)
    }

    /**
     * Get human-readable status description
     */
    getStatusDescription(): string {
        const descriptions: Record<OrchestrationStatus, string> = {
            'pending': 'Orchestration run is pending, waiting to start',
            'running': `Currently executing ${this.run.currentLayer}`,
            'awaiting_approval': `Awaiting approval (${this.run.receivedApprovals}/${this.run.requiredApprovals})`,
            'approved': 'Approved and ready for deployment',
            'rejected': 'Change was rejected',
            'deploying': 'Deployment in progress',
            'deployed': 'Successfully deployed',
            'rolled_back': 'Changes were rolled back',
            'failed': `Failed: ${this.run.errorMessage || 'Unknown error'}`,
            'cancelled': 'Run was cancelled'
        }
        return descriptions[this.run.status] || 'Unknown status'
    }
}
