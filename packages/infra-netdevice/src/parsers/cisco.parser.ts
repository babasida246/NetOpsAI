/**
 * Cisco IOS/IOS-XE Parser
 * 
 * Parses Cisco running/startup configuration and extracts:
 * - Hostname, domain, version
 * - Interfaces with IPs, VLANs, descriptions
 * - VLANs
 * - Static routes, OSPF, BGP
 * - Access lists
 * - Management (SSH, Telnet, SNMP, NTP, Syslog)
 */

import type {
    ParseResult,
    ParseError,
    NormalizedConfig,
    NormalizedInterface,
    NormalizedVlan,
    NormalizedAcl,
    NormalizedAclRule,
    NormalizedStaticRoute,
    DeviceVendor
} from '@contracts/shared'
import { BaseParser } from './base.js'

export class CiscoParser extends BaseParser {
    vendor: DeviceVendor = 'cisco'
    version = '1.0.0'

    canParse(rawConfig: string): boolean {
        // Cisco configs typically have these markers
        const ciscoMarkers = [
            /^hostname\s+/mi,
            /^version\s+\d+\.\d+/mi,
            /^interface\s+(Ethernet|GigabitEthernet|FastEthernet|Vlan|Loopback|Tunnel)/mi,
            /^enable\s+(secret|password)/mi,
            /^line\s+(vty|con)/mi,
        ]

        return ciscoMarkers.some(marker => marker.test(rawConfig))
    }

