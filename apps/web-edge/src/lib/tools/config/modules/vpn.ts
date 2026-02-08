import type { ModuleDefinition } from './types'
import type { CanonicalConfig, IpsecTunnel, RiskItem, Vendor, ValidationFinding, WireguardTunnel } from '../types'

const vpnSchema = {
    title: 'VPN',
    type: 'object',
    properties: {
        ipsecTunnels: { type: 'array', items: { type: 'object', title: 'IPsec tunnel' } },
        wireguardTunnels: { type: 'array', items: { type: 'object', title: 'WireGuard tunnel' } },
        l2tpServers: { type: 'array', items: { type: 'object', title: 'L2TP server' } }
    }
} as const

const validateVpn = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []
    config.vpn.ipsecTunnels.forEach((tunnel, index) => {
        if (!tunnel.localAddress || !tunnel.remoteAddress || !tunnel.preSharedKey) {
            findings.push({
                id: `vpn.ipsec.${index}`,
                severity: 'error',
                field: `vpn.ipsecTunnels.${index}`,
                message: 'IPsec tunnel requires local address, remote address, and pre-shared key.',
                suggestion: 'Fill required IPsec parameters.'
            })
        }
        if (tunnel.remoteSubnet) {
            const hasRoute = config.routing.staticRoutes.some((route) =>
                route.destination === tunnel.remoteSubnet || `${route.destination}/${route.netmask}` === tunnel.remoteSubnet
            )
            if (!hasRoute) {
                findings.push({
                    id: `vpn.ipsec.${index}.route`,
                    severity: 'warn',
                    field: `vpn.ipsecTunnels.${index}.remoteSubnet`,
                    message: 'IPsec remote subnet is not present in static routes.',
                    suggestion: 'Add a static route for the remote subnet.'
                })
            }
        }
    })
    config.vpn.wireguardTunnels.forEach((tunnel, index) => {
        if (!tunnel.interfaceAddress) {
            findings.push({
                id: `vpn.wireguard.${index}`,
                severity: 'error',
                field: `vpn.wireguardTunnels.${index}.interfaceAddress`,
                message: 'WireGuard tunnel requires interface address.',
                suggestion: 'Provide an interface address for WireGuard.'
            })
        }
    })
    return findings
}

const riskVpn = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    config.vpn.ipsecTunnels.forEach((tunnel) => {
        if (!tunnel.preSharedKey) {
            items.push({
                id: `vpn.ipsec.psk.${tunnel.id}`,
                level: 'HIGH',
                labelKey: 'netops.generator.risk.vpnNoPsk',
                detailKey: 'netops.generator.risk.vpnNoPskDetail'
            })
        }
    })
    return items
}

const renderMikrotikIpsec = (tunnel: IpsecTunnel): string[] => {
    const commands: string[] = []
    commands.push(`/ip ipsec peer add address=${tunnel.remoteAddress} exchange-mode=${tunnel.ikeVersion === 'v1' ? 'main' : 'ike2'} secret=${tunnel.preSharedKey}`)
    if (tunnel.localSubnet && tunnel.remoteSubnet) {
        commands.push(`/ip ipsec policy add src-address=${tunnel.localSubnet} dst-address=${tunnel.remoteSubnet} sa-dst-address=${tunnel.remoteAddress} sa-src-address=${tunnel.localAddress} tunnel=yes`)
    }
    return commands
}

const renderMikrotikWireguard = (tunnel: WireguardTunnel): string[] => {
    const commands: string[] = []
    commands.push(`/interface wireguard add name=${tunnel.name} listen-port=${tunnel.listenPort || 51820} private-key=${tunnel.privateKey || '<private-key>'}`)
    commands.push(`/ip address add address=${tunnel.interfaceAddress} interface=${tunnel.name}`)
    tunnel.peers.forEach((peer) => {
        commands.push(`/interface wireguard peers add interface=${tunnel.name} public-key=${peer.publicKey} allowed-address=${peer.allowedIps} endpoint-address=${peer.endpoint || ''}`)
    })
    return commands
}

const renderCiscoIpsec = (tunnel: IpsecTunnel): string[] => {
    return [
        `crypto isakmp key ${tunnel.preSharedKey} address ${tunnel.remoteAddress}`,
        `crypto ipsec transform-set NETOPS esp-aes esp-sha-hmac`,
        `crypto map NETOPS 10 ipsec-isakmp`,
        ` set peer ${tunnel.remoteAddress}`,
        ` set transform-set NETOPS`,
        ` match address NETOPS-VPN`
    ]
}

const vpnModule: ModuleDefinition = {
    key: 'vpn',
    title: 'VPN',
    inputSchema: vpnSchema,
    validate: validateVpn,
    risk: (config) => riskVpn(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        const commands: string[] = []
        const rollback: string[] = []

        if (vendor === 'mikrotik') {
            config.vpn.ipsecTunnels.forEach((tunnel) => {
                commands.push(...renderMikrotikIpsec(tunnel))
                rollback.push('/ip ipsec peer remove [find]', '/ip ipsec policy remove [find]')
            })
            config.vpn.wireguardTunnels.forEach((tunnel) => {
                commands.push(...renderMikrotikWireguard(tunnel))
                rollback.push(`/interface wireguard remove [find name=${tunnel.name}]`)
            })
        } else {
            config.vpn.ipsecTunnels.forEach((tunnel) => {
                commands.push(...renderCiscoIpsec(tunnel))
            })
            if (config.vpn.wireguardTunnels.length > 0) {
                commands.push('! WireGuard not supported on Cisco IOS in this template.')
            }
        }

        if (commands.length === 0) {
            return { sections: [], verifyCommands: [], rollbackCommands: [] }
        }

        return {
            sections: [{ name: 'vpn', commands }],
            verifyCommands: vendor === 'mikrotik' ? ['/ip ipsec peer print'] : ['show crypto isakmp sa'],
            rollbackCommands: rollback
        }
    }
}

export default vpnModule
