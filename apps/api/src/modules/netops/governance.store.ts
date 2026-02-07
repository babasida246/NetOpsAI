type EnvironmentTier = 'dev' | 'staging' | 'prod' | 'all'

export type Policy = {
    id: string
    name: string
    environment: EnvironmentTier
    allowList: string[]
    denyList: string[]
    dangerousList: string[]
    requireApproval: boolean
    createdAt: string
    updatedAt: string
}

export type ApprovalRequest = {
    id: string
    deviceId: string
    ticketId: string
    requestedBy: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
    resolvedAt?: string
    approver?: string
}

export type MaintenanceWindow = {
    id: string
    title: string
    environment: EnvironmentTier
    startAt: string
    endAt: string
    createdBy: string
    createdAt: string
}

export type JitGrant = {
    id: string
    userId: string
    role: string
    expiresAt: string
    reason: string
    createdBy: string
    createdAt: string
}

export type BreakGlassEvent = {
    id: string
    userId: string
    reason: string
    createdAt: string
}

export type EvidenceCase = {
    id: string
    deviceId: string
    ticketId: string
    summary: string
    snapshotIds: string[]
    createdBy: string
    createdAt: string
}

type GovernanceStore = {
    policies: Policy[]
    approvals: ApprovalRequest[]
    maintenanceWindows: MaintenanceWindow[]
    jitGrants: JitGrant[]
    breakGlassEvents: BreakGlassEvent[]
    evidenceCases: EvidenceCase[]
}

const store: GovernanceStore = {
    policies: [],
    approvals: [],
    maintenanceWindows: [],
    jitGrants: [],
    breakGlassEvents: [],
    evidenceCases: []
}

const DEFAULT_POLICY: Policy = {
    id: 'policy-default',
    name: 'Default Policy',
    environment: 'all',
    allowList: [],
    denyList: ['reload', 'erase', 'reset-configuration', 'format', 'delete'],
    dangerousList: ['reload', 'erase', 'reset-configuration', 'write erase'],
    requireApproval: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}

if (store.policies.length === 0) {
    store.policies.push(DEFAULT_POLICY)
}

function nowIso(): string {
    return new Date().toISOString()
}

function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`
    }
    return `${prefix}_${Math.random().toString(36).slice(2)}`
}

export function listPolicies(): Policy[] {
    return [...store.policies]
}

export function createPolicy(input: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Policy {
    const policy: Policy = {
        ...input,
        id: createId('policy'),
        createdAt: nowIso(),
        updatedAt: nowIso()
    }
    store.policies.unshift(policy)
    return policy
}

export function updatePolicy(id: string, updates: Partial<Omit<Policy, 'id' | 'createdAt'>>): Policy | null {
    const index = store.policies.findIndex((policy) => policy.id === id)
    if (index === -1) return null
    const updated: Policy = {
        ...store.policies[index],
        ...updates,
        updatedAt: nowIso()
    }
    store.policies[index] = updated
    return updated
}

export function resolvePolicyForEnvironment(environment: EnvironmentTier): Policy {
    const matched = store.policies.find((policy) => policy.environment === environment)
    if (matched) return matched
    const anyPolicy = store.policies.find((policy) => policy.environment === 'all')
    return anyPolicy ?? DEFAULT_POLICY
}

export function listApprovals(deviceId?: string): ApprovalRequest[] {
    if (!deviceId) return [...store.approvals]
    return store.approvals.filter((approval) => approval.deviceId === deviceId)
}

export function requestApproval(input: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>): ApprovalRequest {
    const approval: ApprovalRequest = {
        ...input,
        id: createId('approval'),
        status: 'pending',
        createdAt: nowIso()
    }
    store.approvals.unshift(approval)
    return approval
}

export function resolveApproval(id: string, status: 'approved' | 'rejected', approver: string): ApprovalRequest | null {
    const approval = store.approvals.find((item) => item.id === id)
    if (!approval) return null
    approval.status = status
    approval.approver = approver
    approval.resolvedAt = nowIso()
    return approval
}

export function hasApproved(deviceId: string, ticketId: string): boolean {
    return store.approvals.some(
        (approval) =>
            approval.deviceId === deviceId &&
            approval.ticketId === ticketId &&
            approval.status === 'approved'
    )
}

export function listMaintenanceWindows(): MaintenanceWindow[] {
    return [...store.maintenanceWindows]
}

export function createMaintenanceWindow(input: Omit<MaintenanceWindow, 'id' | 'createdAt'>): MaintenanceWindow {
    const window: MaintenanceWindow = {
        ...input,
        id: createId('mw'),
        createdAt: nowIso()
    }
    store.maintenanceWindows.unshift(window)
    return window
}

export function listJitGrants(): JitGrant[] {
    return [...store.jitGrants]
}

export function createJitGrant(input: Omit<JitGrant, 'id' | 'createdAt'>): JitGrant {
    const grant: JitGrant = {
        ...input,
        id: createId('jit'),
        createdAt: nowIso()
    }
    store.jitGrants.unshift(grant)
    return grant
}

export function listBreakGlassEvents(): BreakGlassEvent[] {
    return [...store.breakGlassEvents]
}

export function createBreakGlassEvent(input: Omit<BreakGlassEvent, 'id' | 'createdAt'>): BreakGlassEvent {
    const event: BreakGlassEvent = {
        ...input,
        id: createId('breakglass'),
        createdAt: nowIso()
    }
    store.breakGlassEvents.unshift(event)
    return event
}

export function listEvidenceCases(): EvidenceCase[] {
    return [...store.evidenceCases]
}

export function createEvidenceCase(input: Omit<EvidenceCase, 'id' | 'createdAt'>): EvidenceCase {
    const evidence: EvidenceCase = {
        ...input,
        id: createId('evidence'),
        createdAt: nowIso()
    }
    store.evidenceCases.unshift(evidence)
    return evidence
}
