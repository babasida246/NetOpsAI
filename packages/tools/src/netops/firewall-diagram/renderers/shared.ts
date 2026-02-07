import type { RuleIR } from '../types.js'

export function escapeMermaidLabel(text: string): string {
    // Mermaid flowcharts support HTML line breaks inside labels.
    return text
        .replace(/"/g, "'")
        .replace(/\r?\n/g, ' ')
        .trim()
}

function truncate(text: string, max = 120): string {
    if (text.length <= max) return text
    return `${text.slice(0, Math.max(0, max - 1))}…`
}

function joinShort(values?: string[], max = 3): string {
    if (!values || values.length === 0) return '-'
    const uniq = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)))
    if (uniq.length <= max) return uniq.join(', ')
    return `${uniq.slice(0, max).join(', ')} +${uniq.length - max}`
}

export function summarizeRule(rule: RuleIR): string {
    const parts: string[] = []
    if (rule.srcAddr?.length) parts.push(`src=${joinShort(rule.srcAddr)}`)
    if (rule.dstAddr?.length) parts.push(`dst=${joinShort(rule.dstAddr)}`)
    if (rule.service?.length) parts.push(`svc=${joinShort(rule.service)}`)
    if (rule.srcIntf?.length) parts.push(`in=${joinShort(rule.srcIntf)}`)
    if (rule.dstIntf?.length) parts.push(`out=${joinShort(rule.dstIntf)}`)
    if (rule.state?.length) parts.push(`state=${joinShort(rule.state)}`)
    const base = parts.length ? parts.join(' | ') : 'any'
    return truncate(base, 140)
}

export function actionLabel(rule: RuleIR): string {
    const action = rule.action.toUpperCase()
    const extra: string[] = []
    if (rule.nat) {
        const natParts = [rule.nat.type.toUpperCase()]
        if (rule.nat.toAddr) natParts.push(`to=${rule.nat.toAddr}`)
        if (rule.nat.toPort) natParts.push(`port=${rule.nat.toPort}`)
        extra.push(natParts.join(' '))
    }
    if (rule.log && rule.log !== 'none') extra.push(`log=${rule.log}`)
    if (rule.comment) extra.push(truncate(rule.comment, 60))
    return truncate([action, ...extra].filter(Boolean).join(' | '), 140)
}

