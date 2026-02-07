import type { MikroTikEnvironment, MikroTikFullConfigIntent, MikroTikRoleTemplate, MikroTikSecurityPreset } from './types.js'

export type MikroTikRoleTemplateSpec = {
    id: MikroTikRoleTemplate
    title: string
    description: string
    requiredInputs: string[]
    defaults: {
        environment: MikroTikEnvironment
        securityPreset: MikroTikSecurityPreset
        dnsAllowRemoteRequests: boolean
        winboxEnabled: boolean
        fastTrack: 'auto' | 'enabled' | 'disabled'
    }
}

export const MIKROTIK_ROLE_TEMPLATES: MikroTikRoleTemplateSpec[] = [
    {
        id: 'edge-internet',
        title: 'Edge Internet Router',
        description: 'WAN uplink + NAT + secure firewall baseline (safe-by-default).',
        requiredInputs: ['internet.wanInterface', 'internet.publicType', 'management.mgmtSubnet'],
        defaults: {
            environment: 'dev',
            securityPreset: 'standard-secure',
            dnsAllowRemoteRequests: false,
            winboxEnabled: true,
            fastTrack: 'auto'
        }
    },
    {
        id: 'core-router',
        title: 'Core Router (VLAN Gateway)',
        description: 'VLAN gateway + inter-VLAN policy + routing (static/OSPF optional).',
        requiredInputs: ['vlans', 'interfaces', 'management.mgmtSubnet'],
        defaults: {
            environment: 'dev',
            securityPreset: 'hospital-secure',
            dnsAllowRemoteRequests: false,
            winboxEnabled: true,
            fastTrack: 'auto'
        }
    },
    {
        id: 'distribution-l3',
        title: 'Distribution L3',
        description: 'Internal routing with VLAN trunking; NAT disabled by default.',
        requiredInputs: ['vlans', 'interfaces', 'management.mgmtSubnet'],
        defaults: {
            environment: 'dev',
            securityPreset: 'hospital-secure',
            dnsAllowRemoteRequests: false,
            winboxEnabled: true,
            fastTrack: 'auto'
        }
    },
    {
        id: 'access-switch-crs',
        title: 'Access Switch (CRS)',
        description: 'Bridge VLAN filtering for trunk/access ports (no routing).',
        requiredInputs: ['interfaces', 'vlans'],
        defaults: {
            environment: 'dev',
            securityPreset: 'standard-secure',
            dnsAllowRemoteRequests: false,
            winboxEnabled: true,
            fastTrack: 'disabled'
        }
    },
    {
        id: 'mgmt-only',
        title: 'Management Only',
        description: 'Management hardening, logging, SNMP; no routing changes.',
        requiredInputs: ['management.mgmtSubnet'],
        defaults: {
            environment: 'dev',
            securityPreset: 'standard-secure',
            dnsAllowRemoteRequests: false,
            winboxEnabled: true,
            fastTrack: 'disabled'
        }
    }
]

export function getRoleTemplate(role: MikroTikRoleTemplate): MikroTikRoleTemplateSpec {
    const template = MIKROTIK_ROLE_TEMPLATES.find((t) => t.id === role)
    if (!template) {
        throw new Error(`Unknown MikroTik role template: ${role}`)
    }
    return template
}

export function applyRoleDefaults(intent: MikroTikFullConfigIntent): MikroTikFullConfigIntent {
    const template = getRoleTemplate(intent.role)

    const environment = intent.environment ?? template.defaults.environment

    return {
        ...intent,
        environment,
        securityProfile: {
            preset: intent.securityProfile?.preset ?? template.defaults.securityPreset
        },
        firewallPolicy: {
            ...intent.firewallPolicy,
            fastTrack: intent.firewallPolicy?.fastTrack ?? template.defaults.fastTrack
        },
        management: {
            ...intent.management,
            winbox: {
                enabled: intent.management.winbox?.enabled ?? template.defaults.winboxEnabled,
                port: intent.management.winbox?.port
            },
            dnsAllowRemoteRequests:
                intent.management.dnsAllowRemoteRequests ?? template.defaults.dnsAllowRemoteRequests
        }
    }
}

