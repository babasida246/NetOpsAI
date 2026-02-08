import type { CanonicalConfig } from './types'

export type SchemaNode = JsonSchema | ArraySchema | StringSchema | NumberSchema | BooleanSchema

export type JsonSchema = {
    title: string
    type: 'object'
    properties?: Record<string, SchemaNode>
    required?: string[]
}

export type ArraySchema = {
    type: 'array'
    items: SchemaNode
}

export type StringSchema = {
    type: 'string'
    title: string
    description?: string
    default?: string
    enum?: string[]
}

export type NumberSchema = {
    type: 'number'
    title: string
    description?: string
    default?: number
}

export type BooleanSchema = {
    type: 'boolean'
    title: string
    description?: string
    default?: boolean
}

export type UiSchema = Record<string, { label: string; hint?: string; section?: string }>

export const canonicalSchema: JsonSchema = {
    title: 'Canonical Network Config',
    type: 'object',
    required: ['hostname'],
    properties: {
        hostname: {
            type: 'string',
            title: 'Hostname',
            description: 'Device hostname used for identity and prompt'
        },
        interfaces: {
            type: 'array',
            items: {
                title: 'Interface',
                type: 'object',
                properties: {
                    name: { type: 'string', title: 'Interface name' },
                    role: { type: 'string', title: 'Role', enum: ['uplink', 'access'] },
                    ipAddress: { type: 'string', title: 'IP address' },
                    subnetMask: { type: 'string', title: 'Subnet mask' },
                    vlanId: { type: 'number', title: 'VLAN ID' },
                    description: { type: 'string', title: 'Description' },
                    enabled: { type: 'boolean', title: 'Enabled', default: true }
                }
            }
        },
        vlans: {
            type: 'array',
            items: {
                title: 'VLAN',
                type: 'object',
                properties: {
                    id: { type: 'number', title: 'VLAN ID' },
                    name: { type: 'string', title: 'VLAN name' },
                    subnet: { type: 'string', title: 'Subnet (CIDR)' },
                    gateway: { type: 'string', title: 'Gateway IP' }
                }
            }
        },
        routing: {
            title: 'Routing',
            type: 'object',
            properties: {
                staticRoutes: {
                    type: 'array',
                    items: {
                        title: 'Static route',
                        type: 'object',
                        properties: {
                            destination: { type: 'string', title: 'Destination' },
                            netmask: { type: 'string', title: 'Netmask' },
                            nextHop: { type: 'string', title: 'Next hop' }
                        }
                    }
                },
                ospf: {
                    title: 'OSPF',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enable OSPF', default: false },
                        routerId: { type: 'string', title: 'Router ID' },
                        areas: {
                            type: 'array',
                            items: {
                                title: 'OSPF Area',
                                type: 'object',
                                properties: {
                                    area: { type: 'string', title: 'Area ID' },
                                    networks: {
                                        type: 'array',
                                        items: { title: 'Network', type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                bgp: {
                    title: 'BGP',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enable BGP', default: false },
                        localAs: { type: 'number', title: 'Local AS' },
                        neighbors: {
                            type: 'array',
                            items: {
                                title: 'Neighbor',
                                type: 'object',
                                properties: {
                                    neighbor: { type: 'string', title: 'Neighbor IP' },
                                    remoteAs: { type: 'number', title: 'Remote AS' }
                                }
                            }
                        },
                        networks: {
                            type: 'array',
                            items: { title: 'Network', type: 'string' }
                        }
                    }
                },
                rip: {
                    title: 'RIP',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enable RIP', default: false },
                        version: { type: 'number', title: 'RIP Version', default: 2 },
                        networks: {
                            type: 'array',
                            items: { title: 'Network', type: 'string' }
                        }
                    }
                }
            }
        },
        services: {
            title: 'Services',
            type: 'object',
            properties: {
                ssh: {
                    title: 'SSH',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enable SSH', default: true },
                        version: { type: 'number', title: 'SSH version', default: 2 },
                        allowPassword: { type: 'boolean', title: 'Allow password auth', default: true }
                    }
                },
                ntpServers: {
                    type: 'array',
                    items: {
                        title: 'NTP server',
                        type: 'string'
                    }
                },
                dnsServers: {
                    type: 'array',
                    items: {
                        title: 'DNS server',
                        type: 'string'
                    }
                },
                syslogServers: {
                    type: 'array',
                    items: {
                        title: 'Syslog server',
                        type: 'string'
                    }
                },
                snmpCommunity: { type: 'string', title: 'SNMP community' },
                snmpVersion: { type: 'string', title: 'SNMP version', enum: ['v2c', 'v3'] },
                snmpV3Users: {
                    type: 'array',
                    items: {
                        title: 'SNMP v3 user',
                        type: 'object',
                        properties: {
                            username: { type: 'string', title: 'Username' },
                            authProtocol: { type: 'string', title: 'Auth protocol' },
                            privProtocol: { type: 'string', title: 'Privacy protocol' }
                        }
                    }
                },
                netflow: {
                    title: 'NetFlow',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enabled', default: false },
                        collector: { type: 'string', title: 'Collector' },
                        port: { type: 'number', title: 'Port' }
                    }
                },
                sflow: {
                    title: 'sFlow',
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', title: 'Enabled', default: false },
                        collector: { type: 'string', title: 'Collector' },
                        port: { type: 'number', title: 'Port' }
                    }
                }
            }
        },
        firewall: {
            title: 'Firewall',
            type: 'object',
            properties: {
                enabled: { type: 'boolean', title: 'Enable baseline firewall', default: true },
                allowMgmtFrom: { type: 'string', title: 'Allow management from CIDR' },
                rules: {
                    type: 'array',
                    items: {
                        title: 'Firewall rule',
                        type: 'object',
                        properties: {
                            chain: { type: 'string', title: 'Chain' },
                            src: { type: 'string', title: 'Source' },
                            dst: { type: 'string', title: 'Destination' },
                            protocol: { type: 'string', title: 'Protocol' },
                            action: { type: 'string', title: 'Action' }
                        }
                    }
                }
            }
        },
        nat: {
            title: 'NAT',
            type: 'object',
            properties: {
                rules: {
                    type: 'array',
                    items: {
                        title: 'NAT rule',
                        type: 'object',
                        properties: {
                            type: { type: 'string', title: 'Type' },
                            src: { type: 'string', title: 'Source' },
                            dst: { type: 'string', title: 'Destination' },
                            toAddress: { type: 'string', title: 'Translate to' }
                        }
                    }
                }
            }
        },
        vpn: {
            title: 'VPN',
            type: 'object',
            properties: {
                ipsecTunnels: {
                    type: 'array',
                    items: {
                        title: 'IPsec tunnel',
                        type: 'object',
                        properties: {
                            name: { type: 'string', title: 'Name' },
                            localAddress: { type: 'string', title: 'Local address' },
                            remoteAddress: { type: 'string', title: 'Remote address' }
                        }
                    }
                },
                wireguardTunnels: {
                    type: 'array',
                    items: {
                        title: 'WireGuard tunnel',
                        type: 'object',
                        properties: {
                            name: { type: 'string', title: 'Name' },
                            interfaceAddress: { type: 'string', title: 'Interface address' }
                        }
                    }
                },
                l2tpServers: {
                    type: 'array',
                    items: {
                        title: 'L2TP',
                        type: 'object',
                        properties: {
                            name: { type: 'string', title: 'Name' },
                            localAddress: { type: 'string', title: 'Local address' }
                        }
                    }
                }
            }
        },
        qos: {
            title: 'QoS',
            type: 'object',
            properties: {
                queues: {
                    type: 'array',
                    items: {
                        title: 'Queue',
                        type: 'object',
                        properties: {
                            name: { type: 'string', title: 'Name' },
                            target: { type: 'string', title: 'Target' },
                            maxLimit: { type: 'string', title: 'Max limit' }
                        }
                    }
                }
            }
        },
        metadata: {
            title: 'Metadata',
            type: 'object',
            properties: {
                environment: {
                    type: 'string',
                    title: 'Environment',
                    enum: ['dev', 'staging', 'prod']
                }
            }
        }
    }
}

export const canonicalUiSchema: UiSchema = {
    hostname: { label: 'Hostname', hint: 'e.g. CORE-EDGE-01', section: 'Base' },
    interfaces: { label: 'Interfaces', hint: 'Define uplink/access ports', section: 'Interfaces' },
    vlans: { label: 'VLANs', hint: 'Define VLAN IDs and gateway IPs', section: 'VLANs' },
    routing: { label: 'Routing', hint: 'Static routes', section: 'Routing' },
    services: { label: 'Services', hint: 'SSH, NTP, DNS', section: 'Services' },
    firewall: { label: 'Firewall', hint: 'Baseline security rules', section: 'Security' },
    nat: { label: 'NAT', hint: 'Address translation rules', section: 'Security' },
    vpn: { label: 'VPN', hint: 'Site-to-site and remote access', section: 'Security' },
    qos: { label: 'QoS', hint: 'Traffic shaping', section: 'Performance' },
    metadata: { label: 'Environment', hint: 'Used for safety confirmations', section: 'Safety' }
}

export function defaultCanonicalConfig(): CanonicalConfig {
    return {
        hostname: '',
        interfaces: [],
        vlans: [],
        routing: {
            staticRoutes: [],
            ospf: { enabled: false, routerId: '', areas: [] },
            bgp: { enabled: false, localAs: undefined, routerId: '', neighbors: [], networks: [] },
            rip: { enabled: false, version: 2, networks: [] }
        },
        services: {
            ssh: { enabled: true, version: 2, allowPassword: true },
            ntpServers: [],
            dnsServers: [],
            syslogServers: [],
            snmpCommunity: '',
            snmpVersion: 'v2c',
            snmpV3Users: [],
            netflow: { enabled: false, collector: '', port: 2055, version: 9 },
            sflow: { enabled: false, collector: '', port: 6343 }
        },
        firewall: { enabled: true, allowMgmtFrom: '', rules: [] },
        nat: { rules: [] },
        vpn: { ipsecTunnels: [], wireguardTunnels: [], l2tpServers: [] },
        qos: { queues: [] },
        metadata: { environment: 'dev' }
    }
}
