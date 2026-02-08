import type { CanonicalConfig, EnvironmentTier, Vendor } from './types'

export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type ApprovalRecord = {
    id: string
    deviceId: string
    vendor: Vendor
    environment: EnvironmentTier
    status: ApprovalStatus
    reason?: string
    requestedBy?: string
    approvedBy?: string
    requestedAt: string
    decidedAt?: string
    configHash: string
}

const STORAGE_KEY = 'netops.cli.approvals.v1'

const readStorage = <T>(fallback: T): T => {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    try {
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

const writeStorage = (records: ApprovalRecord[]) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `appr_${Math.random().toString(36).slice(2, 9)}`
}

export function hashConfig(config: CanonicalConfig, vendor: Vendor): string {
    const raw = JSON.stringify({ vendor, config })
    let hash = 5381
    for (let i = 0; i < raw.length; i++) {
        hash = (hash * 33) ^ raw.charCodeAt(i)
    }
    return (hash >>> 0).toString(16)
}

export function loadApprovals(): ApprovalRecord[] {
    return readStorage<ApprovalRecord[]>([])
}

export function saveApprovals(records: ApprovalRecord[]): void {
    writeStorage(records)
}

export function createApprovalRequest(input: {
    deviceId: string
    vendor: Vendor
    environment: EnvironmentTier
    configHash: string
    requestedBy?: string
    reason?: string
}): ApprovalRecord {
    const record: ApprovalRecord = {
        id: createId(),
        deviceId: input.deviceId,
        vendor: input.vendor,
        environment: input.environment,
        status: 'pending',
        reason: input.reason,
        requestedBy: input.requestedBy,
        requestedAt: new Date().toISOString(),
        configHash: input.configHash
    }
    const records = loadApprovals()
    const next = [record, ...records]
    saveApprovals(next)
    return record
}

export function decideApproval(
    id: string,
    status: 'approved' | 'rejected',
    approvedBy?: string,
    reason?: string
): ApprovalRecord | null {
    const records = loadApprovals()
    let updated: ApprovalRecord | null = null
    const next = records.map((record) => {
        if (record.id !== id) return record
        updated = {
            ...record,
            status,
            approvedBy,
            reason: reason ?? record.reason,
            decidedAt: new Date().toISOString()
        }
        return updated
    })
    saveApprovals(next)
    return updated
}
