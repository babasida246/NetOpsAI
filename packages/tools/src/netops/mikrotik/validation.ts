import type {
    MikroTikFullConfigIntent,
    MikroTikValidationReport,
    ValidationMessage,
    MikroTikRoleTemplate
} from './types.js'
import { cidrToRange, ipInCidr, rangesOverlap } from './utils.js'

const push = (arr: ValidationMessage[], id: string, message: string, field?: string) => {
    arr.push({ id, message, field })
}

const normalizeInterfaceName = (value: string) => value.trim().toLowerCase()

export function validateIntent(intent: MikroTikFullConfigIntent): MikroTikValidationReport {
    const errors: ValidationMessage[] = []
    const warnings: ValidationMessage[] = []

    if (!intent.hostname?.trim()) {
        push(errors, 'hostname.required', 'Hostname is required.', 'hostname')
    }

    // VLAN ID duplicates
    const vlanIds = new Map<number, number>()
    for (const [index, vlan] of (intent.vlans ?? []).entries()) {
        if (vlanIds.has(vlan.id)) {
            push(errors, `vlans.duplicate.${vlan.id}`, `Duplicate VLAN ID ${vlan.id}.`, `vlans.${index}.id`)
        }
        vlanIds.set(vlan.id, index)
    }

    // Subnet overlap
    const ranges = (intent.vlans ?? [])
        .map((vlan) => ({
            id: vlan.id,
            subnet: vlan.subnet,
            range: cidrToRange(vlan.subnet)
        }))
        .filter((item) => item.range !== null) as Array<{ id: number; subnet: string; range: { start: number; end: number } }>

    for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
            if (rangesOverlap(ranges[i].range, ranges[j].range)) {
                push(
                    errors,
                    `vlans.overlap.${ranges[i].id}.${ranges[j].id}`,
                    `Subnet overlap detected between VLAN ${ranges[i].id} (${ranges[i].subnet}) and VLAN ${ranges[j].id} (${ranges[j].subnet}).`,
                    'vlans'
                )
            }
        }
    }

    // Gateway inside subnet
    for (const [index, vlan] of (intent.vlans ?? []).entries()) {
        const inSubnet = ipInCidr(vlan.gateway, vlan.subnet)
        if (inSubnet === false) {
            push(
                errors,
                `vlans.gateway.${vlan.id}`,
                `Gateway ${vlan.gateway} is not inside subnet ${vlan.subnet} for VLAN ${vlan.id}.`,
                `vlans.${index}.gateway`
            )
        } else if (inSubnet === null) {
            push(
                warnings,
                `vlans.gateway.parse.${vlan.id}`,
                `Unable to validate gateway ${vlan.gateway} against subnet ${vlan.subnet} for VLAN ${vlan.id}.`,
                `vlans.${index}`
            )
        }
    }

    // WAN interface conflicts
    const wanInterfaces = new Set(
        intent.interfaces.filter((iface) => iface.purpose === 'wan').map((iface) => normalizeInterfaceName(iface.name))
    )
    if (intent.internet?.wanInterface) {
        const normalized = normalizeInterfaceName(intent.internet.wanInterface)
        if (wanInterfaces.size > 0 && !wanInterfaces.has(normalized)) {
            push(
                warnings,
                'internet.wan.mismatch',
                'internet.wanInterface does not match any interface with purpose=wan.',
                'internet.wanInterface'
            )
        }
        if (intent.interfaces.some((iface) => iface.purpose !== 'wan' && normalizeInterfaceName(iface.name) === normalized)) {
            push(
                errors,
                'internet.wan.conflict',
                `WAN interface ${intent.internet.wanInterface} is also used as a non-WAN interface.`,
                'internet.wanInterface'
            )
        }
    }

    // Role requirements
    validateRoleRequirements(intent.role, intent, errors, warnings)

    // Mgmt subnet checks
    if (intent.management.mgmtSubnet === '0.0.0.0/0') {
        push(errors, 'management.mgmtSubnet.open', 'Management subnet must not be 0.0.0.0/0.', 'management.mgmtSubnet')
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

function validateRoleRequirements(
    role: MikroTikRoleTemplate,
    intent: MikroTikFullConfigIntent,
    errors: ValidationMessage[],
    warnings: ValidationMessage[]
) {
    const hasVlans = (intent.vlans ?? []).length > 0
    const hasInternet = Boolean(intent.internet)

    if (role === 'edge-internet') {
        if (!hasInternet) {
            push(errors, 'internet.required', 'Edge role requires internet configuration.', 'internet')
        }
        if (intent.internet?.defaultRoute === false) {
            push(warnings, 'internet.defaultRoute.off', 'Default route is disabled. Internet access may not work.', 'internet.defaultRoute')
        }
    }

    if (role === 'core-router' || role === 'distribution-l3' || role === 'access-switch-crs') {
        if (!hasVlans) {
            push(errors, 'vlans.required', 'This role requires at least one VLAN.', 'vlans')
        }
    }

    if (role === 'access-switch-crs') {
        // This role should not apply routing/NAT.
        if (intent.routing?.staticRoutes?.length) {
            push(warnings, 'routing.unused', 'Access-switch role typically does not use static routes.', 'routing.staticRoutes')
        }
        if (hasInternet) {
            push(warnings, 'internet.unused', 'Access-switch role typically does not configure internet uplink.', 'internet')
        }
    }

    if (role === 'mgmt-only') {
        if (hasVlans) {
            push(warnings, 'vlans.unused', 'mgmt-only role ignores VLAN configuration unless explicitly pushed.', 'vlans')
        }
        if (intent.routing?.staticRoutes?.length) {
            push(warnings, 'routing.unused', 'mgmt-only role ignores routing configuration.', 'routing')
        }
    }

    if ((role === 'core-router' || role === 'distribution-l3') && hasInternet && intent.securityProfile.preset === 'hospital-secure') {
        push(
            warnings,
            'security.hospital.internet',
            'Hospital-secure preset with internet enabled may require stricter WAN policies.',
            'securityProfile.preset'
        )
    }

    if (intent.management.ssh?.allowPassword) {
        push(
            warnings,
            'management.ssh.password',
            'SSH password authentication is enabled; consider using SSH keys only.',
            'management.ssh.allowPassword'
        )
    }
}

export function validateRouterOsConfig(config: string, routerOsVersion: string): MikroTikValidationReport {
    const errors: ValidationMessage[] = []
    const warnings: ValidationMessage[] = []

    const lines = config
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))

    const hasEstablished = lines.some((line) =>
        line.startsWith('/ip firewall filter add') &&
        line.includes('chain=input') &&
        line.includes('connection-state=established,related') &&
        line.includes('action=accept')
    )
    if (!hasEstablished) {
        push(errors, 'firewall.missing.established', 'Firewall input chain is missing established/related accept rule.')
    }

    const hasDropInvalid = lines.some((line) =>
        line.startsWith('/ip firewall filter add') &&
        line.includes('chain=input') &&
        line.includes('connection-state=invalid') &&
        line.includes('action=drop')
    )
    if (!hasDropInvalid) {
        push(errors, 'firewall.missing.invalid', 'Firewall input chain is missing drop invalid rule.')
    }

    const hasFinalDrop = lines.some((line) =>
        line.startsWith('/ip firewall filter add') &&
        line.includes('chain=input') &&
        line.includes('action=drop')
    )
    if (!hasFinalDrop) {
        push(warnings, 'firewall.missing.finalDrop', 'Firewall input chain has no explicit drop rule; default policies may expose services.')
    }

    const hasTelnetDisabled = lines.some((line) => line.startsWith('/ip service set telnet') && line.includes('disabled=yes'))
    if (!hasTelnetDisabled) {
        push(warnings, 'services.telnet', 'Telnet is not explicitly disabled.')
    }

    const hasDnsRemoteRequests = lines.some((line) => line.startsWith('/ip dns set') && line.includes('allow-remote-requests=yes'))
    if (hasDnsRemoteRequests) {
        const hasDnsFirewall = lines.some((line) =>
            line.startsWith('/ip firewall filter add') &&
            line.includes('chain=input') &&
            line.includes('dst-port=53')
        )
        if (!hasDnsFirewall) {
            push(
                warnings,
                'dns.remoteRequests.unprotected',
                'DNS allow-remote-requests is enabled but no firewall rule for dst-port=53 was found.'
            )
        }
    }

    // FastTrack vs QoS
    const hasFastTrack = lines.some((line) =>
        line.startsWith('/ip firewall filter add') &&
        line.includes('action=fasttrack-connection')
    )
    const hasQueueTree = lines.some((line) => line.startsWith('/queue tree add'))
    if (hasFastTrack && hasQueueTree) {
        push(
            warnings,
            'qos.fasttrack',
            'FastTrack is enabled while queue tree rules exist. This may bypass QoS.'
        )
    }

    if (!routerOsVersion.startsWith('7')) {
        push(
            warnings,
            'routeros.version',
            `RouterOS version ${routerOsVersion} may require adjustments (this generator targets RouterOS 7).`
        )
    }

    // Duplicate exact lines (usually indicates copy/paste mistakes)
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const line of lines) {
        if (seen.has(line)) duplicates.add(line)
        seen.add(line)
    }
    if (duplicates.size > 0) {
        push(
            warnings,
            'config.duplicates',
            `Config contains ${duplicates.size} duplicate command line(s).`
        )
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

