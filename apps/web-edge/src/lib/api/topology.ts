import { API_BASE, apiJson, apiJsonData } from './httpClient'
import { getAssetHeaders } from './assets'

export type TopologyNode = {
    id: string
    kind: 'router' | 'switch' | 'server' | 'ap' | 'printer' | 'unknown'
    hostname?: string | null
    mgmtIp?: string | null
    vendor?: string | null
    model?: string | null
    lastSeenAt?: string
}

export type TopologyEdge = {
    id: string
    a: { nodeId: string; port: string }
    b: { nodeId: string; port?: string | null }
    confidence: number
    evidenceCount: number
    lastSeenAt?: string
}

export type TopologyGraph = {
    nodes: TopologyNode[]
    edges: TopologyEdge[]
}

export type TopologyEvidence = {
    source: string
    detail: Record<string, unknown>
    capturedAt: string
}

export async function getTopologyGraph(params: { site?: string; zone?: string; since?: string } = {}): Promise<TopologyGraph> {
    const query = new URLSearchParams()
    if (params.site) query.set('site', params.site)
    if (params.zone) query.set('zone', params.zone)
    if (params.since) query.set('since', params.since)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJsonData<TopologyGraph>(`${API_BASE}/v1/topology/graph${suffix}`, {
        headers: getAssetHeaders()
    })
}

export async function triggerTopologyDiscovery(payload: {
    seedDevices: string[]
    includeNmap?: boolean
    nmapTargets?: string[]
    snmpTargets?: string[]
    mode?: 'fast' | 'full'
    site?: string
    zone?: string
}): Promise<{ summary: { nodesUpserted: number; portsUpserted: number; edgesUpserted: number }; warnings?: string[] }> {
    return apiJson<{ summary: { nodesUpserted: number; portsUpserted: number; edgesUpserted: number }; warnings?: string[] }>(
        `${API_BASE}/v1/topology/discover`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
            body: JSON.stringify(payload)
        }
    )
}

export async function getTopologyNode(id: string): Promise<any> {
    return apiJsonData<any>(`${API_BASE}/v1/topology/node/${id}`, {
        headers: getAssetHeaders()
    })
}

export async function getTopologyEdge(id: string): Promise<{ id: string; evidence: TopologyEvidence[]; confidence: number; lastSeenAt?: string }> {
    return apiJsonData<{ id: string; evidence: TopologyEvidence[]; confidence: number; lastSeenAt?: string }>(
        `${API_BASE}/v1/topology/edge/${id}`,
        { headers: getAssetHeaders() }
    )
}

export async function getTopologyAudit(params: { from?: string; to?: string; actor?: string } = {}): Promise<any> {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.actor) query.set('actor', params.actor)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJsonData<any>(`${API_BASE}/v1/topology/audit${suffix}`, {
        headers: getAssetHeaders()
    })
}
