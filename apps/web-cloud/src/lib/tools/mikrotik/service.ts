import { API_BASE, apiJsonData } from '$lib/api/httpClient'

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

export type MikroTikDiffOutput = {
    summary: { added: number; removed: number; unchanged: number }
    lines: Array<{ kind: 'same' | 'add' | 'remove'; line: string }>
    safeApplyNotes: string[]
}

export type MikroTikPushOutput =
    | { status: 'dry_run'; dryRun: true; logs: Array<{ timestamp: string; level: string; message: string }>; rollbackSuggestion?: string }
    | { status: 'blocked' | 'not_implemented'; dryRun: boolean; logs: Array<{ timestamp: string; level: string; message: string }>; rollbackSuggestion?: string }

const TOOLS_BASE = `${API_BASE}/v1/tools`

export async function generateMikrotikFullConfig(intent: MikroTikFullConfigIntent): Promise<MikroTikFullConfigOutput> {
    return apiJsonData<MikroTikFullConfigOutput>(`${TOOLS_BASE}/generate_mikrotik_full_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent)
    })
}

export async function validateMikrotikConfig(input: { config: string; routerOsVersion: string }): Promise<MikroTikValidationReport> {
    return apiJsonData<MikroTikValidationReport>(`${TOOLS_BASE}/validate_mikrotik_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    })
}

export async function diffMikrotikRunningConfig(input: { runningConfig: string; desiredConfig: string }): Promise<MikroTikDiffOutput> {
    return apiJsonData<MikroTikDiffOutput>(`${TOOLS_BASE}/diff_mikrotik_running_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    })
}

export async function pushMikrotikConfigSsh(input: {
    target: { host: string; port?: number; user: string }
    auth: { type: 'password' | 'key'; password?: string; privateKey?: string; privateKeyPath?: string; passphrase?: string }
    config: string
    dryRun?: boolean
    environment?: MikroTikEnvironment
    ticketId?: string
    timeoutMs?: number
}): Promise<MikroTikPushOutput> {
    return apiJsonData<MikroTikPushOutput>(`${TOOLS_BASE}/push_mikrotik_config_ssh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    })
}

