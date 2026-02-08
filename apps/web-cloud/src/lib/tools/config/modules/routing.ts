import type { ModuleDefinition } from './types'
import type { CanonicalConfig, RiskItem, ValidationFinding, Vendor } from '../types'
import { maskFromCidr } from '../utils'

const routingSchema = {
    title: 'Routing',
    type: 'object',
    properties: {
        staticRoutes: { type: 'array', items: { type: 'object', title: 'Static route' } },
        ospf: { type: 'object', title: 'OSPF' },
        bgp: { type: 'object', title: 'BGP' },
        rip: { type: 'object', title: 'RIP' }
    }
} as const

const validateRouting = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []

    config.routing.staticRoutes.forEach((route, index) => {
        if (!route.destination || !route.nextHop) {
            findings.push({
                id: `routing.static.${index}`,
                severity: 'error',
                field: `routing.staticRoutes.${index}`,
                message: 'Static route requires destination and next hop.',
                suggestion: 'Provide destination and next hop for each route.'
            })
        }
    })

    if (config.routing.ospf.enabled) {
        if (config.routing.ospf.areas.length === 0) {
            findings.push({
                id: 'routing.ospf.areas',
                severity: 'error',
                field: 'routing.ospf.areas',
                message: 'OSPF enabled without any areas.',
                suggestion: 'Add at least one OSPF area and network.'
            })
        }
    }

    if (config.routing.bgp.enabled) {
        if (!config.routing.bgp.localAs) {
            findings.push({
                id: 'routing.bgp.localAs',
                severity: 'error',
                field: 'routing.bgp.localAs',
                message: 'BGP enabled without local AS.',
                suggestion: 'Set local AS before enabling BGP.'
            })
        }
        if (config.routing.bgp.neighbors.length === 0) {
            findings.push({
                id: 'routing.bgp.neighbors',
                severity: 'error',
                field: 'routing.bgp.neighbors',
                message: 'BGP enabled without neighbors.',
                suggestion: 'Add at least one BGP neighbor.'
            })
        }
        if (config.firewall.rules.length > 0) {
            const allowsBgp = config.firewall.rules.some((rule) => {
                const protocolOk = !rule.protocol || rule.protocol === 'any' || rule.protocol === 'tcp'
                const portOk = rule.dstPort === '179'
                return rule.action === 'accept' && protocolOk && portOk
            })
            if (!allowsBgp) {
                findings.push({
                    id: 'routing.bgp.firewall',
                    severity: 'warn',
                    field: 'firewall.rules',
                    message: 'BGP enabled but firewall has no TCP/179 allow rule.',
                    suggestion: 'Add firewall rule to permit BGP sessions.'
                })
            }
        }
    }

    return findings
}

const riskRouting = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    if (config.routing.bgp.enabled) {
        items.push({
            id: 'routing.bgp.enabled',
            level: 'MEDIUM',
            labelKey: 'netops.generator.risk.bgpEnabled',
            detailKey: 'netops.generator.risk.bgpEnabledDetail'
        })
    }
    if (config.routing.ospf.enabled && config.routing.ospf.areas.length > 3) {
        items.push({
            id: 'routing.ospf.large',
            level: 'MEDIUM',
            labelKey: 'netops.generator.risk.ospfLarge',
            detailKey: 'netops.generator.risk.ospfLargeDetail'
        })
    }
    return items
}

const renderStaticRoutes = (config: CanonicalConfig, vendor: Vendor) => {
    const commands: string[] = []
    const rollback: string[] = []

    for (const route of config.routing.staticRoutes) {
        if (!route.destination || !route.nextHop) continue
        if (vendor === 'mikrotik') {
            const dst = route.netmask ? `${route.destination}/${route.netmask}` : route.destination
            commands.push(`/ip route add dst-address=${dst} gateway=${route.nextHop}`)
            rollback.push(`/ip route remove [find dst-address~"${route.destination}"]`)
        } else {
            const mask = route.netmask || '255.255.255.0'
            commands.push(`ip route ${route.destination} ${mask} ${route.nextHop}`)
            rollback.push(`no ip route ${route.destination} ${mask} ${route.nextHop}`)
        }
    }

    return { commands, rollback }
}

