import type { FirewallIR } from '../types.js'

function hasNat(ir: FirewallIR, type: 'dnat' | 'snat' | 'masquerade'): boolean {
    for (const chain of ir.chains) {
        for (const rule of chain.rules) {
            if (rule.nat?.type === type) return true
            if (type === 'snat' && rule.nat?.type === 'masquerade') return true
        }
    }
    return false
}

export function renderPipeline(ir: FirewallIR): string {
    const hasDnat = hasNat(ir, 'dnat')
    const hasSnat = hasNat(ir, 'snat')

    const lines: string[] = []
    lines.push('flowchart LR')
    lines.push('  IN[Packet In] --> DNAT{DNAT rules?}')
    lines.push(`  DNAT -->|yes| DNAT_APPLY[Apply DNAT${hasDnat ? '' : ' (none detected)'}]`)
    lines.push('  DNAT -->|no| ROUTE[Routing]')
    lines.push('  DNAT_APPLY --> ROUTE')
    lines.push('  ROUTE --> POLICY[Policy / Filter]')
    lines.push('  POLICY --> SNAT{SNAT rules?}')
    lines.push(`  SNAT -->|yes| SNAT_APPLY[Apply SNAT${hasSnat ? '' : ' (none detected)'}]`)
    lines.push('  SNAT -->|no| OUT[Packet Out]')
    lines.push('  SNAT_APPLY --> OUT')
    return lines.join('\n')
}

