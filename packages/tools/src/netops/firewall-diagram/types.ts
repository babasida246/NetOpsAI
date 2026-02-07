export type FirewallVendor = 'mikrotik' | 'fortigate'

export type FirewallIR = {
    vendor: FirewallVendor
    device?: { name?: string; version?: string; vdom?: string }
    objects: {
        addresses: Array<{ id: string; value?: string; kind?: 'subnet' | 'fqdn' | 'range' | 'unknown' }>
        addressGroups: Array<{ id: string; members: string[] }>
        services: Array<{ id: string; proto?: string; ports?: string }>
        serviceGroups: Array<{ id: string; members: string[] }>
    }
    chains: ChainIR[]
    warnings: string[]
}

export type ChainIR = {
    id: string
    defaultAction?: 'accept' | 'deny' | 'reject' | 'unknown'
    rules: RuleIR[]
}

export type RuleIR = {
    order: number
    id: string
    enabled: boolean
    srcIntf?: string[]
    dstIntf?: string[]
    srcAddr?: string[]
    dstAddr?: string[]
    service?: string[]
    schedule?: string
    state?: string[]
    action: string
    log?: 'none' | 'session' | 'all'
    nat?: { type: 'snat' | 'dnat' | 'masquerade'; toAddr?: string; toPort?: string }
    comment?: string
    raw?: unknown
}

export type FirewallDiagramViews = Array<'pipeline' | 'chain' | 'map'>

export type FirewallToolInput = {
    vendor: FirewallVendor
    source: {
        type: 'file' | 'ssh'
        file?: { text: string; filename?: string }
        ssh?: {
            host: string
            port?: number
            username: string
            password?: string
            privateKey?: string
            privateKeyPath?: string
            passphrase?: string
            vendorHints?: Record<string, unknown>
        }
    }
    views?: FirewallDiagramViews
    options?: {
        includeIR?: boolean
        includeRawBundle?: boolean
        maxRulesPerChain?: number
        maskSensitive?: boolean
    }
}

export type CollectedCommand = { cmd: string; stdout: string; stderr?: string; exitCode?: number }

export type SshCollectedBundle = {
    vendor: FirewallVendor
    collectedAt: string
    commands: CollectedCommand[]
}

