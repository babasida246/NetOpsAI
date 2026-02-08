import type { ModuleDefinition } from './types'
import type { CanonicalConfig, FirewallRule, RiskItem, Vendor, ValidationFinding } from '../types'

const firewallSchema = {
    title: 'Firewall',
    type: 'object',
    properties: {
        rules: { type: 'array', items: { type: 'object', title: 'Firewall rule' } }
    }
} as const

const normalizeProtocol = (rule: FirewallRule) => {
    if (!rule.protocol || rule.protocol === 'any') return ''
    return rule.protocol
}

const renderMikrotikRule = (rule: FirewallRule): string => {
    const parts: string[] = ['/ip firewall filter add']
    parts.push(`chain=${rule.chain}`)
    if (rule.src) parts.push(`src-address=${rule.src}`)
    if (rule.dst) parts.push(`dst-address=${rule.dst}`)
    if (normalizeProtocol(rule)) parts.push(`protocol=${normalizeProtocol(rule)}`)
    if (rule.srcPort) parts.push(`src-port=${rule.srcPort}`)
    if (rule.dstPort) parts.push(`dst-port=${rule.dstPort}`)
    parts.push(`action=${rule.action}`)
    if (rule.comment) parts.push(`comment=${rule.comment}`)
    return parts.join(' ')
}

const renderCiscoRule = (rule: FirewallRule): string[] => {
    const action = rule.action === 'accept' ? 'permit' : rule.action === 'log' ? 'permit' : 'deny'
    const protocol = rule.protocol && rule.protocol !== 'any' ? rule.protocol : 'ip'
    const src = rule.src || 'any'
    const dst = rule.dst || 'any'
    const lines: string[] = []
    if (rule.comment) {
        lines.push(` remark ${rule.comment}`)
    }
    const portPart = rule.dstPort && (protocol === 'tcp' || protocol === 'udp') ? ` eq ${rule.dstPort}` : ''
    lines.push(` ${action} ${protocol} ${src} ${dst}${portPart}`)
    if (rule.action === 'log') {
        lines.push(` ${action} ${protocol} ${src} ${dst}${portPart} log`)
    }
    return lines
}

const validateFirewall = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []
    config.firewall.rules.forEach((rule, index) => {
        if (!rule.chain || !rule.action) {
            findings.push({
                id: `firewall.rule.${index}`,
                severity: 'error',
                field: `firewall.rules.${index}`,
                message: 'Firewall rule missing chain or action.',
                suggestion: 'Select chain and action for each rule.'
            })
        }
    })
    return findings
}

const riskFirewall = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    config.firewall.rules.forEach((rule) => {
        const isAnyAny = !rule.src && !rule.dst && (!rule.protocol || rule.protocol === 'any')
        if (rule.action === 'accept' && isAnyAny) {
            items.push({
                id: `firewall.allowAny.${rule.id}`,
                level: 'HIGH',
                labelKey: 'netops.generator.risk.firewallAllowAny',
                detailKey: 'netops.generator.risk.firewallAllowAnyDetail'
            })
        }
    })
    return items
}

const firewallModule: ModuleDefinition = {
    key: 'firewall',
    title: 'Firewall',
    inputSchema: firewallSchema,
    validate: validateFirewall,
    risk: (config) => riskFirewall(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        const commands: string[] = []
        const rollback: string[] = []

        if (config.firewall.rules.length === 0) {
            return { sections: [], verifyCommands: [], rollbackCommands: [] }
        }

        if (vendor === 'mikrotik') {
            config.firewall.rules.forEach((rule) => {
                commands.push(renderMikrotikRule(rule))
            })
            rollback.push('/ip firewall filter remove [find]')
        } else {
            commands.push('ip access-list extended NETOPS-FW')
            config.firewall.rules.forEach((rule) => {
                commands.push(...renderCiscoRule(rule))
            })
            rollback.push('no ip access-list extended NETOPS-FW')
        }

        return {
            sections: [{ name: 'firewall-rules', commands }],
            verifyCommands: vendor === 'mikrotik' ? ['/ip firewall filter print'] : ['show access-lists'],
            rollbackCommands: rollback
        }
    }
}

export default firewallModule

