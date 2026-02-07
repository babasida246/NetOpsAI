import type { ChainIR, FirewallIR, RuleIR } from '../types.js'
import { splitQuotedTokens, stripQuotes } from './shared.js'

type ParseResult = { ir: FirewallIR; errors: string[]; warnings: string[] }

type FortiSection =
    | 'firewall address'
    | 'firewall addrgrp'
    | 'firewall service custom'
    | 'firewall service group'
    | 'firewall ippool'
    | 'firewall policy'

type FortiObject = Record<string, unknown> & { id: string }

function normalizeToArray(value: unknown): string[] | undefined {
    if (value === undefined || value === null) return undefined
    if (Array.isArray(value)) return value.map(String)
    return [String(value)]
}

function parseConfigBlocks(text: string): Record<FortiSection, FortiObject[]> {
    const blocks: Partial<Record<FortiSection, FortiObject[]>> = {}
    const lines = text.split(/\r?\n/g)

    let currentSection: FortiSection | null = null
    let currentItem: FortiObject | null = null

    const ensureSection = (section: FortiSection) => {
        if (!blocks[section]) blocks[section] = []
        return blocks[section]!
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        if (line.startsWith('config ')) {
            const section = line.slice('config '.length).trim() as FortiSection
            if (
                section === 'firewall address' ||
                section === 'firewall addrgrp' ||
                section === 'firewall service custom' ||
                section === 'firewall service group' ||
                section === 'firewall ippool' ||
                section === 'firewall policy'
            ) {
                currentSection = section
                currentItem = null
            } else {
                currentSection = null
                currentItem = null
            }
            continue
        }

        if (!currentSection) continue

        if (line.startsWith('edit ')) {
            const idRaw = line.slice('edit '.length).trim()
            const id = stripQuotes(idRaw)
            currentItem = { id }
            continue
        }

        if (!currentItem) continue

        if (line.startsWith('set ')) {
            const rest = line.slice('set '.length)
            const tokens = splitQuotedTokens(rest)
            const key = tokens[0]
            const values = tokens.slice(1)
            if (!key) continue
            if (values.length === 0) {
                currentItem[key] = true
            } else if (values.length === 1) {
                currentItem[key] = values[0]
            } else {
                currentItem[key] = values
            }
            continue
        }

        if (line.startsWith('unset ')) {
            const key = line.slice('unset '.length).trim()
            if (key) currentItem[key] = undefined
            continue
        }

        if (line === 'next') {
            ensureSection(currentSection).push(currentItem)
            currentItem = null
            continue
        }

        if (line === 'end') {
            currentSection = null
            currentItem = null
            continue
        }
    }

    return {
        'firewall address': blocks['firewall address'] ?? [],
        'firewall addrgrp': blocks['firewall addrgrp'] ?? [],
        'firewall service custom': blocks['firewall service custom'] ?? [],
        'firewall service group': blocks['firewall service group'] ?? [],
        'firewall ippool': blocks['firewall ippool'] ?? [],
        'firewall policy': blocks['firewall policy'] ?? []
    }
}

function normalizeAction(action?: string): string {
    if (!action) return 'unknown'
    const a = action.toLowerCase()
    if (a === 'accept') return 'accept'
    if (a === 'deny') return 'deny'
    if (a === 'reject') return 'reject'
    return a
}

function serviceSummary(serviceName: string, serviceObj?: FortiObject): { proto?: string; ports?: string } {
    if (!serviceObj) return {}
    const tcp = serviceObj['tcp-portrange']
    const udp = serviceObj['udp-portrange']
    if (typeof tcp === 'string' && tcp.trim()) return { proto: 'tcp', ports: tcp }
    if (typeof udp === 'string' && udp.trim()) return { proto: 'udp', ports: udp }
    return {}
}

