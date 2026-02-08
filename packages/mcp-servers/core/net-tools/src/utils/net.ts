import dns from 'dns'

export function isIpv4(value: string): boolean {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
}

export function isCidr(value: string): boolean {
    return /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(value)
}

function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function parseCidr(cidr: string): { base: number; mask: number; size: number } {
    const [ip, prefixStr] = cidr.split('/')
    const prefix = Number(prefixStr)
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
    const base = ipToInt(ip) & mask
    const size = 2 ** (32 - prefix)
    return { base, mask, size }
}

export function isIpInCidr(ip: string, cidr: string): boolean {
    const { base, mask } = parseCidr(cidr)
    return (ipToInt(ip) & mask) === base
}

export function isCidrWithinCidr(inner: string, outer: string): boolean {
    const innerParsed = parseCidr(inner)
    const outerParsed = parseCidr(outer)
    return innerParsed.base >= outerParsed.base &&
        innerParsed.base + innerParsed.size - 1 <= outerParsed.base + outerParsed.size - 1
}

export async function resolveToIp(target: string): Promise<string | null> {
    if (isIpv4(target)) return target
    try {
        const result = await dns.promises.lookup(target)
        return result.address
    } catch {
        return null
    }
}

export function countCidrHosts(target: string): number {
    if (!isCidr(target)) return 1
    const { size } = parseCidr(target)
    return size
}
