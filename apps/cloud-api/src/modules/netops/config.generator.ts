type Vendor = 'mikrotik' | 'cisco'

type CanonicalConfig = {
    hostname?: string
    interfaces?: Array<{
        name: string
        role: 'uplink' | 'access'
        ipAddress?: string
        subnetMask?: string
        vlanId?: number
        description?: string
        enabled?: boolean
    }>
    vlans?: Array<{
        id: number
        name?: string
        subnet?: string
        gateway?: string
    }>
    routing?: {
        staticRoutes?: Array<{ destination: string; netmask?: string; nextHop: string }>
    }
    services?: {
        ssh?: { enabled: boolean; version: 1 | 2; allowPassword: boolean }
        ntpServers?: string[]
        dnsServers?: string[]
        syslogServers?: string[]
    }
    firewall?: {
        enabled?: boolean
        allowMgmtFrom?: string
    }
    metadata?: {
        environment?: 'dev' | 'staging' | 'prod'
    }
}

type RenderSection = {
    name: string
    commands: string[]
}

export type RenderResult = {
    commands: string[]
    sections: RenderSection[]
    verifyCommands: string[]
    rollbackCommands: string[]
}

export type LintFinding = {
    id: string
    severity: 'info' | 'warn' | 'error'
    field: string
    message: string
    suggestion?: string
}

const normalizeMask = (value?: string) => value?.trim() || ''

const maskToPrefix = (mask?: string): string => {
    if (!mask) return ''
    if (mask.includes('/')) return mask.split('/')[1] || ''
    const parts = mask.split('.').map((part) => Number(part))
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return ''
    const binary = parts.map((part) => part.toString(2).padStart(8, '0')).join('')
    return String(binary.split('1').length - 1)
}

const maskFromCidr = (cidr?: string): string => {
    if (!cidr) return ''
    if (!cidr.includes('/')) return ''
    const bits = Number(cidr.split('/')[1])
    if (Number.isNaN(bits)) return ''
    const mask = bits === 0 ? 0 : 0xffffffff << (32 - bits)
    return [
        (mask >>> 24) & 255,
        (mask >>> 16) & 255,
        (mask >>> 8) & 255,
        mask & 255
    ].join('.')
}

const pickMask = (subnet?: string, explicit?: string) => explicit || maskFromCidr(subnet)

export function renderConfig(config: CanonicalConfig, vendor: Vendor): RenderResult {
    return vendor === 'mikrotik' ? renderMikrotik(config) : renderCisco(config)
}

export function lintConfig(config: CanonicalConfig, vendor: Vendor): LintFinding[] {
    const findings: LintFinding[] = []
    const ssh = config.services?.ssh
    if (vendor === 'cisco') {
        if (!ssh?.enabled) {
            findings.push({
                id: 'ssh-required',
                severity: 'error',
                field: 'services.ssh.enabled',
                message: 'SSH must be enabled on Cisco IOS.',
                suggestion: 'Enable SSH and enforce v2.'
            })
        }
        if (ssh?.version !== 2) {
            findings.push({
                id: 'ssh-v2',
                severity: 'warn',
                field: 'services.ssh.version',
                message: 'Cisco requires SSH v2.',
                suggestion: 'Set SSH version to 2.'
            })
        }
    }
    if (vendor === 'mikrotik' && ssh && !ssh.enabled) {
        findings.push({
            id: 'ssh-enabled',
            severity: 'warn',
            field: 'services.ssh.enabled',
            message: 'SSH service should be enabled on RouterOS.',
            suggestion: 'Enable SSH or ensure remote access policy.'
        })
    }
    return findings
}

