export const normalizeMask = (value?: string) => value?.trim() || ''

export const maskToPrefix = (mask?: string): string => {
    if (!mask) return ''
    if (mask.includes('/')) return mask.split('/')[1] || ''
    const parts = mask.split('.').map((part) => Number(part))
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return ''
    const binary = parts.map((part) => part.toString(2).padStart(8, '0')).join('')
    return String(binary.split('1').length - 1)
}

export const maskFromCidr = (cidr?: string): string => {
    if (!cidr) return ''
    if (!cidr.includes('/')) return ''
    const bits = Number(cidr.split('/')[1])
    if (Number.isNaN(bits)) return ''
    const mask = bits === 0 ? 0 : 0xffffffff << (32 - bits)
    return [
        (mask >>> 24) & 255,
        (mask >>> 16) & 255,
        (mask >>> 8) & 255,
        mask & 255
    ].join('.')
}

export const pickMask = (subnet?: string, explicit?: string): string => explicit || maskFromCidr(subnet)

export const pickNetwork = (cidr?: string) => (cidr ? cidr.split('/')[0] : '')

export const toCidr = (network?: string, mask?: string): string => {
    if (!network || !mask) return ''
    const prefix = maskToPrefix(mask)
    return prefix ? `${network}/${prefix}` : ''
}

