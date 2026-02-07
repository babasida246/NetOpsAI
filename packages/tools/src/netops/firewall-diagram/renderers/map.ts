import type { FirewallIR, RuleIR } from '../types.js'
import { escapeMermaidLabel } from './shared.js'

type EdgeKey = string

type MapEdge = {
    from: string
    to: string
    action: 'allow' | 'deny' | 'reject' | 'other'
    labels: string[]
}

function normalizeAction(action: string): MapEdge['action'] {
    const a = action.toLowerCase()
    if (a === 'accept' || a === 'allow') return 'allow'
    if (a === 'deny' || a === 'drop') return 'deny'
    if (a === 'reject') return 'reject'
    return 'other'
}

function uniq(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)))
}

function summarizeRuleForEdge(rule: RuleIR): string {
    const svc = uniq(rule.service ?? []).slice(0, 3)
    const src = uniq(rule.srcAddr ?? []).slice(0, 2)
    const dst = uniq(rule.dstAddr ?? []).slice(0, 2)

    const parts: string[] = []
    if (src.length) parts.push(`src=${src.join(',')}`)
    if (dst.length) parts.push(`dst=${dst.join(',')}`)
    if (svc.length) parts.push(`svc=${svc.join(',')}`)
    return parts.join(' ')
}

function pickZones(rule: RuleIR): { from: string[]; to: string[] } {
    const from = rule.srcIntf && rule.srcIntf.length ? rule.srcIntf : ['any']
    const to = rule.dstIntf && rule.dstIntf.length ? rule.dstIntf : ['any']
    return { from, to }
}

export function renderMap(ir: FirewallIR): string {
    const edges = new Map<EdgeKey, MapEdge>()

    for (const chain of ir.chains) {
        for (const rule of chain.rules) {
            if (!rule.enabled) continue
            const act = normalizeAction(rule.action)
            // Skip non-policy actions (e.g. NAT-only rules) in the high-level map.
            if (act === 'other') continue

            const zones = pickZones(rule)
            const label = summarizeRuleForEdge(rule)

            for (const from of zones.from) {
                for (const to of zones.to) {
                    const key: EdgeKey = `${from}::${to}::${act}`
                    const existing = edges.get(key)
                    if (!existing) {
                        edges.set(key, { from, to, action: act, labels: label ? [label] : [] })
                    } else if (label) {
                        existing.labels.push(label)
                    }
                }
            }
        }
    }

    const nodes = new Set<string>()
    for (const edge of edges.values()) {
        nodes.add(edge.from)
        nodes.add(edge.to)
    }

    const lines: string[] = []
    lines.push('flowchart LR')
    lines.push('  classDef allow stroke:#16a34a,color:#16a34a;')
    lines.push('  classDef deny stroke:#dc2626,color:#dc2626;')

    for (const node of Array.from(nodes).sort((a, b) => a.localeCompare(b))) {
        const id = `Z_${node.replace(/[^a-zA-Z0-9_]/g, '_')}`
        lines.push(`  ${id}["${escapeMermaidLabel(node)}"]`)
    }

    const edgeList = Array.from(edges.values()).sort((a, b) => {
        const ak = `${a.from}|${a.to}|${a.action}`
        const bk = `${b.from}|${b.to}|${b.action}`
        return ak.localeCompare(bk)
    })

    for (const edge of edgeList) {
        const fromId = `Z_${edge.from.replace(/[^a-zA-Z0-9_]/g, '_')}`
        const toId = `Z_${edge.to.replace(/[^a-zA-Z0-9_]/g, '_')}`
        const label = uniq(edge.labels).slice(0, 3).join(' | ')
        const edgeLabel = label ? `|"${escapeMermaidLabel(label)}"|` : ''
        lines.push(`  ${fromId} -->${edgeLabel} ${toId}`)
        if (edge.action === 'allow') {
            lines.push(`  class ${fromId},${toId} allow;`)
        } else if (edge.action === 'deny' || edge.action === 'reject') {
            lines.push(`  class ${fromId},${toId} deny;`)
        }
    }

    if (edgeList.length === 0) {
        lines.push('  NOTE["No allow/deny policy edges detected."]')
    }

    return lines.join('\n')
}

