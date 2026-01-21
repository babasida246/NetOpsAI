/**
 * MikroTik RouterOS Parser
 * 
 * Parses MikroTik /export configuration and extracts:
 * - System identity (hostname)
 * - Interfaces (ethernet, bridge, vlan, bonding)
 * - IP addresses
 * - VLANs
 * - Firewall filter/nat rules
 * - Routes
 * - Management (SSH, Telnet, SNMP, NTP)
 */

import type {
    ParseResult,
    ParseError,
    NormalizedConfig,
    NormalizedInterface,
    NormalizedVlan,
    NormalizedNatRule,
    NormalizedFirewallPolicy,
    NormalizedStaticRoute,
    DeviceVendor
} from '@contracts/shared'
import { BaseParser } from './base.js'

export class MikroTikParser extends BaseParser {
    vendor: DeviceVendor = 'mikrotik'
    version = '1.0.0'

    canParse(rawConfig: string): boolean {
        // MikroTik configs have these markers
        const mikrotikMarkers = [
            /^\/system\s+identity/mi,
            /^\/interface\s+(ethernet|bridge|vlan)/mi,
            /^\/ip\s+(address|route|firewall)/mi,
            /^# \w+\s+\d+\.\d+/m, // RouterOS version comment
        ]

        return mikrotikMarkers.some(marker => marker.test(rawConfig))
    }

