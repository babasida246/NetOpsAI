type Cidr = { network: number; mask: number }

function ipToInt(ip: string): number | null {
    const parts = ip.split('.').map((part) => Number(part))
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
        return null
    }
    return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function parseCidr(input: string): Cidr | null {
    const [ip, bits] = input.split('/')
    const ipValue = ipToInt(ip)
    if (ipValue === null) return null
    const maskBits = bits ? Number(bits) : 32
    if (Number.isNaN(maskBits) || maskBits < 0 || maskBits > 32) return null
    const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0
    return { network: ipValue & mask, mask }
}

export function isAllowedTarget(target: string | undefined, allowlist: string[]): boolean {
    if (!target) return false
    if (allowlist.length === 0) return false

    const ipValue = ipToInt(target)
    for (const entry of allowlist) {
        if (entry.includes('/')) {
            const cidr = parseCidr(entry)
            if (!cidr || ipValue === null) continue
            if ((ipValue & cidr.mask) === cidr.network) {
                return true
            }
        } else if (entry === target) {
            return true
        }
    }

    return false
}
