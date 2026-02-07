import type { ChainIR, FirewallIR, RuleIR } from '../types.js'
import { parseRouterOsAddLine } from './shared.js'

type ParseResult = { ir: FirewallIR; errors: string[]; warnings: string[] }

function splitCsv(value?: string): string[] | undefined {
    if (!value) return undefined
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
}

function normalizeBool(value?: string): boolean {
    return value !== 'yes' && value !== 'true' && value !== '1'
}

function normalizeAction(action?: string): string {
    if (!action) return 'unknown'
    const a = action.toLowerCase()
    if (a === 'accept') return 'accept'
    if (a === 'drop') return 'deny'
    if (a === 'reject') return 'reject'
    if (a === 'fasttrack-connection') return 'fasttrack'
    return a
}

function buildService(fields: Record<string, string>): string[] | undefined {
    const proto = fields.protocol?.toLowerCase()
    const dstPort = fields['dst-port']
    const srcPort = fields['src-port']
    if (!proto && !dstPort && !srcPort) return undefined

    const parts: string[] = []
    if (proto) parts.push(proto)
    if (dstPort) parts.push(`dport=${dstPort}`)
    if (srcPort) parts.push(`sport=${srcPort}`)
    return [parts.join(' ')]
}

function parseSectionMarkers(line: string): 'filter' | 'nat' | 'address-list' | null {
    const trimmed = line.trim().toLowerCase()
    if (trimmed.startsWith('/ip firewall filter')) return 'filter'
    if (trimmed.startsWith('/ip firewall nat')) return 'nat'
    if (trimmed.startsWith('/ip firewall address-list')) return 'address-list'
    return null
}

function inferSection(fields: Record<string, string>): 'filter' | 'nat' | 'address-list' {
    if (fields.list && fields.address) return 'address-list'
    const chain = fields.chain?.toLowerCase()
    const action = fields.action?.toLowerCase()
    if (chain === 'srcnat' || chain === 'dstnat') return 'nat'
    if (action === 'dst-nat' || action === 'src-nat' || action === 'masquerade' || action === 'redirect') return 'nat'
    return 'filter'
}

function ruleFromFields(
    section: 'filter' | 'nat',
    order: number,
    fields: Record<string, string>
): { chainId: string; rule: RuleIR } {
    const chain = (fields.chain || (section === 'nat' ? 'nat' : 'forward')).toLowerCase()
    const enabled = normalizeBool(fields.disabled)
    const actionRaw = fields.action || 'unknown'
    const action = normalizeAction(actionRaw)

    const srcIntf = splitCsv(fields['in-interface'] || fields['in-interface-list'])
    const dstIntf = splitCsv(fields['out-interface'] || fields['out-interface-list'])

    const srcAddr: string[] = []
    if (fields['src-address']) srcAddr.push(fields['src-address'])
    if (fields['src-address-list']) srcAddr.push(fields['src-address-list'])

    const dstAddr: string[] = []
    if (fields['dst-address']) dstAddr.push(fields['dst-address'])
    if (fields['dst-address-list']) dstAddr.push(fields['dst-address-list'])

    const service = buildService(fields)
    const state = splitCsv(fields['connection-state'])

    const comment = fields.comment

    let nat: RuleIR['nat'] | undefined
    if (section === 'nat') {
        const a = actionRaw.toLowerCase()
        if (a === 'masquerade') {
            nat = { type: 'masquerade' }
        } else if (a === 'src-nat') {
            nat = { type: 'snat', toAddr: fields['to-addresses'], toPort: fields['to-ports'] }
        } else if (a === 'dst-nat') {
            nat = { type: 'dnat', toAddr: fields['to-addresses'], toPort: fields['to-ports'] }
        } else if (a === 'redirect') {
            nat = { type: 'dnat', toAddr: 'redirect', toPort: fields['to-ports'] }
        }
    }

    const rule: RuleIR = {
        order,
        id: `mtk-${section}-${order}`,
        enabled,
        srcIntf,
        dstIntf,
        srcAddr: srcAddr.length ? srcAddr : undefined,
        dstAddr: dstAddr.length ? dstAddr : undefined,
        service,
        state,
        action: section === 'nat' ? (nat?.type ?? action) : action,
        nat,
        comment,
        raw: fields
    }

    return { chainId: chain, rule }
}

export function parseMikrotikFirewallFromText(text: string): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    const chains = new Map<string, ChainIR>()
    const addressListMembers = new Map<string, Set<string>>()

    let currentSection: 'filter' | 'nat' | 'address-list' | null = null
    let order = 0

    for (const rawLine of text.split(/\r?\n/g)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#') || line.startsWith(';')) continue

        const marker = parseSectionMarkers(line)
        if (marker) {
            currentSection = marker
            continue
        }

        if (!line.startsWith('add ')) continue

        const fields = parseRouterOsAddLine(line)
        if (Object.keys(fields).length === 0) continue

        const section = currentSection ?? inferSection(fields)
        if (section === 'address-list') {
            const list = fields.list
            const address = fields.address
            if (!list || !address) {
                warnings.push(`address-list entry missing list/address: ${line}`)
                continue
            }
            if (!addressListMembers.has(list)) addressListMembers.set(list, new Set())
            addressListMembers.get(list)!.add(address)
            continue
        }

        order++
        const { chainId, rule } = ruleFromFields(section, order, fields)
        if (!chains.has(chainId)) chains.set(chainId, { id: chainId, defaultAction: 'unknown', rules: [] })
        chains.get(chainId)!.rules.push(rule)
    }

    if (chains.size === 0) {
        warnings.push('No MikroTik firewall rules detected (expected RouterOS export terse output).')
    }

    const addressGroups = Array.from(addressListMembers.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, members]) => ({ id, members: Array.from(members).sort() }))

    const addresses = addressGroups.flatMap((g) =>
        g.members.map((value) => ({ id: `${g.id}:${value}`, value, kind: 'subnet' as const }))
    )

    const servicesSet = new Set<string>()
    for (const chain of chains.values()) {
        for (const rule of chain.rules) {
            for (const svc of rule.service ?? []) servicesSet.add(svc)
        }
    }
    const services = Array.from(servicesSet)
        .sort()
        .map((id) => ({ id }))

    const ir: FirewallIR = {
        vendor: 'mikrotik',
        device: { name: undefined, version: undefined, vdom: undefined },
        objects: {
            addresses,
            addressGroups,
            services,
            serviceGroups: []
        },
        chains: Array.from(chains.values()).sort((a, b) => a.id.localeCompare(b.id)),
        warnings: []
    }

    // Minimal heuristic for default action: if last rule is deny/drop and has no matcher, treat as default deny.
    for (const chain of ir.chains) {
        const last = chain.rules[chain.rules.length - 1]
        if (!last) continue
        const hasMatchers =
            (last.srcAddr && last.srcAddr.length > 0) ||
            (last.dstAddr && last.dstAddr.length > 0) ||
            (last.srcIntf && last.srcIntf.length > 0) ||
            (last.dstIntf && last.dstIntf.length > 0) ||
            (last.service && last.service.length > 0) ||
            (last.state && last.state.length > 0)
        if (!hasMatchers && last.action === 'deny') {
            chain.defaultAction = 'deny'
        }
    }

    // Provide a stable warning hook for IR consumers.
    if (addressGroups.length === 0) {
        warnings.push('No address-lists detected. Map view may be less informative.')
    }

    // Note: we keep errors empty for now; parsers are tolerant by design.
    return { ir, errors, warnings }
}
