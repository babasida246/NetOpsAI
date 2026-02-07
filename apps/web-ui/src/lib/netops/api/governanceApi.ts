import { API_BASE, apiJsonData } from '$lib/api/httpClient'

export type GovernancePolicy = {
    id: string
    name: string
    environment: 'dev' | 'staging' | 'prod' | 'all'
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
    environment: 'dev' | 'staging' | 'prod' | 'all'
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

export type Baseline = {
    id: string
    deviceId: string
    name: string
    config: string
    createdAt: string
    createdBy: string
}

export type DriftEvent = {
    id: string
    deviceId: string
    baselineId: string
    detectedAt: string
    severity: 'info' | 'warn' | 'critical'
    diff: string
}

const GOV_BASE = `${API_BASE}/netops/governance`
const CONFIG_BASE = `${API_BASE}/netops/config`

export const governanceApi = {
    listPolicies: async (): Promise<GovernancePolicy[]> => apiJsonData(`${GOV_BASE}/policies`),
    createPolicy: async (input: Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<GovernancePolicy> =>
        apiJsonData(`${GOV_BASE}/policies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        }),
    updatePolicy: async (id: string, updates: Partial<GovernancePolicy>): Promise<GovernancePolicy> =>
        apiJsonData(`${GOV_BASE}/policies/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        }),
    listApprovals: async (): Promise<ApprovalRequest[]> => apiJsonData(`${GOV_BASE}/approvals`),
    resolveApproval: async (id: string, status: 'approved' | 'rejected'): Promise<ApprovalRequest> =>
        apiJsonData(`${GOV_BASE}/approvals/${id}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        }),
    listMaintenanceWindows: async (): Promise<MaintenanceWindow[]> => apiJsonData(`${GOV_BASE}/maintenance-windows`),
    createMaintenanceWindow: async (input: Omit<MaintenanceWindow, 'id' | 'createdAt' | 'createdBy'>): Promise<MaintenanceWindow> =>
        apiJsonData(`${GOV_BASE}/maintenance-windows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        }),
    listJitGrants: async (): Promise<JitGrant[]> => apiJsonData(`${GOV_BASE}/jit-grants`),
    createJitGrant: async (input: Omit<JitGrant, 'id' | 'createdAt' | 'createdBy'>): Promise<JitGrant> =>
        apiJsonData(`${GOV_BASE}/jit-grants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        }),
    listBreakGlassEvents: async (): Promise<BreakGlassEvent[]> => apiJsonData(`${GOV_BASE}/break-glass`),
    createBreakGlassEvent: async (reason: string): Promise<BreakGlassEvent> =>
        apiJsonData(`${GOV_BASE}/break-glass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        }),
    listEvidenceCases: async (): Promise<EvidenceCase[]> => apiJsonData(`${GOV_BASE}/evidence`),
    createEvidenceCase: async (input: Omit<EvidenceCase, 'id' | 'createdAt' | 'createdBy'>): Promise<EvidenceCase> =>
        apiJsonData(`${GOV_BASE}/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        }),
    listBaselines: async (): Promise<Baseline[]> => apiJsonData(`${CONFIG_BASE}/baselines`),
    createBaseline: async (input: Omit<Baseline, 'id' | 'createdAt' | 'createdBy'>): Promise<Baseline> =>
        apiJsonData(`${CONFIG_BASE}/baselines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        }),
    listDrifts: async (deviceId?: string): Promise<DriftEvent[]> =>
        apiJsonData(`${CONFIG_BASE}/drift${deviceId ? `?deviceId=${deviceId}` : ''}`)
}
