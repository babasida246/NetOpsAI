import type { ToolContext } from '@tools/registry'
import type { Evidence } from './utils/types.js'

export type TopologyNodeKind = 'router' | 'switch' | 'server' | 'ap' | 'printer' | 'unknown'

export type TopologyNodeDraft = {
    key?: string
    id?: string
    kind: TopologyNodeKind
    hostname?: string | null
    mgmtIp?: string | null
    vendor?: string | null
    model?: string | null
    site?: string | null
    zone?: string | null
    firstSeenAt?: string
    lastSeenAt?: string
    macs?: string[]
}

export type TopologyPortDraft = {
    id?: string
    nodeId?: string
    nodeKey?: string
    ifName: string
    ifIndex?: number | null
    mac?: string | null
    speed?: number | null
    extra?: Record<string, any> | null
}

export type TopologyEdgeDraft = {
    id?: string
    aNodeId?: string
    aNodeKey?: string
    aPort: string
    bNodeId?: string
    bNodeKey?: string
    bPort?: string | null
    evidence: Evidence[]
    confidence: number
    lastSeenAt?: string
}

export type TopologyGraphDraft = {
    nodes: TopologyNodeDraft[]
    ports: TopologyPortDraft[]
    edges: TopologyEdgeDraft[]
}

export type TopologyPersistSummary = {
    nodesUpserted: number
    portsUpserted: number
    edgesUpserted: number
}

export type TopologyStore = {
    upsertNodes(nodes: TopologyNodeDraft[]): Promise<TopologyNodeDraft[]>
    upsertPorts(ports: TopologyPortDraft[]): Promise<TopologyPortDraft[]>
    upsertEdges(edges: TopologyEdgeDraft[]): Promise<TopologyEdgeDraft[]>
}

export type DeviceInfo = {
    deviceId: string
    hostname?: string | null
    mgmtIp?: string | null
    vendor?: string | null
    model?: string | null
    site?: string | null
    zone?: string | null
    role?: string | null
    snmpCredentialRef?: string | null
}

export type DeviceLookup = (deviceId: string) => Promise<DeviceInfo | null>

export type AuditEntry = {
    toolName: string
    userId?: string
    target?: string
    args: Record<string, any>
    durationMs: number
    status: 'success' | 'error'
    errorMessage?: string
}

export type AuditSink = (entry: AuditEntry) => Promise<void>

export type NettoolsDependencies = {
    deviceLookup: DeviceLookup
    topologyStore: TopologyStore
    audit?: AuditSink
    logger?: ToolContext['logger']
}

export type ToolAuditContext = {
    audit?: AuditSink
    userId?: string
}
