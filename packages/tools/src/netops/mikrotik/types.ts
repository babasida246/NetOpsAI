export type MikroTikRoleTemplate =
    | 'edge-internet'
    | 'core-router'
    | 'distribution-l3'
    | 'access-switch-crs'
    | 'mgmt-only'

export type MikroTikSecurityPreset = 'hospital-secure' | 'standard-secure' | 'lab'

export type MikroTikEnvironment = 'dev' | 'staging' | 'prod'

export type MikroTikInterfacePurpose = 'wan' | 'trunk' | 'access' | 'mgmt'

export type MikroTikIntentDevice = {
    model: string
    routerOsMajor: number
    routerOsVersion: string
    capabilities?: {
        hasSwitchChip?: boolean
        hasWifi?: boolean
        hasSfp?: boolean
        notes?: string
    }
}

export type MikroTikIntentInterface = {
    name: string
    purpose: MikroTikInterfacePurpose
    comment?: string
    accessVlanId?: number
    trunkVlanIds?: number[]
}

export type MikroTikIntentVlanDhcp = {
    enabled: boolean
    poolStart?: string
    poolEnd?: string
    leaseTime?: string
    dnsServers?: string[]
    ntpServers?: string[]
}

export type MikroTikIntentVlan = {
    id: number
    name: string
    subnet: string
    gateway: string
    dhcp?: MikroTikIntentVlanDhcp
    group?: 'MGMT' | 'STAFF' | 'GUEST' | 'SERVER' | 'IOT'
}

export type MikroTikIntentStaticRoute = {
    dst: string
    gateway: string
    distance?: number
    comment?: string
}

export type MikroTikIntentOspf = {
    enabled: boolean
    routerId?: string
    area?: string
    networks?: string[]
    passiveInterfaces?: string[]
}

export type MikroTikIntentRouting = {
    staticRoutes?: MikroTikIntentStaticRoute[]
    ospf?: MikroTikIntentOspf
}

export type MikroTikIntentInternet =
    | {
          wanInterface: string
          publicType: 'dhcp'
          dnsServers?: string[]
          defaultRoute?: boolean
      }
    | {
          wanInterface: string
          publicType: 'static'
          address: string
          gateway: string
          dnsServers?: string[]
          defaultRoute?: boolean
      }
    | {
          wanInterface: string
          publicType: 'pppoe'
          username: string
          password: string
          serviceName?: string
          dnsServers?: string[]
          defaultRoute?: boolean
      }

export type MikroTikIntentManagement = {
    mgmtSubnet: string
    allowedSubnets?: string[]
    ssh?: {
        port?: number
        allowPassword?: boolean
        authorizedKeys?: string[]
    }
    winbox?: {
        enabled?: boolean
        port?: number
    }
    dnsAllowRemoteRequests?: boolean
    timezone?: string
    ntpServers?: string[]
    syslog?: {
        remote?: string
        topics?: string[]
    }
    snmp?: {
        enabled?: boolean
        community?: string
        allowedSubnet?: string
    }
}

export type MikroTikIntentFirewallMatrixRule = {
    from: string
    to: string
    action: 'allow' | 'deny'
    comment?: string
}

export type MikroTikIntentFirewallPolicy = {
    addressLists?: Array<{ name: string; entries: string[] }>
    interVlanMatrix?: MikroTikIntentFirewallMatrixRule[]
    fastTrack?: 'auto' | 'enabled' | 'disabled'
}

export type MikroTikIntentQos = {
    enabled: boolean
    profile: 'his-pacs-priority' | 'voip' | 'guest-limit' | 'custom'
    notes?: string
}

export type MikroTikIntentVpnWireguard = {
    enabled: boolean
    interfaceName?: string
    listenPort?: number
    address?: string
    privateKey?: string
    peers?: Array<{
        name: string
        publicKey: string
        allowedIps: string[]
        endpoint?: string
        persistentKeepalive?: number
    }>
}

export type MikroTikIntentVpn = {
    wireguard?: MikroTikIntentVpnWireguard
}

export type MikroTikFullConfigIntent = {
    device: MikroTikIntentDevice
    role: MikroTikRoleTemplate
    hostname: string
    environment?: MikroTikEnvironment
    labMode?: boolean
    interfaces: MikroTikIntentInterface[]
    vlans?: MikroTikIntentVlan[]
    routing?: MikroTikIntentRouting
    internet?: MikroTikIntentInternet
    securityProfile: { preset: MikroTikSecurityPreset }
    management: MikroTikIntentManagement
    firewallPolicy?: MikroTikIntentFirewallPolicy
    qos?: MikroTikIntentQos
    vpn?: MikroTikIntentVpn
    notes?: string
}

export type ValidationMessage = {
    id: string
    message: string
    field?: string
}

export type MikroTikValidationReport = {
    valid: boolean
    errors: ValidationMessage[]
    warnings: ValidationMessage[]
}

export type MikroTikPlanStep = {
    module: string
    title: string
    affected: number
    notes?: string
}

export type MikroTikRiskReport = {
    level: 'low' | 'medium' | 'high'
    reasons: string[]
}

export type MikroTikFullConfigOutput = {
    config: string
    rollback: string
    validation: MikroTikValidationReport
    plan: MikroTikPlanStep[]
    risk: MikroTikRiskReport
    assumptions: string[]
    versionNotes: string[]
}

