export type Vendor = 'mikrotik' | 'cisco'

export type EnvironmentTier = 'dev' | 'staging' | 'prod'

export type CanonicalInterface = {
    id: string
    name: string
    role: 'uplink' | 'access'
    ipAddress?: string
    subnetMask?: string
    vlanId?: number
    description?: string
    enabled?: boolean
}

export type CanonicalVlan = {
    id: number
    name: string
    subnet?: string
    gateway?: string
}

export type CanonicalRoute = {
    destination: string
    netmask?: string
    nextHop: string
}

export type OspfArea = {
    id: string
    area: string
    networks: string[]
    passiveInterfaces?: string[]
}

export type OspfConfig = {
    enabled: boolean
    routerId?: string
    areas: OspfArea[]
}

export type BgpNeighbor = {
    id: string
    neighbor: string
    remoteAs: number
    description?: string
}

export type BgpNetwork = {
    id: string
    network: string
}

export type BgpConfig = {
    enabled: boolean
    localAs?: number
    routerId?: string
    neighbors: BgpNeighbor[]
    networks: BgpNetwork[]
}

export type RipConfig = {
    enabled: boolean
    version: 1 | 2
    networks: string[]
}

export type CanonicalServices = {
    ssh: {
        enabled: boolean
        version: 1 | 2
        allowPassword: boolean
    }
    ntpServers: string[]
    dnsServers: string[]
    syslogServers: string[]
    snmpCommunity?: string
    snmpVersion?: 'v2c' | 'v3'
    snmpV3Users?: SnmpV3User[]
    netflow: NetflowConfig
    sflow: SflowConfig
}

export type CanonicalFirewall = {
    enabled: boolean
    allowMgmtFrom?: string
    rules: FirewallRule[]
}

export type FirewallRule = {
    id: string
    chain: 'input' | 'output' | 'forward'
    src?: string
    dst?: string
    srcPort?: string
    dstPort?: string
    protocol?: 'tcp' | 'udp' | 'icmp' | 'any'
    action: 'accept' | 'drop' | 'reject' | 'log'
    comment?: string
    order?: number
}

export type NatRule = {
    id: string
    type: 'snat' | 'dnat' | 'masquerade'
    src?: string
    dst?: string
    protocol?: 'tcp' | 'udp' | 'icmp' | 'any'
    srcPort?: string
    dstPort?: string
    toAddress?: string
    toPort?: string
    outInterface?: string
    comment?: string
}

export type IpsecTunnel = {
    id: string
    name: string
    localAddress: string
    remoteAddress: string
    preSharedKey: string
    localSubnet?: string
    remoteSubnet?: string
    ikeVersion?: 'v1' | 'v2'
}

export type WireguardPeer = {
    id: string
    publicKey: string
    allowedIps: string
    endpoint?: string
}

export type WireguardTunnel = {
    id: string
    name: string
    interfaceAddress: string
    listenPort?: number
    privateKey?: string
    peers: WireguardPeer[]
}

export type L2tpServer = {
    id: string
    name: string
    localAddress?: string
    pool?: string
    preSharedKey?: string
}

export type VpnConfig = {
    ipsecTunnels: IpsecTunnel[]
    wireguardTunnels: WireguardTunnel[]
    l2tpServers: L2tpServer[]
}

export type QosQueue = {
    id: string
    name: string
    target: string
    maxLimit: string
    priority?: number
    comment?: string
}

export type QosConfig = {
    queues: QosQueue[]
}

export type SnmpV3User = {
    id: string
    username: string
    authProtocol?: 'md5' | 'sha'
    authPassword?: string
    privProtocol?: 'aes' | 'des'
    privPassword?: string
}

export type NetflowConfig = {
    enabled: boolean
    collector?: string
    port?: number
    version?: 5 | 9 | 10
}

export type SflowConfig = {
    enabled: boolean
    collector?: string
    port?: number
}

export type CanonicalConfig = {
    hostname: string
    interfaces: CanonicalInterface[]
    vlans: CanonicalVlan[]
    routing: {
        staticRoutes: CanonicalRoute[]
        ospf: OspfConfig
        bgp: BgpConfig
        rip: RipConfig
    }
    services: CanonicalServices
    firewall: CanonicalFirewall
    nat: {
        rules: NatRule[]
    }
    vpn: VpnConfig
    qos: QosConfig
    metadata: {
        environment: EnvironmentTier
        deviceId?: string
    }
}

export type RenderSection = {
    name: string
    commands: string[]
}

export type RenderResult = {
    commands: string[]
    sections: RenderSection[]
    verifyCommands: string[]
    rollbackCommands: string[]
}

export type LintSeverity = 'info' | 'warn' | 'error'

export type LintFinding = {
    id: string
    severity: LintSeverity
    field: string
    message: string
    suggestion?: string
}

export type ValidationSeverity = 'info' | 'warn' | 'error'

export type ValidationFinding = {
    id: string
    severity: ValidationSeverity
    field: string
    message: string
    suggestion?: string
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type RiskItem = {
    id: string
    level: RiskLevel
    labelKey: string
    detailKey?: string
}

export type PushResult = {
    status: 'success' | 'failed' | 'partial'
    details: string[]
}

export type ConfigPipelineResult = RenderResult & {
    lintFindings: LintFinding[]
}