export function parseFortigateFirewallFromText(text: string): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    const blocks = parseConfigBlocks(text)

    const addr = blocks['firewall address']
    const addrgrp = blocks['firewall addrgrp']
    const svcCustom = blocks['firewall service custom']
    const svcGroup = blocks['firewall service group']
    const ippool = blocks['firewall ippool']
    const policy = blocks['firewall policy']

    if (policy.length === 0) {
        warnings.push('No FortiGate firewall policies detected (expected "config firewall policy" blocks).')
    }

    const addresses = addr
        .map((a) => {
            const subnet = a.subnet
            let value: string | undefined
            if (Array.isArray(subnet) && subnet.length >= 2) {
                value = `${subnet[0]}/${subnet[1]}`
            } else if (typeof subnet === 'string') {
                value = subnet
            } else if (typeof a.fqdn === 'string') {
                value = a.fqdn
            }
            return { id: a.id, value, kind: typeof a.fqdn === 'string' ? ('fqdn' as const) : ('unknown' as const) }
        })
        .sort((a, b) => a.id.localeCompare(b.id))

    const addressGroups = addrgrp
        .map((g) => {
            const members = normalizeToArray(g.member) ?? []
            return { id: g.id, members: members.map(String).sort() }
        })
        .sort((a, b) => a.id.localeCompare(b.id))

    const serviceById = new Map<string, FortiObject>(svcCustom.map((s) => [s.id, s]))
    const services = svcCustom
        .map((s) => {
            const meta = serviceSummary(s.id, s)
            return { id: s.id, ...meta }
        })
        .sort((a, b) => a.id.localeCompare(b.id))

    const serviceGroups = svcGroup
        .map((g) => {
            const members = normalizeToArray(g.member) ?? []
            return { id: g.id, members: members.map(String).sort() }
        })
        .sort((a, b) => a.id.localeCompare(b.id))

    const ippoolById = new Map<string, FortiObject>(ippool.map((p) => [p.id, p]))

    const rules: RuleIR[] = []
    const ordered = policy
        .slice()
        .sort((a, b) => {
            const ai = Number(a.id)
            const bi = Number(b.id)
            if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi
            return String(a.id).localeCompare(String(b.id))
        })

    let order = 0
    for (const p of ordered) {
        order++
        const enabled = !(String(p.status ?? 'enable').toLowerCase() === 'disable')

        const srcIntf = normalizeToArray(p.srcintf)
        const dstIntf = normalizeToArray(p.dstintf)
        const srcAddr = normalizeToArray(p.srcaddr)
        const dstAddr = normalizeToArray(p.dstaddr)
        const service = normalizeToArray(p.service)

        const natEnabled = String(p.nat ?? '').toLowerCase() === 'enable'
        const ippoolEnabled = String(p.ippool ?? '').toLowerCase() === 'enable'
        const poolName = normalizeToArray(p.poolname)?.[0]
        const poolObj = poolName ? ippoolById.get(poolName) : undefined
        const nat = natEnabled
            ? {
                  type: 'snat' as const,
                  toAddr: ippoolEnabled ? (poolObj ? String(poolObj.startip ?? poolName) : poolName) : undefined
              }
            : undefined

        const action = normalizeAction(typeof p.action === 'string' ? p.action : undefined)

        const rule: RuleIR = {
            order,
            id: `ftg-policy-${p.id}`,
            enabled,
            srcIntf,
            dstIntf,
            srcAddr,
            dstAddr,
            service,
            schedule: typeof p.schedule === 'string' ? p.schedule : undefined,
            action,
            log: String(p.logtraffic ?? '').toLowerCase() === 'all' ? 'all' : undefined,
            nat,
            comment: typeof p.name === 'string' ? p.name : undefined,
            raw: p
        }
        rules.push(rule)

        // Enrich services list if policy references a custom service.
        for (const svc of service ?? []) {
            if (serviceById.has(svc) && !services.some((s) => s.id === svc)) {
                const meta = serviceSummary(svc, serviceById.get(svc))
                services.push({ id: svc, ...meta })
            }
        }
    }

    const chain: ChainIR = { id: 'policy', defaultAction: 'unknown', rules }

    const ir: FirewallIR = {
        vendor: 'fortigate',
        objects: {
            addresses,
            addressGroups,
            services,
            serviceGroups
        },
        chains: [chain],
        warnings: []
    }

    return { ir, errors, warnings }
}

