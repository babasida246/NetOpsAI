import { countCidrHosts, isCidr, isIpv4, isIpInCidr, isCidrWithinCidr, resolveToIp } from './net.js'
import type { NettoolsConfig } from './config.js'

export async function assertTargetAllowed(target: string, config: NettoolsConfig): Promise<void> {
    if (isCidr(target)) {
        const hostCount = countCidrHosts(target)
        if (hostCount > config.maxHosts) {
            throw new Error('Target CIDR exceeds max hosts limit')
        }
        const allowed = config.allowlistCidrs.some((cidr) => isCidrWithinCidr(target, cidr))
        if (!allowed) throw new Error('Target CIDR not in allowlist')
        return
    }

    if (isIpv4(target)) {
        const allowed = config.allowlistCidrs.some((cidr) => isIpInCidr(target, cidr))
        if (!allowed) throw new Error('Target IP not in allowlist')
        return
    }

    if (!config.allowHostnames) {
        throw new Error('Hostname targets are disabled')
    }

    const resolved = await resolveToIp(target)
    if (!resolved) throw new Error('Unable to resolve hostname')
    const allowed = config.allowlistCidrs.some((cidr) => isIpInCidr(resolved, cidr))
    if (!allowed) throw new Error('Resolved hostname not in allowlist')
}