function renderMikrotik(config: CanonicalConfig): RenderResult {
    const base: string[] = []
    const vlanCommands: string[] = []
    const routing: string[] = []
    const firewall: string[] = []
    const services: string[] = []
    const verify: string[] = []
    const rollback: string[] = []

    if (config.hostname) {
        base.push(`/system identity set name=${config.hostname}`)
    }

    if (config.vlans && config.vlans.length > 0) {
        base.push('/interface bridge add name=br0 vlan-filtering=yes')
        rollback.push('/interface bridge remove [find name=br0]')
    }

    for (const vlan of config.vlans ?? []) {
        vlanCommands.push(`/interface vlan add name=vlan${vlan.id} vlan-id=${vlan.id} interface=br0`)
        if (vlan.gateway) {
            const prefix = maskToPrefix(vlan.subnet) || '24'
            vlanCommands.push(`/ip address add address=${vlan.gateway}/${prefix} interface=vlan${vlan.id}`)
            rollback.push(`/ip address remove [find interface=vlan${vlan.id}]`)
        }
        rollback.push(`/interface vlan remove [find name=vlan${vlan.id}]`)
    }

    for (const iface of config.interfaces ?? []) {
        if (iface.ipAddress) {
            const prefix = maskToPrefix(iface.subnetMask) || '24'
            base.push(`/ip address add address=${iface.ipAddress}/${prefix} interface=${iface.name}`)
            rollback.push(`/ip address remove [find interface=${iface.name}]`)
        }
    }

    for (const route of config.routing?.staticRoutes ?? []) {
        const dst = route.netmask ? `${route.destination}/${route.netmask}` : route.destination
        routing.push(`/ip route add dst-address=${dst} gateway=${route.nextHop}`)
        rollback.push(`/ip route remove [find dst-address~"${route.destination}"]`)
    }

    if (config.services?.ssh?.enabled) {
        services.push('/ip service set ssh disabled=no')
    } else {
        services.push('/ip service set ssh disabled=yes')
    }
    services.push('/ip service set telnet disabled=yes')

    if (config.firewall?.enabled) {
        firewall.push('/ip firewall filter add chain=input connection-state=established,related action=accept')
        firewall.push('/ip firewall filter add chain=input connection-state=invalid action=drop')
        firewall.push('/ip firewall filter add chain=input in-interface=ether1 action=accept')
        firewall.push('/ip firewall filter add chain=input action=drop')
    }

    if (config.services?.ntpServers && config.services.ntpServers.length > 0) {
        services.push(`/system ntp client set enabled=yes primary-ntp=${config.services.ntpServers[0]}`)
    }

    if (config.services?.syslogServers && config.services.syslogServers.length > 0) {
        services.push(`/system logging action set remote remote=${config.services.syslogServers[0]}`)
        services.push('/system logging add topics=info action=remote')
    }

    verify.push('/interface vlan print')
    verify.push('/ip address print')
    verify.push('/ip route print')

    const sections: RenderSection[] = [
        { name: 'base', commands: base },
        { name: 'vlan', commands: vlanCommands },
        { name: 'routing', commands: routing },
        { name: 'firewall', commands: firewall },
        { name: 'services', commands: services }
    ]

    const commands = sections.flatMap((section) => section.commands)

    return {
        commands,
        sections,
        verifyCommands: verify,
        rollbackCommands: rollback
    }
}

function renderCisco(config: CanonicalConfig): RenderResult {
    const base: string[] = []
    const vlanCommands: string[] = []
    const interfaceCommands: string[] = []
    const routing: string[] = []
    const services: string[] = []
    const firewall: string[] = []
    const verify: string[] = []
    const rollback: string[] = []

    if (config.hostname) {
        base.push(`hostname ${config.hostname}`)
    }

    if (config.services?.ssh?.enabled) {
        services.push('ip ssh version 2')
        services.push('line vty 0 4')
        services.push(' transport input ssh')
        rollback.push('line vty 0 4')
        rollback.push(' transport input telnet')
    }

    services.push('no ip http server')

    if (config.services?.syslogServers && config.services.syslogServers.length > 0) {
        for (const server of config.services.syslogServers) {
            services.push(`logging host ${server}`)
        }
        services.push('logging trap informational')
    }

    for (const vlan of config.vlans ?? []) {
        vlanCommands.push(`vlan ${vlan.id}`)
        vlanCommands.push(` name ${vlan.name || `VLAN${vlan.id}`}`)
        if (vlan.gateway) {
            interfaceCommands.push(`interface Vlan${vlan.id}`)
            const mask = pickMask(vlan.subnet)
            interfaceCommands.push(` ip address ${vlan.gateway} ${mask || '255.255.255.0'}`)
            interfaceCommands.push(' no shutdown')
            rollback.push(`no interface Vlan${vlan.id}`)
        }
        rollback.push(`no vlan ${vlan.id}`)
    }

    for (const iface of config.interfaces ?? []) {
        interfaceCommands.push(`interface ${iface.name}`)
        if (iface.description) interfaceCommands.push(` description ${iface.description}`)
        if (iface.role === 'access' && iface.vlanId) {
            interfaceCommands.push(' switchport mode access')
            interfaceCommands.push(` switchport access vlan ${iface.vlanId}`)
        }
        if (iface.ipAddress) {
            const mask = normalizeMask(iface.subnetMask) || '255.255.255.0'
            interfaceCommands.push(` ip address ${iface.ipAddress} ${mask}`)
        }
        interfaceCommands.push(iface.enabled === false ? ' shutdown' : ' no shutdown')
    }

    for (const route of config.routing?.staticRoutes ?? []) {
        const mask = route.netmask || '255.255.255.0'
        routing.push(`ip route ${route.destination} ${mask} ${route.nextHop}`)
        rollback.push(`no ip route ${route.destination} ${mask} ${route.nextHop}`)
    }

    if (config.firewall?.enabled) {
        firewall.push('ip access-list extended MGMT-IN')
        firewall.push(' permit ip any any')
    }

    verify.push('show vlan brief')
    verify.push('show ip interface brief')
    verify.push('show ip route')

    const sections: RenderSection[] = [
        { name: 'base', commands: base },
        { name: 'vlan', commands: vlanCommands },
        { name: 'interfaces', commands: interfaceCommands },
        { name: 'routing', commands: routing },
        { name: 'services', commands: services },
        { name: 'firewall', commands: firewall }
    ]

    const commands = sections.flatMap((section) => section.commands)

    return {
        commands,
        sections,
        verifyCommands: verify,
        rollbackCommands: rollback
    }
}
