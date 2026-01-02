/**
 * NetOps Types - Local type definitions for the module
 * These mirror the contracts but allow the module to work standalone
 */

// ====================
// ENUMS
// ====================

export type DeviceVendor = 'cisco' | 'mikrotik' | 'fortigate' | 'generic'
export type DeviceRole = 'core' | 'distribution' | 'access' | 'edge' | 'firewall' | 'wan' | 'datacenter' | 'branch'
export type DeviceStatus = 'active' | 'maintenance' | 'decommissioned' | 'unreachable'
export type ConfigType = 'running' | 'startup' | 'candidate' | 'generated' | 'rollback'
export type ChangeRequestStatus = 'draft' | 'planned' | 'candidate_ready' | 'verified' | 'waiting_approval' | 'approved' | 'rejected' | 'deploying' | 'deployed' | 'verified_post' | 'failed' | 'rolled_back' | 'closed'
export type LintSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ====================
// ENTITIES
// ====================

export interface NetDevice {
    id: string
    name: string
    hostname: string
    mgmtIp: string
    vendor: DeviceVendor
    model?: string | null
    osVersion?: string | null
    serialNumber?: string | null
    role?: DeviceRole | null
    location?: string | null
    site?: string | null
    status: DeviceStatus
    tags: string[]
    notes?: string | null
    lastSeenAt?: Date | null
    createdAt: Date
    updatedAt: Date
    createdBy?: string | null
}

export interface NetConfigVersion {
    id: string
    deviceId: string
    configType: ConfigType
    rawConfig?: string
    configHash?: string
    normalizedConfig?: NormalizedConfig | null
    parserVersion?: string | null
    parseErrors?: ParseError[] | null
    source: string
    collectedBy?: string | null
    collectedAt: Date
    checksum?: string | null
    fileSizeBytes?: number
    lineCount?: number
    parentVersionId?: string
}

export interface NetRulepack {
    id: string
    name: string
    version: string
    description?: string | null
    vendorScope: string[]
    rules: LintRule[]
    ruleCount: number
    isActive: boolean
    isBuiltin?: boolean
    createdBy?: string | null
    createdAt: Date
    updatedAt?: Date
    activatedAt?: Date
}

export interface NetLintRun {
    id: string
    targetType: string
    targetId: string
    rulepackId: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    findings: LintFinding[]
    summary?: LintSummary | null
    rulesEvaluated: number
    rulesPassed: number
    rulesFailed: number
    rulesSkipped: number
    durationMs?: number | null
    startedAt?: Date
    completedAt?: Date
    triggeredBy?: string | null
    createdAt: Date
}

export interface NetChangeRequest {
    id: string
    title: string
    description?: string | null
    changeType?: string | null
    intentType?: string | null
    intentParams?: Record<string, unknown>
    deviceScope: string[]
    scheduledAt?: Date | null
    riskLevel: RiskLevel
    status: ChangeRequestStatus
    requiredApprovals?: number
    createdBy: string
    createdAt: Date
    updatedAt: Date
}

export interface NetChangeSet {
    id: string
    changeRequestId: string
    deviceId: string
    runningConfig?: string | null
    candidateConfig?: string | null
    diffPreview?: string | null
    generatedBy?: string | null
    lintRunId?: string | null
    lintStatus?: string | null
    createdAt: Date
}

export interface NetApproval {
    id: string
    changeRequestId: string
    approverId: string
    decision: 'approved' | 'rejected' | 'waived'
    comments?: string | null
    waivedFindings?: string[] | null
    createdAt: Date
}

export interface NetAuditEvent {
    id: string
    correlationId?: string | null
    eventType: string
    actorId?: string | null
    actorRole?: string | null
    resourceType: string
    resourceId: string
    action: string
    details?: Record<string, unknown> | null
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
}

// ====================
// NORMALIZED CONFIG
// ====================

export interface NormalizedConfig {
    schemaVersion: 'v1'
    device: {
        hostname: string
        vendor: DeviceVendor
        model?: string
        osVersion?: string
    }
    interfaces: NormalizedInterface[]
    vlans: NormalizedVlan[]
    routing: {
        static: StaticRoute[]
        ospf: OspfConfig[]
        bgp: BgpConfig[]
    }
    security: {
        acls: AccessControlList[]
        users: ConfigUser[]
        aaa?: AaaConfig | null
    }
    mgmt: {
        ssh?: SshConfig | null
        snmp?: SnmpConfig | null
        ntp?: NtpConfig | null
        logging?: LoggingConfig | null
    }
}

export interface NormalizedInterface {
    name: string
    description?: string
    status: 'up' | 'down' | 'admin-down'
    mode: 'access' | 'trunk' | 'routed' | 'hybrid'
    vlan?: number
    trunkAllowedVlans?: number[]
    ipv4?: string
    ipv4Mask?: string
    ipv6?: string
}

export interface NormalizedVlan {
    id: number
    name?: string
    description?: string
}

export interface StaticRoute {
    network: string
    nextHop: string
    interface?: string
    metric?: number
}

export interface OspfConfig {
    processId: number
    routerId?: string
    networks: string[]
    areas?: Array<{ id: string; type?: string }>
}

export interface BgpConfig {
    asn: number
    routerId?: string
    neighbors: BgpNeighbor[]
}

export interface BgpNeighbor {
    address: string
    remoteAs: number
    description?: string
}

export interface AccessControlList {
    name: string
    type?: 'standard' | 'extended'
    entries: AclEntry[]
}

export interface AclEntry {
    seq?: number
    action: 'permit' | 'deny'
    protocol?: string
    src?: string
    dst?: string
    srcPort?: number
    dstPort?: number
    log?: boolean
}

export interface ConfigUser {
    name: string
    privilege?: number
    role?: string
    sshKey?: boolean
}

export interface AaaConfig {
    tacacs?: { servers: string[]; key?: string }
    radius?: { servers: string[]; key?: string }
}

export interface SshConfig {
    enabled: boolean
    version?: number
    timeout?: number
    port?: number
}

export interface SnmpConfig {
    enabled: boolean
    version?: string
    communities?: string[]
    contact?: string
    location?: string
}

export interface NtpConfig {
    servers: string[]
    timezone?: string
}

export interface LoggingConfig {
    servers: string[]
    level?: string
    facility?: string
}

// ====================
// LINT
// ====================

export interface LintRule {
    id: string
    name: string
    description?: string
    severity: LintSeverity
    enabled: boolean
    type: 'match' | 'custom'
    path?: string
    condition?: {
        operator: string
        value?: unknown
    }
    customPredicate?: string
}

export interface LintFinding {
    ruleId: string
    severity: LintSeverity
    message: string
    path?: string
    value?: unknown
}

export interface LintSummary {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
    passed: boolean
}

export interface ParseError {
    line?: number
    message: string
    severity: 'error' | 'warning'
}

// ====================
// FILTERS
// ====================

export interface DeviceFilters {
    vendor?: DeviceVendor
    status?: DeviceStatus
    role?: DeviceRole
    site?: string
    tags?: string[]
    search?: string
    limit?: number
    offset?: number
}

export interface ChangeFilters {
    status?: ChangeRequestStatus
    riskLevel?: RiskLevel
    createdBy?: string
    assignedTo?: string
    deviceId?: string
    limit?: number
    offset?: number
}
