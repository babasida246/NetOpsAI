/**
 * Base Parser Interface and Utilities
 */

import type {
    IVendorParser,
    ParseResult,
    ParseError,
    NormalizedConfig,
    DeviceVendor,
    NormalizedInterface,
    NormalizedVlan,
    NormalizedStaticRoute,
    NormalizedAcl,
    NormalizedFirewallPolicy,
    NormalizedNatRule
} from '@contracts/shared'

export abstract class BaseParser implements IVendorParser {
    abstract vendor: DeviceVendor
    abstract version: string

    abstract parse(rawConfig: string): Promise<ParseResult>
    abstract canParse(rawConfig: string): boolean

    /**
     * Create empty normalized config structure
     */
    protected createEmptyConfig(): NormalizedConfig {
        return {
            schemaVersion: '1.0.0',
            device: {
                vendor: this.vendor,
                hostname: 'unknown',
            },
            interfaces: [],
            vlans: [],
            routing: {
                staticRoutes: [],
            },
            security: {
                acls: [],
                firewallPolicies: [],
                natRules: [],
                vpnTunnels: [],
            },
            mgmt: {
                ssh: { enabled: false },
                telnet: { enabled: false },
                snmp: { enabled: false },
                syslog: { enabled: false, servers: [] },
                ntp: { enabled: false, servers: [] },
                aaa: {},
            },
            metadata: {
                extractedAt: new Date(),
                parserVersion: this.version,
                vendor: this.vendor,
                warnings: [],
            },
        }
    }

    /**
     * Parse IP address with prefix (e.g., "192.168.1.1/24" or "192.168.1.1 255.255.255.0")
     */
    protected parseIpWithMask(ip: string, mask?: string): { address: string; prefix: number } | null {
        // CIDR notation
        if (ip.includes('/')) {
            const [address, prefix] = ip.split('/')
            return { address, prefix: parseInt(prefix, 10) }
        }

        // Dotted mask
        if (mask) {
            const prefix = this.maskToPrefix(mask)
            return { address: ip, prefix }
        }

        // Assume /32 for host
        return { address: ip, prefix: 32 }
    }

    /**
     * Convert dotted netmask to prefix length
     */
    protected maskToPrefix(mask: string): number {
        const parts = mask.split('.').map(Number)
        let bits = 0
        for (const part of parts) {
            bits += (part >>> 0).toString(2).split('1').length - 1
        }
        return bits
    }

    /**
     * Convert prefix length to dotted netmask
     */
    protected prefixToMask(prefix: number): string {
        const mask = ~((1 << (32 - prefix)) - 1) >>> 0
        return [
            (mask >>> 24) & 255,
            (mask >>> 16) & 255,
            (mask >>> 8) & 255,
            mask & 255,
        ].join('.')
    }

    /**
     * Parse VLAN range (e.g., "1-10,20,30-35")
     */
    protected parseVlanRange(range: string): number[] {
        const vlans: number[] = []
        const parts = range.split(',')

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10))
                for (let i = start; i <= end; i++) {
                    vlans.push(i)
                }
            } else {
                const vlan = parseInt(part.trim(), 10)
                if (!isNaN(vlan)) {
                    vlans.push(vlan)
                }
            }
        }

        return vlans
    }

    /**
     * Extract value from "key value" or "key=value" format
     */
    protected extractKeyValue(line: string, key: string): string | null {
        const patterns = [
            new RegExp(`${key}\\s+([^\\s]+)`, 'i'),
            new RegExp(`${key}=([^\\s]+)`, 'i'),
            new RegExp(`${key}\\s+"([^"]+)"`, 'i'),
            new RegExp(`${key}="([^"]+)"`, 'i'),
        ]

        for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match) {
                return match[1]
            }
        }

        return null
    }

    /**
     * Check if line matches any pattern
     */
    protected lineMatches(line: string, patterns: (string | RegExp)[]): boolean {
        for (const pattern of patterns) {
            if (typeof pattern === 'string') {
                if (line.toLowerCase().includes(pattern.toLowerCase())) {
                    return true
                }
            } else {
                if (pattern.test(line)) {
                    return true
                }
            }
        }
        return false
    }

    /**
     * Safely get lines from config
     */
    protected getLines(rawConfig: string): string[] {
        return rawConfig.split('\n').map(line => line.trim())
    }

    /**
     * Create parse error
     */
    protected createError(message: string, line?: number, severity: 'error' | 'warning' = 'warning'): ParseError {
        return { message, line, severity }
    }

    /**
     * Add compatibility fields expected by tests/consumers
     */
    protected finalizeForTests(config: any): void {
        config.routing = config.routing || {}
        const staticRoutes = config.routing.staticRoutes || []
        config.routing.static = staticRoutes.map((r: any) => ({
            network: r.prefix ? `${r.destination}/${r.prefix}` : r.destination,
            nextHop: r.nextHop,
            interface: r.interface
        }))

        config.security = config.security || {}
        config.security.acls = (config.security.acls || []).map((acl: any) => ({
            ...acl,
            entries: acl.entries || acl.rules || []
        }))
        if (!config.security.users) {
            config.security.users = []
        }

        config.interfaces = (config.interfaces || []).map((iface: any) => ({
            ...iface,
            mode: iface.vlanMode || iface.mode,
            ipv4: iface.ips?.find((ip: any) => ip.type === 'ipv4')?.address || iface.ipv4
        }))

        if (config.mgmt?.ntp?.servers) {
            config.mgmt.ntp.servers = config.mgmt.ntp.servers.map((s: any) =>
                typeof s === 'string' ? s : s?.address
            ).filter(Boolean)
        }
    }
}

/**
 * Parser Registry - manages available parsers
 */
export class ParserRegistry {
    private parsers: Map<DeviceVendor, IVendorParser> = new Map()

    register(parser: IVendorParser): void {
        this.parsers.set(parser.vendor, parser)
    }

    getParser(vendor: DeviceVendor): IVendorParser | undefined {
        return this.parsers.get(vendor)
    }

    /**
     * Auto-detect vendor and get appropriate parser
     */
    detectAndGetParser(rawConfig: string): IVendorParser | undefined {
        for (const parser of this.parsers.values()) {
            if (parser.canParse(rawConfig)) {
                return parser
            }
        }
        return undefined
    }

    getAllParsers(): IVendorParser[] {
        return Array.from(this.parsers.values())
    }
}

// Singleton registry
export const parserRegistry = new ParserRegistry()