const renderOspf = (config: CanonicalConfig, vendor: Vendor) => {
    const commands: string[] = []
    const rollback: string[] = []

    if (!config.routing.ospf.enabled) return { commands, rollback }

    if (vendor === 'mikrotik') {
        if (config.routing.ospf.routerId) {
            commands.push(`/routing ospf instance set [find default=yes] router-id=${config.routing.ospf.routerId}`)
        }
        config.routing.ospf.areas.forEach((area) => {
            commands.push(`/routing ospf area add name=area-${area.area} area-id=${area.area}`)
            area.networks.forEach((network) => {
                commands.push(`/routing ospf interface-template add networks=${network} area=area-${area.area}`)
            })
            rollback.push(`/routing ospf area remove [find area-id=${area.area}]`)
        })
    } else {
        commands.push('router ospf 1')
        if (config.routing.ospf.routerId) {
            commands.push(` router-id ${config.routing.ospf.routerId}`)
        }
        config.routing.ospf.areas.forEach((area) => {
            area.networks.forEach((network) => {
                const mask = maskFromCidr(network)
                const ip = network.split('/')[0]
                const wildcard = mask
                    ? mask
                          .split('.')
                          .map((octet) => 255 - Number(octet))
                          .join('.')
                    : '0.0.0.0'
                commands.push(` network ${ip} ${wildcard} area ${area.area}`)
            })
        })
        rollback.push('no router ospf 1')
    }

    return { commands, rollback }
}

const renderBgp = (config: CanonicalConfig, vendor: Vendor) => {
    const commands: string[] = []
    const rollback: string[] = []

    if (!config.routing.bgp.enabled || !config.routing.bgp.localAs) return { commands, rollback }

    if (vendor === 'mikrotik') {
        commands.push(`/routing bgp instance set default as=${config.routing.bgp.localAs}`)
        if (config.routing.bgp.routerId) {
            commands.push(`/routing bgp instance set default router-id=${config.routing.bgp.routerId}`)
        }
        config.routing.bgp.neighbors.forEach((neighbor) => {
            commands.push(`/routing bgp peer add remote-address=${neighbor.neighbor} remote-as=${neighbor.remoteAs}`)
            rollback.push(`/routing bgp peer remove [find remote-address=${neighbor.neighbor}]`)
        })
    } else {
        commands.push(`router bgp ${config.routing.bgp.localAs}`)
        if (config.routing.bgp.routerId) {
            commands.push(` bgp router-id ${config.routing.bgp.routerId}`)
        }
        config.routing.bgp.neighbors.forEach((neighbor) => {
            commands.push(` neighbor ${neighbor.neighbor} remote-as ${neighbor.remoteAs}`)
        })
        config.routing.bgp.networks.forEach((network) => {
            commands.push(` network ${network.network}`)
        })
        rollback.push(`no router bgp ${config.routing.bgp.localAs}`)
    }

    return { commands, rollback }
}

const renderRip = (config: CanonicalConfig, vendor: Vendor) => {
    const commands: string[] = []
    const rollback: string[] = []

    if (!config.routing.rip.enabled) return { commands, rollback }

    if (vendor === 'mikrotik') {
        commands.push('/routing rip set enabled=yes')
        config.routing.rip.networks.forEach((network) => {
            commands.push(`/routing rip interface-template add networks=${network}`)
        })
        rollback.push('/routing rip set enabled=no')
    } else {
        commands.push('router rip')
        commands.push(` version ${config.routing.rip.version}`)
        config.routing.rip.networks.forEach((network) => {
            commands.push(` network ${network}`)
        })
        rollback.push('no router rip')
    }

    return { commands, rollback }
}

const routingModule: ModuleDefinition = {
    key: 'routing',
    title: 'Routing',
    inputSchema: routingSchema,
    validate: validateRouting,
    risk: (config) => riskRouting(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        const sections = []
        const verifyCommands: string[] = []
        const rollbackCommands: string[] = []

        const staticOutput = renderStaticRoutes(config, vendor)
        if (staticOutput.commands.length > 0) {
            sections.push({ name: 'routing-static', commands: staticOutput.commands })
            rollbackCommands.push(...staticOutput.rollback)
            verifyCommands.push(vendor === 'mikrotik' ? '/ip route print' : 'show ip route')
        }

        const ospfOutput = renderOspf(config, vendor)
        if (ospfOutput.commands.length > 0) {
            sections.push({ name: 'routing-ospf', commands: ospfOutput.commands })
            rollbackCommands.push(...ospfOutput.rollback)
            verifyCommands.push(vendor === 'mikrotik' ? '/routing ospf neighbor print' : 'show ip ospf neighbor')
        }

        const bgpOutput = renderBgp(config, vendor)
        if (bgpOutput.commands.length > 0) {
            sections.push({ name: 'routing-bgp', commands: bgpOutput.commands })
            rollbackCommands.push(...bgpOutput.rollback)
            verifyCommands.push(vendor === 'mikrotik' ? '/routing bgp peer print' : 'show ip bgp summary')
        }

        const ripOutput = renderRip(config, vendor)
        if (ripOutput.commands.length > 0) {
            sections.push({ name: 'routing-rip', commands: ripOutput.commands })
            rollbackCommands.push(...ripOutput.rollback)
            verifyCommands.push(vendor === 'mikrotik' ? '/routing rip print' : 'show ip rip')
        }

        return { sections, verifyCommands, rollbackCommands }
    }
}

export default routingModule
