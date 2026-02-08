type IpRange = { start: number; end: number }

const toOctet = (value: string): number | null => {
    // Regex literal: use a single backslash for \d
    if (!/^(?:0|[1-9]\d{0,2})$/.test(value)) return null
    const num = Number(value)
    if (Number.isNaN(num) || num < 0 || num > 255) return null
    return num
}

export function ipToInt(ip: string): number | null {
    const parts = ip.split('.')
    if (parts.length !== 4) return null
    const octets = parts.map(toOctet)
    if (octets.some((octet) => octet === null)) return null
    return ((octets[0]! << 24) >>> 0) + (octets[1]! << 16) + (octets[2]! << 8) + octets[3]!
}

export function intToIp(value: number): string {
    return [
        (value >>> 24) & 255,
        (value >>> 16) & 255,
        (value >>> 8) & 255,
        value & 255
    ].join('.')
}

export function parseCidr(cidr: string): { ip: string; prefix: number } | null {
    const [ip, prefixRaw] = cidr.split('/')
    if (!ip || prefixRaw === undefined) return null
    const prefix = Number(prefixRaw)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null
    if (ipToInt(ip) === null) return null
    return { ip, prefix }
}

export function cidrToRange(cidr: string): IpRange | null {
    const parsed = parseCidr(cidr)
    if (!parsed) return null
    const base = ipToInt(parsed.ip)
    if (base === null) return null
    const mask = parsed.prefix === 0 ? 0 : (0xffffffff << (32 - parsed.prefix)) >>> 0
    const start = base & mask
    const size = parsed.prefix === 32 ? 1 : 2 ** (32 - parsed.prefix)
    const end = start + size - 1
    return { start, end }
}

export function rangesOverlap(a: IpRange, b: IpRange): boolean {
    return a.start <= b.end && b.start <= a.end
}

export function ipInCidr(ip: string, cidr: string): boolean | null {
    const range = cidrToRange(cidr)
    const target = ipToInt(ip)
    if (!range || target === null) return null
    return target >= range.start && target <= range.end
}

export function calcDhcpPool(cidr: string): { poolStart: string; poolEnd: string } | null {
    const range = cidrToRange(cidr)
    if (!range) return null

    // Avoid network and broadcast addresses for typical IPv4 subnets.
    const start = range.start + 10
    const end = range.end - 10

    if (start >= end) {
        return null
    }

    // For /24 or larger, use a human-friendly default range.
    const parsed = parseCidr(cidr)
    if (parsed && parsed.prefix <= 24) {
        const network = intToIp(range.start)
        const [a, b, c] = network.split('.')
        if (a && b && c) {
            return {
                poolStart: `${a}.${b}.${c}.100`,
                poolEnd: `${a}.${b}.${c}.200`
            }
        }
    }

    return {
        poolStart: intToIp(start),
        poolEnd: intToIp(end)
    }
}

export function escapeRouterOsComment(value: string): string {
    return value.replace(/"/g, "'").trim()
}

export function formatSection(title: string, lines: string[]): string {
    const trimmed = lines.filter((line) => line.trim().length > 0)
    if (trimmed.length === 0) return ''
    return [`### ${title}`, ...trimmed, ''].join('\n')
}

export function uniqLines(lines: string[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const line of lines) {
        if (seen.has(line)) continue
        seen.add(line)
        out.push(line)
    }
    return out
}
