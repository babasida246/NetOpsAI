export function parseKeyValueLine(line: string): Record<string, string> {
    const output: Record<string, string> = {}
    const parts = line.trim().split(/\s+/g)
    for (const part of parts) {
        const [key, ...rest] = part.split('=')
        if (!key || rest.length === 0) continue
        output[key] = rest.join('=')
    }
    return output
}

export function normalizeMac(value?: string | null): string | null {
    if (!value) return null
    const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
    if (cleaned.length !== 12) return null
    return cleaned.match(/.{1,2}/g)?.join(':') ?? null
}
