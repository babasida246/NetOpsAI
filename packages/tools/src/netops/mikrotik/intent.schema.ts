import type { MikroTikRoleTemplate, MikroTikSecurityPreset } from './types.js'

type JSONSchema = Record<string, any>

const ROLE_VALUES: MikroTikRoleTemplate[] = [
    'edge-internet',
    'core-router',
    'distribution-l3',
    'access-switch-crs',
    'mgmt-only'
]

const SECURITY_PRESET_VALUES: MikroTikSecurityPreset[] = [
    'hospital-secure',
    'standard-secure',
    'lab'
]

const CIDR_PATTERN = '^\\d{1,3}(?:\\.\\d{1,3}){3}/\\d{1,2}$'

export const mikrotikFullConfigIntentSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['device', 'role', 'hostname', 'interfaces', 'securityProfile', 'management'],
    properties: {
        device: {
            type: 'object',
            additionalProperties: false,
            required: ['model', 'routerOsMajor', 'routerOsVersion'],
            properties: {
                model: { type: 'string', minLength: 1 },
                routerOsMajor: { type: 'number', minimum: 6, maximum: 7 },
                routerOsVersion: { type: 'string', minLength: 1 },
                capabilities: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        hasSwitchChip: { type: 'boolean' },
                        hasWifi: { type: 'boolean' },
                        hasSfp: { type: 'boolean' },
                        notes: { type: 'string' }
                    }
                }
            }
        },
        role: {
            type: 'string',
            enum: ROLE_VALUES
        },
        hostname: { type: 'string', minLength: 1 },
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        labMode: { type: 'boolean' },
        interfaces: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'purpose'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    purpose: { type: 'string', enum: ['wan', 'trunk', 'access', 'mgmt'] },
                    comment: { type: 'string' },
                    accessVlanId: { type: 'number', minimum: 1, maximum: 4094 },
                    trunkVlanIds: {
                        type: 'array',
                        items: { type: 'number', minimum: 1, maximum: 4094 }
                    }
                }
            }
        },
        vlans: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'subnet', 'gateway'],
                properties: {
                    id: { type: 'number', minimum: 1, maximum: 4094 },
                    name: { type: 'string', minLength: 1 },
                    subnet: { type: 'string', pattern: CIDR_PATTERN },
                    gateway: { type: 'string', format: 'ipv4' },
                    group: { type: 'string', enum: ['MGMT', 'STAFF', 'GUEST', 'SERVER', 'IOT'] },
                    dhcp: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['enabled'],
                        properties: {
                            enabled: { type: 'boolean' },
                            poolStart: { type: 'string', format: 'ipv4' },
                            poolEnd: { type: 'string', format: 'ipv4' },
                            leaseTime: { type: 'string' },
                            dnsServers: {
                                type: 'array',
                                items: { type: 'string', format: 'ipv4' }
                            },
                            ntpServers: {
                                type: 'array',
                                items: { type: 'string', format: 'ipv4' }
                            }
                        }
                    }
                }
            }
        },
        routing: {
            type: 'object',
            additionalProperties: false,
            properties: {
                staticRoutes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['dst', 'gateway'],
                        properties: {
                            dst: { type: 'string', pattern: CIDR_PATTERN },
                            gateway: { type: 'string', format: 'ipv4' },
                            distance: { type: 'number', minimum: 1, maximum: 255 },
                            comment: { type: 'string' }
                        }
                    }
                },
                ospf: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['enabled'],
                    properties: {
                        enabled: { type: 'boolean' },
                        routerId: { type: 'string', format: 'ipv4' },
                        area: { type: 'string' },
                        networks: { type: 'array', items: { type: 'string', pattern: CIDR_PATTERN } },
                        passiveInterfaces: { type: 'array', items: { type: 'string' } }
                    }
                }
            }
        },
        internet: {
            anyOf: [
                {
                    type: 'object',
                    additionalProperties: false,
                    required: ['wanInterface', 'publicType'],
                    properties: {
                        wanInterface: { type: 'string', minLength: 1 },
                        publicType: { const: 'dhcp' },
                        dnsServers: { type: 'array', items: { type: 'string', format: 'ipv4' } },
                        defaultRoute: { type: 'boolean' }
                    }
                },
                {
                    type: 'object',
                    additionalProperties: false,
                    required: ['wanInterface', 'publicType', 'address', 'gateway'],
                    properties: {
                        wanInterface: { type: 'string', minLength: 1 },
                        publicType: { const: 'static' },
                        address: { type: 'string', pattern: CIDR_PATTERN },
                        gateway: { type: 'string', format: 'ipv4' },
                        dnsServers: { type: 'array', items: { type: 'string', format: 'ipv4' } },
                        defaultRoute: { type: 'boolean' }
                    }
                },
                {
                    type: 'object',
                    additionalProperties: false,
                    required: ['wanInterface', 'publicType', 'username', 'password'],
                    properties: {
                        wanInterface: { type: 'string', minLength: 1 },
                        publicType: { const: 'pppoe' },
                        username: { type: 'string', minLength: 1 },
                        password: { type: 'string', minLength: 1 },
                        serviceName: { type: 'string' },
                        dnsServers: { type: 'array', items: { type: 'string', format: 'ipv4' } },
                        defaultRoute: { type: 'boolean' }
                    }
                }
            ]
        },
        securityProfile: {
            type: 'object',
            additionalProperties: false,
            required: ['preset'],
            properties: {
                preset: { type: 'string', enum: SECURITY_PRESET_VALUES }
            }
        },
        management: {
            type: 'object',
            additionalProperties: false,
            required: ['mgmtSubnet'],
            properties: {
                mgmtSubnet: { type: 'string', pattern: CIDR_PATTERN },
                allowedSubnets: { type: 'array', items: { type: 'string', pattern: CIDR_PATTERN } },
                ssh: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        port: { type: 'number', minimum: 1, maximum: 65535 },
                        allowPassword: { type: 'boolean' },
                        authorizedKeys: { type: 'array', items: { type: 'string' } }
                    }
                },
                winbox: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        enabled: { type: 'boolean' },
                        port: { type: 'number', minimum: 1, maximum: 65535 }
                    }
                },
                dnsAllowRemoteRequests: { type: 'boolean' },
                timezone: { type: 'string' },
                ntpServers: { type: 'array', items: { type: 'string', format: 'ipv4' } },
                syslog: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        remote: { type: 'string', format: 'ipv4' },
                        topics: { type: 'array', items: { type: 'string' } }
                    }
                },
                snmp: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        enabled: { type: 'boolean' },
                        community: { type: 'string' },
                        allowedSubnet: { type: 'string', pattern: CIDR_PATTERN }
                    }
                }
            }
        },
        firewallPolicy: {
            type: 'object',
            additionalProperties: false,
            properties: {
                addressLists: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name', 'entries'],
                        properties: {
                            name: { type: 'string' },
                            entries: { type: 'array', items: { type: 'string', pattern: CIDR_PATTERN } }
                        }
                    }
                },
                interVlanMatrix: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['from', 'to', 'action'],
                        properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            action: { type: 'string', enum: ['allow', 'deny'] },
                            comment: { type: 'string' }
                        }
                    }
                },
                fastTrack: { type: 'string', enum: ['auto', 'enabled', 'disabled'] }
            }
        },
        qos: {
            type: 'object',
            additionalProperties: false,
            required: ['enabled', 'profile'],
            properties: {
                enabled: { type: 'boolean' },
                profile: { type: 'string', enum: ['his-pacs-priority', 'voip', 'guest-limit', 'custom'] },
                notes: { type: 'string' }
            }
        },
        vpn: {
            type: 'object',
            additionalProperties: false,
            properties: {
                wireguard: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['enabled'],
                    properties: {
                        enabled: { type: 'boolean' },
                        interfaceName: { type: 'string' },
                        listenPort: { type: 'number', minimum: 1, maximum: 65535 },
                        address: { type: 'string', pattern: CIDR_PATTERN },
                        privateKey: { type: 'string' },
                        peers: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['name', 'publicKey', 'allowedIps'],
                                properties: {
                                    name: { type: 'string' },
                                    publicKey: { type: 'string' },
                                    allowedIps: { type: 'array', items: { type: 'string', pattern: CIDR_PATTERN } },
                                    endpoint: { type: 'string' },
                                    persistentKeepalive: { type: 'number', minimum: 0, maximum: 3600 }
                                }
                            }
                        }
                    }
                }
            }
        },
        notes: { type: 'string' }
    }
}

export const mikrotikValidateConfigSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['config', 'routerOsVersion'],
    properties: {
        config: { type: 'string', minLength: 1 },
        routerOsVersion: { type: 'string', minLength: 1 }
    }
}

export const mikrotikDiffSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['runningConfig', 'desiredConfig'],
    properties: {
        runningConfig: { type: 'string' },
        desiredConfig: { type: 'string' }
    }
}