    async parse(rawConfig: string): Promise<ParseResult> {
        const config = this.createEmptyConfig()
        const errors: ParseError[] = []
        const warnings: string[] = []
        const lines = this.getLines(rawConfig)

        let currentInterface: Partial<NormalizedInterface> | null = null
        let currentAcl: Partial<NormalizedAcl> | null = null
        let currentAclRules: NormalizedAclRule[] = []
        let currentSection = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNum = i + 1

            try {
                // Skip empty lines and comments
                if (!line || line.startsWith('!')) {
                    // End of section
                    if (currentInterface && !line) {
                        this.finalizeInterface(config, currentInterface)
                        currentInterface = null
                    }
                    continue
                }

                // Hostname
                const hostnameMatch = line.match(/^hostname\s+(.+)/i)
                if (hostnameMatch) {
                    config.device.hostname = hostnameMatch[1].trim()
                    continue
                }

                // Version
                const versionMatch = line.match(/^version\s+([\d.]+)/i)
                if (versionMatch) {
                    config.device.osVersion = versionMatch[1]
                    continue
                }

                // Domain
                const domainMatch = line.match(/^ip\s+domain[- ]name\s+(.+)/i)
                if (domainMatch) {
                    config.device.domain = domainMatch[1].trim()
                    continue
                }

                // Interface start
                const intMatch = line.match(/^interface\s+(.+)/i)
                if (intMatch) {
                    // Save previous interface
                    if (currentInterface) {
                        this.finalizeInterface(config, currentInterface)
                    }

                    currentInterface = {
                        name: intMatch[1],
                        type: this.detectInterfaceType(intMatch[1]),
                        adminUp: true, // Default up unless "shutdown"
                        ips: [],
                    }
                    currentSection = 'interface'
                    continue
                }

                // Interface properties (when in interface section)
                if (currentInterface && currentSection === 'interface') {
                    // IP address
                    const ipMatch = line.match(/^\s*ip\s+address\s+([\d.]+)\s+([\d.]+)(\s+secondary)?/i)
                    if (ipMatch) {
                        const parsed = this.parseIpWithMask(ipMatch[1], ipMatch[2])
                        if (parsed) {
                            currentInterface.ips = currentInterface.ips || []
                            currentInterface.ips.push({
                                address: parsed.address,
                                prefix: parsed.prefix,
                                type: 'ipv4',
                                secondary: !!ipMatch[3]
                            })
                        }
                        continue
                    }

                    // Description
                    const descMatch = line.match(/^\s*description\s+(.+)/i)
                    if (descMatch) {
                        currentInterface.description = descMatch[1]
                        continue
                    }

                    // Shutdown
                    if (/^\s*shutdown\s*$/i.test(line)) {
                        currentInterface.adminUp = false
                        continue
                    }

                    // Switchport mode
                    const modeMatch = line.match(/^\s*switchport\s+mode\s+(access|trunk)/i)
                    if (modeMatch) {
                        currentInterface.vlanMode = modeMatch[1].toLowerCase() as 'access' | 'trunk'
                        continue
                    }

                    // Access VLAN
                    const accessVlanMatch = line.match(/^\s*switchport\s+access\s+vlan\s+(\d+)/i)
                    if (accessVlanMatch) {
                        currentInterface.accessVlan = parseInt(accessVlanMatch[1], 10)
                        continue
                    }

                    // Trunk allowed VLANs
                    const trunkVlanMatch = line.match(/^\s*switchport\s+trunk\s+allowed\s+vlan\s+(.+)/i)
                    if (trunkVlanMatch) {
                        currentInterface.trunkVlans = this.parseVlanRange(trunkVlanMatch[1])
                        continue
                    }

                    // Native VLAN
                    const nativeVlanMatch = line.match(/^\s*switchport\s+trunk\s+native\s+vlan\s+(\d+)/i)
                    if (nativeVlanMatch) {
                        currentInterface.nativeVlan = parseInt(nativeVlanMatch[1], 10)
                        continue
                    }

                    // End of interface block (next config line starts)
                    if (!line.startsWith(' ') && !line.startsWith('\t')) {
                        this.finalizeInterface(config, currentInterface)
                        currentInterface = null
                        currentSection = ''
                    }
                }

                // VLAN database
                const vlanMatch = line.match(/^vlan\s+(\d+)/i)
                if (vlanMatch) {
                    const vlanId = parseInt(vlanMatch[1], 10)
                    let vlanName: string | undefined

                    // Look for name on next line
                    if (i + 1 < lines.length) {
                        const nameMatch = lines[i + 1].match(/^\s*name\s+(.+)/i)
                        if (nameMatch) {
                            vlanName = nameMatch[1]
                        }
                    }

                    config.vlans.push({
                        id: vlanId,
                        name: vlanName,
                        l3GatewayIps: []
                    })
                    continue
                }

                // Static routes
                const routeMatch = line.match(/^ip\s+route\s+([\d.]+)\s+([\d.]+)\s+([\d.]+|[\w/]+)/i)
                if (routeMatch) {
                    const parsed = this.parseIpWithMask(routeMatch[1], routeMatch[2])
                    if (parsed) {
                        config.routing.staticRoutes.push({
                            destination: parsed.address,
                            prefix: parsed.prefix,
                            nextHop: /^\d/.test(routeMatch[3]) ? routeMatch[3] : undefined,
                            interface: /^\d/.test(routeMatch[3]) ? undefined : routeMatch[3]
                        })
                    }
                    continue
                }

                // Access list
                const aclMatch = line.match(/^(ip\s+)?access-list\s+(standard|extended)\s+(.+)/i)
                if (aclMatch) {
                    if (currentAcl) {
                        config.security.acls.push({
                            name: currentAcl.name!,
                            type: currentAcl.type!,
                            rules: currentAclRules
                        })
                    }

                    currentAcl = {
                        name: aclMatch[3],
                        type: aclMatch[2].toLowerCase() as 'standard' | 'extended'
                    }
                    currentAclRules = []
                    currentSection = 'acl'
                    continue
                }

                // ACL rules (simplified)
                if (currentAcl && /^\s*(permit|deny)/i.test(line)) {
                    const ruleMatch = line.match(/^\s*(permit|deny)\s+(.+)/i)
                    if (ruleMatch) {
                        currentAclRules.push(this.parseAclRule(ruleMatch[1], ruleMatch[2]))
                    }
                    continue
                }

                // Local users
                const userMatch = line.match(/^username\s+(\S+)\s+privilege\s+(\d+)/i)
                if (userMatch) {
                    config.security.users = config.security.users || []
                    config.security.users.push({
                        name: userMatch[1],
                        privilege: parseInt(userMatch[2], 10)
                    } as any)
                    continue
                }

                // SSH
                if (/^ip\s+ssh\s+version\s+(\d)/i.test(line)) {
                    config.mgmt.ssh.enabled = true
                    const verMatch = line.match(/version\s+(\d)/i)
                    if (verMatch) {
                        config.mgmt.ssh.version = parseInt(verMatch[1], 10)
                    }
                    continue
                }

                // Telnet
                if (/^line\s+vty/i.test(line)) {
                    // Check transport input on next lines
                    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                        if (/transport\s+input\s+.*telnet/i.test(lines[j])) {
                            config.mgmt.telnet.enabled = true
                        }
                        if (/transport\s+input\s+.*ssh/i.test(lines[j])) {
                            config.mgmt.ssh.enabled = true
                        }
                        if (!lines[j].startsWith(' ')) break
                    }
                    continue
                }

                // SNMP
                const snmpMatch = line.match(/^snmp-server\s+community\s+(\S+)/i)
                if (snmpMatch) {
                    config.mgmt.snmp.enabled = true
                    config.mgmt.snmp.communities = config.mgmt.snmp.communities || []
                    // Store presence but NOT the actual community string
                    config.mgmt.snmp.communities.push('***PRESENT***')
                    continue
                }

                // Syslog
                const syslogMatch = line.match(/^logging\s+(host\s+)?([\d.]+)/i)
                if (syslogMatch) {
                    config.mgmt.syslog.enabled = true
                    config.mgmt.syslog.servers.push({
                        address: syslogMatch[2]
                    })
                    continue
                }

                // NTP
                const ntpMatch = line.match(/^ntp\s+server\s+([\d.]+)/i)
                if (ntpMatch) {
                    config.mgmt.ntp.enabled = true
                    config.mgmt.ntp.servers.push({
                        address: ntpMatch[1],
                        prefer: /prefer/i.test(line)
                    })
                    continue
                }

            } catch (error) {
                errors.push(this.createError(
                    `Parse error at line ${lineNum}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    lineNum
                ))
            }
        }

        // Finalize any pending sections
        if (currentInterface) {
            this.finalizeInterface(config, currentInterface)
        }
        if (currentAcl) {
            config.security.acls.push({
                name: currentAcl.name!,
                type: currentAcl.type!,
                rules: currentAclRules
            })
        }

        // Update metadata
        config.metadata.rawLineCount = lines.length
        config.metadata.warnings = warnings
        this.finalizeForTests(config)

        return {
            normalized: config,
            errors,
            warnings,
            rawLineCount: lines.length
        }
    }

    private detectInterfaceType(name: string): NormalizedInterface['type'] {
        const lower = name.toLowerCase()
        if (lower.startsWith('vlan')) return 'vlan'
        if (lower.startsWith('loopback')) return 'loopback'
        if (lower.startsWith('tunnel')) return 'tunnel'
        if (lower.startsWith('port-channel')) return 'aggregate'
        return 'physical'
    }

    private finalizeInterface(config: NormalizedConfig, iface: Partial<NormalizedInterface>): void {
        if (!iface.name) return

        config.interfaces.push({
            name: iface.name,
            type: iface.type || 'physical',
            adminUp: iface.adminUp ?? true,
            ips: iface.ips || [],
            vlanMode: iface.vlanMode,
            accessVlan: iface.accessVlan,
            trunkVlans: iface.trunkVlans,
            nativeVlan: iface.nativeVlan,
            description: iface.description,
        })
    }

    private parseAclRule(action: string, rest: string): NormalizedAclRule {
        const parts = rest.trim().split(/\s+/)
        const rule: NormalizedAclRule = {
            action: action.toLowerCase() as 'permit' | 'deny',
            source: 'any',
            destination: 'any'
        }

        // Very simplified ACL parsing
        if (parts.length > 0) {
            if (parts[0] !== 'ip') {
                rule.protocol = parts[0]
                parts.shift()
            }
            if (parts.length > 0) rule.source = parts[0]
            if (parts.length > 1) rule.destination = parts[1]
        }

        if (rest.toLowerCase().includes('log')) {
            rule.log = true
        }

        return rule
    }
}
