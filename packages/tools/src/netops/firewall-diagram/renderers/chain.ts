import type { ChainIR } from '../types.js'
import { actionLabel, escapeMermaidLabel, summarizeRule } from './shared.js'

type RenderOptions = { maxRulesPerChain?: number }

function nodeId(prefix: string, index: number): string {
    return `${prefix}${index}`
}

export function renderChain(chain: ChainIR, options: RenderOptions = {}): string {
    const maxRules = options.maxRulesPerChain
    const rules = maxRules && chain.rules.length > maxRules ? chain.rules.slice(0, maxRules) : chain.rules
    const truncated = maxRules !== undefined && chain.rules.length > maxRules

    const lines: string[] = []
    lines.push('flowchart TD')
    lines.push('  classDef disabled fill:#f8f8f8,stroke:#999,stroke-dasharray: 5 5,color:#666;')

    const startId = 'START'
    const endId = 'END'
    lines.push(`  ${startId}([Packet enters ${escapeMermaidLabel(chain.id)}])`)
    lines.push(`  ${endId}([END])`)

    let prevNo = startId
    let idx = 0

    for (const rule of rules) {
        idx++
        const decisionId = nodeId('R', idx)
        const actionId = nodeId('A', idx)

        const summary = escapeMermaidLabel(summarizeRule(rule))
        const act = escapeMermaidLabel(actionLabel(rule))

        lines.push(`  ${decisionId}{"R${idx}: ${summary}?"}`)
        lines.push(`  ${actionId}["${act}"]`)

        lines.push(`  ${prevNo} --> ${decisionId}`)
        lines.push(`  ${decisionId} -->|match| ${actionId}`)
        lines.push(`  ${actionId} --> ${endId}`)

        const nextNoLabel = nodeId('N', idx)
        lines.push(`  ${decisionId} -->|no| ${nextNoLabel}`)
        // The "no" path is modeled as a simple node to keep the diagram readable.
        lines.push(`  ${nextNoLabel}([next rule])`)

        if (!rule.enabled) {
            lines.push(`  class ${decisionId} disabled;`)
            lines.push(`  class ${actionId} disabled;`)
        }

        prevNo = nextNoLabel
    }

    if (truncated) {
        const remaining = chain.rules.length - rules.length
        lines.push(`  ${prevNo} --> MORE["… ${remaining} more rules (collapsed) …"]`)
        lines.push(`  MORE --> DEF["Default: ${escapeMermaidLabel(chain.defaultAction ?? 'unknown')}"]`)
        lines.push(`  DEF --> ${endId}`)
        return lines.join('\n')
    }

    lines.push(`  ${prevNo} --> DEF["Default: ${escapeMermaidLabel(chain.defaultAction ?? 'unknown')}"]`)
    lines.push(`  DEF --> ${endId}`)
    return lines.join('\n')
}

