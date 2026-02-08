import type { SnmpRow } from './snmp-parse.js'

export function parseSnmpOutput(text: string): SnmpRow[] {
    const rows: SnmpRow[] = []
    const lines = text.split(/\r?\n/g)
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const match = trimmed.match(/^(\S+)\s*=\s*(.+)$/)
        if (!match) continue
        rows.push({ oid: match[1], value: match[2] })
    }
    return rows
}
