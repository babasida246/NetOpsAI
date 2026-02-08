import type { ModuleDefinition } from './types'
import type { CanonicalConfig, RiskItem, ValidationFinding, Vendor } from '../types'
import { maskToPrefix, normalizeMask, pickMask } from '../utils'

const coreSchema = {
    title: 'Core',
    type: 'object',
    properties: {
        hostname: { type: 'string', title: 'Hostname' },
        interfaces: { type: 'array', items: { type: 'object', title: 'Interface' } },
        vlans: { type: 'array', items: { type: 'object', title: 'VLAN' } },
        services: { type: 'object', title: 'Services' },
        firewall: { type: 'object', title: 'Firewall baseline' }
    }
} as const

const parseCidrPrefix = (value?: string): number | null => {
    if (!value) return null
    const parts = value.split('/')
    if (parts.length !== 2) return null
    const prefix = Number(parts[1])
    return Number.isNaN(prefix) ? null : prefix
}

const pushValidation = (findings: ValidationFinding[], finding: ValidationFinding) => {
    findings.push(finding)
}

const toNumber = (value: string) => {
    const num = Number(value)
    return Number.isNaN(num) ? null : num
}

const ipToInt = (ip?: string): number | null => {
    if (!ip) return null
    const parts = ip.split('.').map(toNumber)
    if (parts.length !== 4 || parts.some((part) => part === null)) return null
    return (parts[0]! << 24) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!
}

const cidrRange = (cidr?: string): { start: number; end: number } | null => {
    if (!cidr || !cidr.includes('/')) return null
    const [ip, prefix] = cidr.split('/')
    const base = ipToInt(ip)
    const bits = Number(prefix)
    if (base === null || Number.isNaN(bits)) return null
    const mask = bits === 0 ? 0 : 0xffffffff << (32 - bits)
    const start = base & mask
    const end = start + (2 ** (32 - bits) - 1)
    return { start, end }
}

const gatewayInSubnet = (gateway?: string, cidr?: string): boolean | null => {
    if (!gateway || !cidr) return null
    const range = cidrRange(cidr)
    const gw = ipToInt(gateway)
    if (!range || gw === null) return null
    return gw >= range.start && gw <= range.end
}

const validateCore = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []

    if (!config.hostname.trim()) {
        pushValidation(findings, {
            id: 'hostname.required',
            severity: 'error',
            field: 'hostname',
            message: 'Hostname is required.',
            suggestion: 'Provide a hostname before generating CLI.'
        })
    }

    const vlanIds = new Map<number, number>()
    config.vlans.forEach((vlan, index) => {
        if (vlanIds.has(vlan.id)) {
            pushValidation(findings, {
                id: `vlans.duplicate.${vlan.id}`,
                severity: 'error',
                field: `vlans.${index}.id`,
                message: `Duplicate VLAN ID ${vlan.id}.`,
                suggestion: 'Ensure VLAN IDs are unique.'
            })
        }
        vlanIds.set(vlan.id, index)
    })

    const ranges = config.vlans
        .map((vlan) => ({
            id: vlan.id,
            range: cidrRange(vlan.subnet)
        }))
        .filter((item) => item.range !== null) as Array<{ id: number; range: { start: number; end: number } }>

    for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
            const a = ranges[i]
            const b = ranges[j]
            if (a.range.start <= b.range.end && b.range.start <= a.range.end) {
                pushValidation(findings, {
                    id: `vlans.overlap.${a.id}.${b.id}`,
                    severity: 'error',
                    field: 'vlans',
                    message: `VLAN subnet overlap detected between ${a.id} and ${b.id}.`,
                    suggestion: 'Adjust VLAN subnets to avoid overlaps.'
                })
            }
        }
    }

    config.vlans.forEach((vlan, index) => {
        const inSubnet = gatewayInSubnet(vlan.gateway, vlan.subnet)
        if (inSubnet === false) {
            pushValidation(findings, {
                id: `vlans.gateway.${vlan.id}`,
                severity: 'error',
                field: `vlans.${index}.gateway`,
                message: `Gateway for VLAN ${vlan.id} is not inside subnet.`,
                suggestion: 'Update gateway to match subnet CIDR.'
            })
        }
    })

    config.vlans.forEach((vlan) => {
        const hasInterface = config.interfaces.some((iface) => iface.vlanId === vlan.id)
        if (!hasInterface) {
            pushValidation(findings, {
                id: `vlans.unused.${vlan.id}`,
                severity: 'warn',
                field: 'interfaces',
                message: `VLAN ${vlan.id} is not attached to any interface.`,
                suggestion: 'Assign VLAN to an access or trunk interface.'
            })
        }
    })

    return findings
}

const evaluateCoreRisk = (config: CanonicalConfig, environment: 'dev' | 'staging' | 'prod'): RiskItem[] => {
    const items: RiskItem[] = []

    if (config.services.ssh.allowPassword) {
        items.push({
            id: 'ssh.password',
            level: environment === 'prod' ? 'HIGH' : 'MEDIUM',
            labelKey: 'netops.generator.risk.sshPassword',
            detailKey: 'netops.generator.risk.sshPasswordDetail'
        })
    }

    if (config.services.ntpServers.length === 0) {
        items.push({
            id: 'ntp.missing',
            level: 'LOW',
            labelKey: 'netops.generator.risk.noNtp',
            detailKey: 'netops.generator.risk.noNtpDetail'
        })
    }

    if (!config.firewall.enabled) {
        items.push({
            id: 'firewall.disabled',
            level: environment === 'prod' ? 'HIGH' : 'MEDIUM',
            labelKey: 'netops.generator.risk.firewallOff',
            detailKey: 'netops.generator.risk.firewallOffDetail'
        })
    }

    const mgmt = (config.firewall.allowMgmtFrom ?? '').trim()
    if (!mgmt) {
        items.push({
            id: 'mgmt.missing',
            level: 'MEDIUM',
            labelKey: 'netops.generator.risk.mgmtMissing',
            detailKey: 'netops.generator.risk.mgmtMissingDetail'
        })
    } else if (mgmt === '0.0.0.0/0' || mgmt === '::/0') {
        items.push({
            id: 'mgmt.open',
            level: 'HIGH',
            labelKey: 'netops.generator.risk.mgmtOpen',
            detailKey: 'netops.generator.risk.mgmtOpenDetail'
        })
    } else {
        const prefix = parseCidrPrefix(mgmt)
        if (prefix !== null && prefix < 24) {
            items.push({
                id: 'mgmt.wide',
                level: 'HIGH',
                labelKey: 'netops.generator.risk.mgmtWide',
                detailKey: 'netops.generator.risk.mgmtWideDetail'
            })
        }
    }

    return items
}

