/**
 * FortiGate Parser
 * 
 * Parses FortiGate configuration and extracts:
 * - System settings (hostname)
 * - Interfaces with zones
 * - Firewall policies
 * - VIPs (DNAT)
 * - IP pools (SNAT)
 * - Static routes
 * - VPN tunnels
 * - Management (SSH, SNMP, NTP)
 */

import type {
    ParseResult,
    ParseError,
    NormalizedConfig,
    NormalizedInterface,
    NormalizedFirewallPolicy,
    NormalizedNatRule,
    NormalizedStaticRoute,
    NormalizedVpnTunnel,
    DeviceVendor
} from '@contracts/shared'
import { BaseParser } from './base.js'

export class FortiGateParser extends BaseParser {
    vendor: DeviceVendor = 'fortigate'
    version = '1.0.0'

    canParse(rawConfig: string): boolean {
        // FortiGate configs have these markers
        const fortiMarkers = [
            /^config\s+system\s+global/mi,
            /^config\s+firewall\s+policy/mi,
            /^config\s+system\s+interface/mi,
            /^set\s+hostname\s+/mi,
            /^end\s*$/mi,
        ]

        return fortiMarkers.some(marker => marker.test(rawConfig))
    }

    async parse(rawConfig: string): Promise<ParseResult> {
        const config = this.createEmptyConfig()
        const errors: ParseError[] = []
        const warnings: string[] = []
        const lines = this.getLines(rawConfig)

        const sectionStack: string[] = []
        let currentEdit = ''
        let currentBlock: Record<string, string> = {}

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNum = i + 1

            try {
                // Skip empty lines and comments
                if (!line || line.startsWith('#')) {
                    continue
                }

                // Config section start
                if (line.startsWith('config ')) {
                    const section = line.substring(7).trim()
                    sectionStack.push(section)
                    continue
                }

                // Edit block (named subsection)
                if (line.startsWith('edit ')) {
                    currentEdit = line.substring(5).replace(/"/g, '').trim()
                    currentBlock = {}
                    continue
                }

                // Set command (key-value)
                if (line.startsWith('set ')) {
                    const match = line.match(/^set\s+(\S+)\s+(.+)$/i)
                    if (match) {
                        const key = match[1]
                        let value = match[2].replace(/"/g, '').trim()
                        currentBlock[key] = value
                    }
                    continue
                }

                // Next (end of edit block)
                if (line === 'next') {
                    const currentSection = sectionStack.join(' > ')
                    this.processBlock(config, currentSection, currentEdit, currentBlock, errors, lineNum)
                    currentEdit = ''
                    currentBlock = {}
                    continue
                }

                // End (end of config section)
                if (line === 'end') {
                    // Process any pending block
                    const currentSection = sectionStack.join(' > ')
                    if (currentEdit || Object.keys(currentBlock).length > 0) {
                        this.processBlock(config, currentSection, currentEdit || currentSection, currentBlock, errors, lineNum)
                    }
                    currentEdit = ''
                    currentBlock = {}
                    sectionStack.pop()
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
                name: 'firewall-policy',
                type: 'named',
                rules: config.security.firewallPolicies.map(policy => ({
                    action: policy.action === 'accept' ? 'permit' : 'deny',
                    source: Array.isArray(policy.srcAddr) ? policy.srcAddr.join(',') : policy.srcAddr,
                    destination: Array.isArray(policy.dstAddr) ? policy.dstAddr.join(',') : policy.dstAddr,
                    protocol: typeof policy.service === 'string' ? policy.service : 'any'
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

    private processBlock(
        config: NormalizedConfig,
        section: string,
        editName: string,
        block: Record<string, string>,
        errors: ParseError[],
        lineNum: number
    ): void {
        try {
            // System global
            if (section === 'system global') {
                if (block.hostname) {
                    config.device.hostname = block.hostname
                }
                return
            }

            // Interfaces
            if (section === 'system interface') {
                const iface = this.parseInterface(editName, block)
                if (iface) {
                    config.interfaces.push(iface)
                }
                return
            }

            // Firewall policies
            if (section === 'firewall policy') {
                const policy = this.parseFirewallPolicy(editName, block)
                if (policy) {
                    config.security.firewallPolicies.push(policy)
                }
                return
            }

            // VIPs (DNAT)
            if (section === 'firewall vip') {
                const nat = this.parseVip(editName, block)
                if (nat) {
                    config.security.natRules.push(nat)
                }
                return
            }

            // IP pools (SNAT)
            if (section === 'firewall ippool') {
                const nat = this.parseIpPool(editName, block)
                if (nat) {
                    config.security.natRules.push(nat)
                }
                return
            }

            // Static routes
            if (section === 'router static') {
                const route = this.parseStaticRoute(editName, block)
                if (route) {
                    config.routing.staticRoutes.push(route)
                }
                return
            }

            // VPN tunnels (phase1)
            if (section === 'vpn ipsec phase1-interface') {
                const tunnel = this.parseVpnPhase1(editName, block)
                if (tunnel) {
                    config.security.vpnTunnels.push(tunnel)
                }
                return
            }

            // SSH access
            if (section === 'system admin') {
                config.mgmt.ssh.enabled = true
                config.security.users = config.security.users || []
                config.security.users.push({
                    name: editName,
                    role: block.accprofile || 'admin'
                } as any)
                return
            }

            // SNMP
            if (section === 'system snmp sysinfo') {
                if (block.status !== 'disable') {
                    config.mgmt.snmp.enabled = true
                }
                return
            }

            // NTP
            if (section === 'system ntp') {
                if (block.ntpsync === 'enable' || block.server) {
                    config.mgmt.ntp.enabled = true
                    if (block.server) {
                        config.mgmt.ntp.servers.push({ address: block.server })
                    }
                }
                return
            }
            if (section.startsWith('system ntp') && section.includes('ntpserver')) {
                if (block.server) {
                    config.mgmt.ntp.enabled = true
                    config.mgmt.ntp.servers.push({ address: block.server })
                }
                return
            }

            // Syslog
            if (section === 'log syslogd setting') {
                if (block.status !== 'disable' && block.server) {
                    config.mgmt.syslog.enabled = true
                    config.mgmt.syslog.servers.push({ address: block.server })
                }
                return
            }

        } catch (error) {
            errors.push(this.createError(
                `Error processing ${section} block "${editName}": ${error instanceof Error ? error.message : 'Unknown'}`,
                lineNum
            ))
        }
    }

    private parseInterface(name: string, block: Record<string, string>): NormalizedInterface | null {
        const iface: NormalizedInterface = {
            name,
            type: this.detectFortiInterfaceType(name, block),
            adminUp: block.status !== 'down',
            ips: [],
            zone: block['forward-domain'] || undefined,
            description: block.alias || undefined,
            vlanMode: block.vlanforward === 'enable' ? 'trunk' : undefined,
        }

        // Parse IP
        if (block.ip) {
            const parts = block.ip.split(' ')
            if (parts.length >= 2) {
                const parsed = this.parseIpWithMask(parts[0], parts[1])
                if (parsed) {
                    iface.ips.push({
                        address: parsed.address,
                        prefix: parsed.prefix,
                        type: 'ipv4'
                    })
                }
            }
        }

        // VLAN ID
        if (block.vlanid) {
            iface.accessVlan = parseInt(block.vlanid, 10)
        }

        return iface
    }

    private detectFortiInterfaceType(name: string, block: Record<string, string>): NormalizedInterface['type'] {
        if (block.type === 'vlan' || block.vlanid) return 'vlan'
        if (block.type === 'tunnel' || name.includes('tunnel')) return 'tunnel'
        if (block.type === 'aggregate') return 'aggregate'
        if (block.type === 'loopback') return 'loopback'
        return 'physical'
    }

    private parseFirewallPolicy(id: string, block: Record<string, string>): NormalizedFirewallPolicy | null {
        return {
            id,
            name: block.name || block.comments || undefined,
            srcZone: block.srcintf || 'any',
            dstZone: block.dstintf || 'any',
            srcAddr: block.srcaddr || 'all',
            dstAddr: block.dstaddr || 'all',
            service: block.service || 'ALL',
            action: this.mapFortiAction(block.action),
            nat: block.nat === 'enable',
            log: block.logtraffic !== 'disable',
            enabled: block.status !== 'disable',
            schedule: block.schedule || undefined,
            comment: block.comments || undefined
        }
    }

    private mapFortiAction(action?: string): NormalizedFirewallPolicy['action'] {
        switch (action?.toLowerCase()) {
            case 'accept': return 'accept'
            case 'deny': return 'deny'
            case 'drop': return 'drop'
            default: return 'accept'
        }
    }

    private parseVip(name: string, block: Record<string, string>): NormalizedNatRule | null {
        return {
            id: name,
            name,
            type: 'dnat',
            dstAddr: block.extip || undefined,
            translatedAddr: block.mappedip || undefined,
            dstPort: block.extport || undefined,
            translatedPort: block.mappedport || undefined,
            enabled: block.status !== 'disable'
        }
    }

    private parseIpPool(name: string, block: Record<string, string>): NormalizedNatRule | null {
        let type: NormalizedNatRule['type'] = 'snat'
        if (block.type === 'overload') type = 'pat'

        return {
            id: name,
            name,
            type,
            translatedAddr: block.startip || undefined,
            enabled: true
        }
    }

    private parseStaticRoute(id: string, block: Record<string, string>): NormalizedStaticRoute | null {
        if (!block.dst) return null

        const [dest, mask] = block.dst.split(' ')
        const parsed = this.parseIpWithMask(dest, mask)
        if (!parsed) return null

        return {
            destination: parsed.address,
            prefix: parsed.prefix,
            nextHop: block.gateway || undefined,
            interface: block.device || undefined,
            metric: block.distance ? parseInt(block.distance, 10) : undefined
        }
    }

    private parseVpnPhase1(name: string, block: Record<string, string>): NormalizedVpnTunnel | null {
        const tunnel: NormalizedVpnTunnel = {
            name,
            type: 'ipsec',
            remoteEndpoint: block['remote-gw'] || undefined,
            localEndpoint: block.interface || undefined,
            phase1: {
                encryption: block.proposal ? this.parseProposalEncryption(block.proposal) : undefined,
                hash: block.proposal ? this.parseProposalHash(block.proposal) : undefined,
                dhGroup: block.dhgrp ? block.dhgrp.split(' ').map(Number) : undefined,
            }
        }

        return tunnel
    }

    private parseProposalEncryption(proposal: string): string[] {
        const encryptions: string[] = []
        if (proposal.includes('aes256')) encryptions.push('aes-256')
        if (proposal.includes('aes128')) encryptions.push('aes-128')
        if (proposal.includes('3des')) encryptions.push('3des')
        if (proposal.includes('des')) encryptions.push('des')
        return encryptions.length ? encryptions : ['aes-256']
    }

    private parseProposalHash(proposal: string): string[] {
        const hashes: string[] = []
        if (proposal.includes('sha256')) hashes.push('sha-256')
        if (proposal.includes('sha1')) hashes.push('sha-1')
        if (proposal.includes('md5')) hashes.push('md5')
        return hashes.length ? hashes : ['sha-256']
    }
}