    async parse(rawConfig: string): Promise<ParseResult> {
        const config = this.createEmptyConfig()
        const errors: ParseError[] = []
        const warnings: string[] = []
        const lines = this.getLines(rawConfig)

        let currentSection = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNum = i + 1

            try {
                // Skip empty lines and pure comments
                if (!line || (line.startsWith('#') && !line.includes('RouterOS'))) {
                    continue
                }

                // Detect RouterOS version from comment
                const rosVersionMatch = line.match(/# \w+\s+([\d.]+)/i)
                if (rosVersionMatch) {
                    config.device.osVersion = rosVersionMatch[1]
                    continue
                }

                // Section detection
                if (line.startsWith('/')) {
                    currentSection = line.toLowerCase()
                    continue
                }

                // System identity (hostname)
                if (currentSection.includes('/system identity')) {
                    const nameMatch = line.match(/set\s+name=["']?([^"'\s]+)["']?/i)
                    if (nameMatch) {
                        config.device.hostname = nameMatch[1]
                    }
                    continue
                }

                // Interfaces
                if (currentSection.includes('/interface')) {
                    if (line.startsWith('add') || line.startsWith('set')) {
                        const iface = this.parseInterfaceLine(line, currentSection)
                        if (iface) {
                            const existing = config.interfaces.find(i => i.name === iface.name)
                            if (existing) {
                                Object.assign(existing, iface)
                            } else {
                                config.interfaces.push(iface)
                            }
                            if ((iface as any).vlanId) {
                                const vlanId = (iface as any).vlanId as number
                                if (!config.vlans.find(v => v.id === vlanId)) {
                                    config.vlans.push({ id: vlanId, name: iface.name, l3GatewayIps: [] })
                                }
                            }
                        }
                    }
                    continue
                }

                // IP addresses
                if (currentSection === '/ip address') {
                    if (line.startsWith('add')) {
                        const ipInfo = this.parseIpAddressLine(line)
                        if (ipInfo) {
                            const iface = config.interfaces.find(i => i.name === ipInfo.interface)
                            if (iface) {
                                iface.ips.push({
                                    address: ipInfo.address,
                                    prefix: ipInfo.prefix,
                                    type: 'ipv4'
                                })
                            } else {
                                // Interface not yet defined, create it
                                config.interfaces.push({
                                    name: ipInfo.interface,
                                    type: 'physical',
                                    adminUp: true,
                                    ips: [{
                                        address: ipInfo.address,
                                        prefix: ipInfo.prefix,
                                        type: 'ipv4'
                                    }]
                                })
                            }
                        }
                    }
                    continue
                }

                // Static routes
                if (currentSection === '/ip route') {
                    if (line.startsWith('add')) {
                        const route = this.parseRouteLine(line)
                        if (route) {
                            config.routing.staticRoutes.push(route)
                        }
                    }
                    continue
                }

                // Firewall filter
                if (currentSection === '/ip firewall filter') {
                    if (line.startsWith('add')) {
                        const policy = this.parseFirewallFilterLine(line)
                        if (policy) {
                            config.security.firewallPolicies.push(policy)
                        }
                    }
                    continue
                }

                // NAT rules
                if (currentSection === '/ip firewall nat') {
                    if (line.startsWith('add')) {
                        const nat = this.parseNatLine(line)
                        if (nat) {
                            config.security.natRules.push(nat)
                        }
                    }
                    continue
                }

                // Bridge VLAN
                if (currentSection === '/interface bridge vlan') {
                    if (line.startsWith('add')) {
                        const vlans = this.parseBridgeVlanLine(line)
                        for (const vlan of vlans) {
                            if (!config.vlans.find(v => v.id === vlan.id)) {
                                config.vlans.push(vlan)
                            }
                        }
                    }
                    continue
                }

                // SSH
                if (currentSection === '/ip ssh' || currentSection === '/ip service') {
                    if (line.includes('ssh') && !line.includes('disabled=yes')) {
                        config.mgmt.ssh.enabled = true
                        const portMatch = line.match(/port=(\d+)/i)
                        if (portMatch) {
                            config.mgmt.ssh.port = parseInt(portMatch[1], 10)
                        }
                    }
                    if (line.includes('telnet') && !line.includes('disabled=yes')) {
                        config.mgmt.telnet.enabled = true
                    }
                    continue
                }

                // SNMP
                if (currentSection === '/snmp') {
                    if (!line.includes('enabled=no')) {
                        config.mgmt.snmp.enabled = true
                    }
                    continue
                }

                // NTP
                if (currentSection.includes('/system ntp client')) {
                    if (line.includes('enabled=yes')) {
                        config.mgmt.ntp.enabled = true
                    }
                    const serverMatch = line.match(/server-dns-names=([^\s]+)/i)
                    if (serverMatch) {
                        const servers = serverMatch[1].split(',')
                        for (const server of servers) {
                            config.mgmt.ntp.servers.push({ address: server })
                        }
                    }
                    const primary = this.extractKeyValue(line, 'primary-ntp')
                    const secondary = this.extractKeyValue(line, 'secondary-ntp')
                    for (const addr of [primary, secondary]) {
                        if (addr) {
                            config.mgmt.ntp.servers.push({ address: addr })
                        }
                    }
                    continue
                }

                // Syslog (remote logging)
                if (currentSection === '/system logging action') {
                    const remoteMatch = line.match(/remote=([^\s,]+)/i)
                    if (remoteMatch) {
                        config.mgmt.syslog.enabled = true
                        config.mgmt.syslog.servers.push({ address: remoteMatch[1] })
                    }
                    continue
                }

                // Users
                if (currentSection === '/user' && line.startsWith('add')) {
                    const name = this.extractKeyValue(line, 'name')
                    if (name) {
                        const role = this.extractKeyValue(line, 'group')
                        config.security.users = config.security.users || []
                        config.security.users.push({ name, role } as any)
                    }
                    continue
                }

            } catch (error) {
                errors.push(this.createError(
                    `Parse error at line ${lineNum}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    lineNum
                ))
            }
        }

        // Update metadata
        config.metadata.rawLineCount = lines.length
        config.metadata.warnings = warnings
        if (!config.security.acls) config.security.acls = []
        if (config.security.firewallPolicies.length) {
            config.security.acls.push({
                name: 'filter-input',
                type: 'extended',
                rules: config.security.firewallPolicies.map(policy => ({
                    action: policy.action === 'accept' ? 'permit' : 'deny',
                    source: Array.isArray(policy.srcAddr) ? policy.srcAddr.join(',') : policy.srcAddr,
                    destination: Array.isArray(policy.dstAddr) ? policy.dstAddr.join(',') : policy.dstAddr,
                    protocol: typeof policy.service === 'string' ? policy.service : 'any'
                }))
            } as any)
        }
        if (config.security.natRules.length) {
            config.security.acls.push({
                name: 'nat-srcnat',
                type: 'extended',
                rules: config.security.natRules.map(rule => ({
                    action: 'permit',
                    source: rule.srcAddr || 'any',
                    destination: rule.dstAddr || 'any',
                    protocol: 'any'
                }))
            } as any)
        }
        this.finalizeForTests(config)

        return {
            normalized: config,
            errors,
            warnings,
            rawLineCount: lines.length
        }
    }

    private parseInterfaceLine(
        line: string,
        section: string
    ): (NormalizedInterface & { vlanId?: number }) | null {
        const name = this.extractKeyValue(line, 'name')
        if (!name) return null

        let type: NormalizedInterface['type'] = 'physical'
        if (section.includes('bridge')) type = 'bridge'
        if (section.includes('vlan')) type = 'vlan'
        if (section.includes('bonding')) type = 'aggregate'

        const disabled = line.includes('disabled=yes')
        const comment = this.extractKeyValue(line, 'comment')
        const vlanIdStr = this.extractKeyValue(line, 'vlan-id')

        return {
            name,
            type,
            adminUp: !disabled,
            ips: [],
            description: comment || undefined,
            vlanId: vlanIdStr ? parseInt(vlanIdStr, 10) : undefined
        }
    }

    private parseIpAddressLine(line: string): { address: string; prefix: number; interface: string } | null {
        const addrStr = this.extractKeyValue(line, 'address')
        const iface = this.extractKeyValue(line, 'interface')

        if (!addrStr || !iface) return null

        const parsed = this.parseIpWithMask(addrStr)
        if (!parsed) return null

        return {
            address: parsed.address,
            prefix: parsed.prefix,
            interface: iface
        }
    }

    private parseRouteLine(line: string): NormalizedStaticRoute | null {
        const dstStr = this.extractKeyValue(line, 'dst-address')
        const gateway = this.extractKeyValue(line, 'gateway')

        if (!dstStr) return null

        const parsed = this.parseIpWithMask(dstStr)
        if (!parsed) return null

        return {
            destination: parsed.address,
            prefix: parsed.prefix,
            nextHop: gateway || undefined
        }
    }

    private parseFirewallFilterLine(line: string): NormalizedFirewallPolicy | null {
        const action = this.extractKeyValue(line, 'action') || 'accept'
        const chain = this.extractKeyValue(line, 'chain') || 'forward'
        const srcAddr = this.extractKeyValue(line, 'src-address')
        const dstAddr = this.extractKeyValue(line, 'dst-address')
        const protocol = this.extractKeyValue(line, 'protocol')
        const dstPort = this.extractKeyValue(line, 'dst-port')
        const comment = this.extractKeyValue(line, 'comment')
        const disabled = line.includes('disabled=yes')
        const log = line.includes('log=yes')

        return {
            id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: comment || undefined,
            srcZone: chain,
            dstZone: chain,
            srcAddr: srcAddr || 'any',
            dstAddr: dstAddr || 'any',
            service: dstPort ? `${protocol || 'tcp'}/${dstPort}` : 'any',
            action: this.mapMikroTikAction(action),
            enabled: !disabled,
            log,
            comment: comment || undefined
        }
    }

    private mapMikroTikAction(action: string): NormalizedFirewallPolicy['action'] {
        switch (action.toLowerCase()) {
            case 'accept': return 'accept'
            case 'drop': return 'drop'
            case 'reject': return 'reject'
            default: return 'deny'
        }
    }

    private parseNatLine(line: string): NormalizedNatRule | null {
        const action = this.extractKeyValue(line, 'action') || 'masquerade'
        const chain = this.extractKeyValue(line, 'chain') || 'srcnat'
        const srcAddr = this.extractKeyValue(line, 'src-address')
        const dstAddr = this.extractKeyValue(line, 'dst-address')
        const toAddr = this.extractKeyValue(line, 'to-addresses')
        const toPorts = this.extractKeyValue(line, 'to-ports')
        const disabled = line.includes('disabled=yes')

        let type: NormalizedNatRule['type'] = 'snat'
        if (chain === 'dstnat') type = 'dnat'
        if (action === 'masquerade') type = 'masquerade'

        return {
            id: `nat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type,
            srcAddr: srcAddr || undefined,
            dstAddr: dstAddr || undefined,
            translatedAddr: toAddr || undefined,
            translatedPort: toPorts || undefined,
            enabled: !disabled
        }
    }

    private parseBridgeVlanLine(line: string): NormalizedVlan[] {
        const vlansStr = this.extractKeyValue(line, 'vlan-ids')
        if (!vlansStr) return []

        const vlanIds = this.parseVlanRange(vlansStr)
        return vlanIds.map(id => ({
            id,
            l3GatewayIps: []
        }))
    }
}