const renderCoreMikrotik = (config: CanonicalConfig) => {
    const base: string[] = []
    const vlanCommands: string[] = []
    const interfaceCommands: string[] = []
    const firewall: string[] = []
    const services: string[] = []
    const verify: string[] = []
    const rollback: string[] = []

    if (config.hostname) {
        base.push(`/system identity set name=${config.hostname}`)
    }

    if (config.vlans.length > 0) {
        base.push('/interface bridge add name=br0 vlan-filtering=yes')
        rollback.push('/interface bridge remove [find name=br0]')
    }

    for (const vlan of config.vlans) {
        vlanCommands.push(`/interface vlan add name=vlan${vlan.id} vlan-id=${vlan.id} interface=br0`)
        if (vlan.gateway) {
            const prefix = maskToPrefix(vlan.subnet) || '24'
            vlanCommands.push(`/ip address add address=${vlan.gateway}/${prefix} interface=vlan${vlan.id}`)
            rollback.push(`/ip address remove [find interface=vlan${vlan.id}]`)
        }
        rollback.push(`/interface vlan remove [find name=vlan${vlan.id}]`)
    }

    for (const iface of config.interfaces) {
        if (iface.ipAddress) {
            const prefix = maskToPrefix(iface.subnetMask) || '24'
            interfaceCommands.push(`/ip address add address=${iface.ipAddress}/${prefix} interface=${iface.name}`)
            rollback.push(`/ip address remove [find interface=${iface.name}]`)
        }
    }

    if (config.services.ssh.enabled) {
        services.push('/ip service set ssh disabled=no')
    } else {
        services.push('/ip service set ssh disabled=yes')
    }
    services.push('/ip service set telnet disabled=yes')

    if (config.services.dnsServers.length > 0) {
        services.push(`/ip dns set servers=${config.services.dnsServers.join(',')}`)
    }

    if (config.services.ntpServers.length > 0) {
        services.push(`/system ntp client set enabled=yes primary-ntp=${config.services.ntpServers[0]}`)
    }

    if (config.firewall.enabled) {
        firewall.push('/ip firewall filter add chain=input connection-state=established,related action=accept')
        firewall.push('/ip firewall filter add chain=input connection-state=invalid action=drop')
        firewall.push('/ip firewall filter add chain=input in-interface=ether1 action=accept')
        firewall.push('/ip firewall filter add chain=input action=drop')
    }

    verify.push('/interface vlan print')
    verify.push('/ip address print')

    return {
        sections: [
            { name: 'base', commands: base },
            { name: 'vlan', commands: vlanCommands },
            { name: 'interfaces', commands: interfaceCommands },
            { name: 'services', commands: services },
            { name: 'firewall', commands: firewall }
        ].filter((section) => section.commands.length > 0),
        verifyCommands: verify,
        rollbackCommands: rollback
    }
}

const renderCoreCisco = (config: CanonicalConfig) => {
    const base: string[] = []
    const vlanCommands: string[] = []
    const interfaceCommands: string[] = []
    const services: string[] = []
    const firewall: string[] = []
    const verify: string[] = []
    const rollback: string[] = []

    if (config.hostname) {
        base.push(`hostname ${config.hostname}`)
    }

    if (config.services.ssh.enabled) {
        services.push('ip ssh version 2')
        services.push('line vty 0 4')
        services.push(' transport input ssh')
        rollback.push('line vty 0 4')
        rollback.push(' transport input telnet')
    }

    services.push('no ip http server')

    if (config.services.dnsServers.length > 0) {
        config.services.dnsServers.forEach((server) => services.push(`ip name-server ${server}`))
    }

    for (const vlan of config.vlans) {
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

    for (const iface of config.interfaces) {
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

    if (config.firewall.enabled) {
        firewall.push('ip access-list extended MGMT-IN')
        firewall.push(' permit ip any any')
    }

    verify.push('show vlan brief')
    verify.push('show ip interface brief')

    return {
        sections: [
            { name: 'base', commands: base },
            { name: 'vlan', commands: vlanCommands },
            { name: 'interfaces', commands: interfaceCommands },
            { name: 'services', commands: services },
            { name: 'firewall', commands: firewall }
        ].filter((section) => section.commands.length > 0),
        verifyCommands: verify,
        rollbackCommands: rollback
    }
}

const coreModule: ModuleDefinition = {
    key: 'core',
    title: 'Core configuration',
    inputSchema: coreSchema,
    validate: validateCore,
    risk: evaluateCoreRisk,
    render: (config: CanonicalConfig, vendor: Vendor) => {
        return vendor === 'mikrotik' ? renderCoreMikrotik(config) : renderCoreCisco(config)
    }
}

export default coreModule
