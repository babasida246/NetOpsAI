import type { ModuleDefinition } from './types'
import type { CanonicalConfig, NatRule, RiskItem, Vendor, ValidationFinding } from '../types'

const natSchema = {
    title: 'NAT',
    type: 'object',
    properties: {
        rules: { type: 'array', items: { type: 'object', title: 'NAT rule' } }
    }
} as const

const validateNat = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []
    config.nat.rules.forEach((rule, index) => {
        if (!rule.type) {
            findings.push({
                id: `nat.rule.${index}`,
                severity: 'error',
                field: `nat.rules.${index}.type`,
                message: 'NAT rule type is required.',
                suggestion: 'Select SNAT/DNAT/Masquerade.'
            })
        }
        if (rule.type === 'dnat' && !rule.toAddress) {
            findings.push({
                id: `nat.rule.${index}.toAddress`,
                severity: 'error',
                field: `nat.rules.${index}.toAddress`,
                message: 'DNAT rule requires target address.',
                suggestion: 'Provide translated address.'
            })
        }

        if (rule.outInterface) {
            const hasInterface = config.interfaces.some((iface) => iface.name === rule.outInterface)
            if (!hasInterface) {
                findings.push({
                    id: `nat.rule.${index}.interface`,
                    severity: 'warn',
                    field: `nat.rules.${index}.outInterface`,
                    message: 'NAT rule references unknown interface.',
                    suggestion: 'Ensure NAT out-interface exists on the device.'
                })
            }
        } else {
            const hasUplink = config.interfaces.some((iface) => iface.role === 'uplink')
            if (!hasUplink) {
                findings.push({
                    id: `nat.rule.${index}.uplink`,
                    severity: 'warn',
                    field: `nat.rules.${index}.outInterface`,
                    message: 'NAT rule has no out-interface and no uplink interface defined.',
                    suggestion: 'Set NAT out-interface or define uplink interface.'
                })
            }
        }
    })
    return findings
}

const riskNat = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    config.nat.rules.forEach((rule) => {
        if (rule.type === 'dnat' && (!rule.dstPort || !rule.dst)) {
            items.push({
                id: `nat.open.${rule.id}`,
                level: 'MEDIUM',
                labelKey: 'netops.generator.risk.natOpen',
                detailKey: 'netops.generator.risk.natOpenDetail'
            })
        }
    })
    return items
}

const renderMikrotikNat = (rule: NatRule): string => {
    const parts: string[] = ['/ip firewall nat add']
    const chain = rule.type === 'dnat' ? 'dstnat' : 'srcnat'
    parts.push(`chain=${chain}`)
    if (rule.src) parts.push(`src-address=${rule.src}`)
    if (rule.dst) parts.push(`dst-address=${rule.dst}`)
    if (rule.protocol) parts.push(`protocol=${rule.protocol}`)
    if (rule.srcPort) parts.push(`src-port=${rule.srcPort}`)
    if (rule.dstPort) parts.push(`dst-port=${rule.dstPort}`)
    if (rule.outInterface) parts.push(`out-interface=${rule.outInterface}`)
    if (rule.type === 'masquerade') {
        parts.push('action=masquerade')
    } else if (rule.type === 'snat') {
        parts.push('action=src-nat')
        if (rule.toAddress) parts.push(`to-addresses=${rule.toAddress}`)
        if (rule.toPort) parts.push(`to-ports=${rule.toPort}`)
    } else {
        parts.push('action=dst-nat')
        if (rule.toAddress) parts.push(`to-addresses=${rule.toAddress}`)
        if (rule.toPort) parts.push(`to-ports=${rule.toPort}`)
    }
    if (rule.comment) parts.push(`comment=${rule.comment}`)
    return parts.join(' ')
}

const renderCiscoNat = (rule: NatRule): string[] => {
    const lines: string[] = []
    if (rule.type === 'dnat' && rule.toAddress && rule.dstPort) {
        lines.push(`ip nat inside source static tcp ${rule.dst || 'any'} ${rule.dstPort} ${rule.toAddress} ${rule.toPort || rule.dstPort}`)
        return lines
    }
    if (rule.type === 'snat' || rule.type === 'masquerade') {
        lines.push('ip access-list standard NETOPS-NAT')
        lines.push(` permit ${rule.src || 'any'}`)
        lines.push(`ip nat inside source list NETOPS-NAT interface ${rule.outInterface || 'GigabitEthernet0/0'} overload`)
    } else {
        lines.push(`! NAT rule ${rule.id} requires manual review`)
    }
    return lines
}

const natModule: ModuleDefinition = {
    key: 'nat',
    title: 'NAT',
    inputSchema: natSchema,
    validate: validateNat,
    risk: (config) => riskNat(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        if (config.nat.rules.length === 0) {
            return { sections: [], verifyCommands: [], rollbackCommands: [] }
        }
        const commands: string[] = []
        const rollback: string[] = []
        config.nat.rules.forEach((rule) => {
            if (vendor === 'mikrotik') {
                commands.push(renderMikrotikNat(rule))
                rollback.push('/ip firewall nat remove [find]')
            } else {
                commands.push(...renderCiscoNat(rule))
                rollback.push('no ip nat inside source list NETOPS-NAT interface GigabitEthernet0/0 overload')
            }
        })
        return {
            sections: [{ name: 'nat', commands }],
            verifyCommands: vendor === 'mikrotik' ? ['/ip firewall nat print'] : ['show ip nat translations'],
            rollbackCommands: rollback
        }
    }
}

export default natModule
