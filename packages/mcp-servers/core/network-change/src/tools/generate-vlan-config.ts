import type { ToolDefinition } from '@tools/registry'

export const generateVlanConfigTool: ToolDefinition = {
    name: 'generate_vlan_config',
    description: 'Generate VLAN configuration for FortiGate/MikroTik',
    inputSchema: {
        type: 'object',
        properties: {
            deviceType: {
                type: 'string',
                enum: ['fortigate', 'mikrotik'],
                description: 'Target device type'
            },
            vlanId: {
                type: 'number',
                minimum: 1,
                maximum: 4094,
                description: 'VLAN ID'
            },
            subnet: {
                type: 'string',
                pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}/\\d{1,2}$',
                description: 'Subnet (e.g., 10.50.0.0/24)'
            },
            name: {
                type: 'string',
                description: 'VLAN name'
            },
            description: {
                type: 'string'
            }
        },
        required: ['deviceType', 'vlanId', 'subnet', 'name']
    },
    async execute(args: {
        deviceType: string
        vlanId: number
        subnet: string
        name: string
        description?: string
    }) {
        let config: string

        if (args.deviceType === 'fortigate') {
            config = generateFortiGateVLAN(args)
        } else {
            config = generateMikroTikVLAN(args)
        }

        // Generate rollback config
        const rollback = generateRollback(args.deviceType, args.vlanId)

        return {
            deviceType: args.deviceType,
            config,
            rollback,
            validation: validateConfig(config),
            impact: {
                affectedInterfaces: 1,
                estimatedDowntime: '0 seconds',
                riskLevel: 'low'
            }
        }
    },
    strategy: 'fail-fast',
    timeout: 5000,
    requiresAuth: true,
    requiredRole: 'admin'
}

function generateFortiGateVLAN(args: any): string {
    const [ip, mask] = args.subnet.split('/')
    const gateway = ip.split('.').slice(0, 3).join('.') + '.1'

    return `
config system interface
  edit "vlan${args.vlanId}"
    set vdom "root"
    set vlanid ${args.vlanId}
    set interface "internal"
    set type vlan
    set alias "${args.name}"
    set ip ${gateway} 255.255.255.0
    set allowaccess ping
    set description "${args.description || ''}"
  next
end

config firewall policy
  edit 0
    set name "Allow_VLAN${args.vlanId}"
    set srcintf "vlan${args.vlanId}"
    set dstintf "internal"
    set srcaddr "all"
    set dstaddr "all"
    set action accept
    set schedule "always"
    set service "ALL"
  next
end
`.trim()
}

function generateMikroTikVLAN(args: any): string {
    const [ip, mask] = args.subnet.split('/')
    const gateway = ip.split('.').slice(0, 3).join('.') + '.1'

    return `
/interface vlan
add interface=bridge name=vlan${args.vlanId} vlan-id=${args.vlanId} comment="${args.name}"

/ip address
add address=${gateway}/${mask} interface=vlan${args.vlanId} comment="${args.description || ''}"

/ip firewall filter
add chain=forward src-address=${args.subnet} action=accept comment="Allow VLAN ${args.vlanId}"
`.trim()
}

function generateRollback(deviceType: string, vlanId: number): string {
    if (deviceType === 'fortigate') {
        return `
config system interface
  delete "vlan${vlanId}"
end

config firewall policy
  delete [policy-id-for-vlan${vlanId}]
end
`.trim()
    } else {
        return `
/interface vlan remove [find name=vlan${vlanId}]
/ip address remove [find interface=vlan${vlanId}]
/ip firewall filter remove [find comment~"VLAN ${vlanId}"]
`.trim()
    }
}

function validateConfig(config: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic syntax checks
    if (config.includes('edit ""')) {
        errors.push('Empty interface name')
    }

    if (config.includes('set ip 0.0.0.0')) {
        errors.push('Invalid IP address')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
