import type { RiskLevel } from '../../shared/security/netops-guard.js'
import { normalizeRiskLevel } from '../../shared/security/netops-guard.js'

export type CommandTemplate = {
    id: string
    vendor: 'mikrotik' | 'cisco' | 'fortigate' | 'any'
    description: string
    command: string
    riskLevel: RiskLevel
    readOnly: boolean
}

const TEMPLATES: CommandTemplate[] = [
    {
        id: 'read.show_interfaces',
        vendor: 'any',
        description: 'Show interface status',
        command: 'show interface status',
        riskLevel: 'R0_READ',
        readOnly: true
    },
    {
        id: 'read.show_ip_route',
        vendor: 'cisco',
        description: 'Show IP routing table',
        command: 'show ip route',
        riskLevel: 'R0_READ',
        readOnly: true
    },
    {
        id: 'read.mikrotik_interfaces',
        vendor: 'mikrotik',
        description: 'Show MikroTik interfaces',
        command: '/interface print',
        riskLevel: 'R0_READ',
        readOnly: true
    },
    {
        id: 'read.mikrotik_ip_route',
        vendor: 'mikrotik',
        description: 'Show MikroTik routes',
        command: '/ip route print',
        riskLevel: 'R0_READ',
        readOnly: true
    },
    {
        id: 'safe.add_comment',
        vendor: 'any',
        description: 'Add a safe comment tag (example)',
        command: 'comment {{message}}',
        riskLevel: 'R1_SAFE_WRITE',
        readOnly: false
    }
]

export function listCommandTemplates(): CommandTemplate[] {
    return [...TEMPLATES]
}

export function getCommandTemplate(templateId: string): CommandTemplate | undefined {
    return TEMPLATES.find((template) => template.id === templateId)
}

export function renderCommandTemplate(template: CommandTemplate, params: Record<string, unknown> = {}): {
    command: string
    riskLevel: RiskLevel
} {
    const missing: string[] = []
    const rendered = template.command.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
        const value = params[key]
        if (value === undefined || value === null || String(value).trim() === '') {
            missing.push(key)
            return ''
        }
        return String(value)
    })

    if (missing.length > 0) {
        throw new Error(`Missing template params: ${missing.join(', ')}`)
    }

    return {
        command: rendered,
        riskLevel: normalizeRiskLevel(template.riskLevel)
    }
}
