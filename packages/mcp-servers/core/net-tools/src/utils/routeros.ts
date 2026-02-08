import { parseKeyValueLine } from './parser.js'

export function parseRouterOsDetailOutput(text: string): Array<Record<string, string>> {
    const lines = text.split(/\r?\n/g)
    const entries: Array<Record<string, string>> = []
    let current = ''

    for (const line of lines) {
        if (!line.trim()) continue
        const startsEntry = /^\s*\d+\s+/.test(line)
        if (startsEntry) {
            if (current) {
                entries.push(parseKeyValueLine(current))
            }
            current = line.replace(/^\s*\d+\s+/, '').trim()
        } else if (current) {
            current += ` ${line.trim()}`
        }
    }

    if (current) {
        entries.push(parseKeyValueLine(current))
    }

    return entries
}
