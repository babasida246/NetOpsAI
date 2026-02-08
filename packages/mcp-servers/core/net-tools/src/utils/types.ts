export type EvidenceSource = 'LLDP' | 'BRIDGE_FDB' | 'BRIDGE_HOST' | 'MNDP' | 'ARP' | 'NMAP'

export type Evidence = {
    source: EvidenceSource
    detail: Record<string, any>
    capturedAt: string
}
