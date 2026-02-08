import type { ModuleDefinition } from './types'
import type { CanonicalConfig, RiskItem, Vendor, ValidationFinding } from '../types'

const monitoringSchema = {
    title: 'Monitoring',
    type: 'object',
    properties: {
        syslogServers: { type: 'array', items: { type: 'string', title: 'Syslog server' } },
        snmp: { type: 'object', title: 'SNMP' },
        netflow: { type: 'object', title: 'NetFlow' },
        sflow: { type: 'object', title: 'sFlow' }
    }
} as const

const validateMonitoring = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []

    if (config.services.snmpVersion === 'v3' && (!config.services.snmpV3Users || config.services.snmpV3Users.length === 0)) {
        findings.push({
            id: 'monitoring.snmp.v3.users',
            severity: 'error',
            field: 'services.snmpV3Users',
            message: 'SNMP v3 enabled without any users.',
            suggestion: 'Add at least one SNMPv3 user.'
        })
    }

    if (config.services.netflow.enabled && !config.services.netflow.collector) {
        findings.push({
            id: 'monitoring.netflow.collector',
            severity: 'error',
            field: 'services.netflow.collector',
            message: 'NetFlow enabled without collector.',
            suggestion: 'Provide a NetFlow collector address.'
        })
    }

    if (config.services.sflow.enabled && !config.services.sflow.collector) {
        findings.push({
            id: 'monitoring.sflow.collector',
            severity: 'error',
            field: 'services.sflow.collector',
            message: 'sFlow enabled without collector.',
            suggestion: 'Provide an sFlow collector address.'
        })
    }

    return findings
}

const riskMonitoring = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    if (config.services.snmpCommunity && config.services.snmpCommunity.toLowerCase() === 'public') {
        items.push({
            id: 'monitoring.snmp.public',
            level: 'MEDIUM',
            labelKey: 'netops.generator.risk.snmpPublic',
            detailKey: 'netops.generator.risk.snmpPublicDetail'
        })
    }
    return items
}

const monitoringModule: ModuleDefinition = {
    key: 'monitoring',
    title: 'Monitoring',
    inputSchema: monitoringSchema,
    validate: validateMonitoring,
    risk: (config) => riskMonitoring(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        const commands: string[] = []
        const rollback: string[] = []

        if (vendor === 'mikrotik') {
            if (config.services.syslogServers.length > 0) {
                commands.push(`/system logging action set remote remote=${config.services.syslogServers[0]}`)
                commands.push('/system logging add topics=info action=remote')
            }
            if (config.services.snmpVersion === 'v3' && config.services.snmpV3Users && config.services.snmpV3Users.length > 0) {
                commands.push('/snmp set enabled=yes')
                config.services.snmpV3Users.forEach((user) => {
                    commands.push(`/snmp community add name=${user.username} security=private`)
                })
            } else if (config.services.snmpCommunity) {
                commands.push('/snmp set enabled=yes')
                commands.push(`/snmp community set [find default=yes] name=${config.services.snmpCommunity}`)
            }
            if (config.services.netflow.enabled && config.services.netflow.collector) {
                commands.push('/ip traffic-flow set enabled=yes')
                commands.push(`/ip traffic-flow target add dst-address=${config.services.netflow.collector} port=${config.services.netflow.port || 2055}`)
            }
            if (config.services.sflow.enabled && config.services.sflow.collector) {
                commands.push(`/tool traffic-monitor set enabled=yes`)
                commands.push(`! sFlow exporter to ${config.services.sflow.collector}`)
            }
        } else {
            if (config.services.syslogServers.length > 0) {
                config.services.syslogServers.forEach((server) => commands.push(`logging host ${server}`))
                commands.push('logging trap informational')
            }
            if (config.services.snmpVersion === 'v3' && config.services.snmpV3Users && config.services.snmpV3Users.length > 0) {
                config.services.snmpV3Users.forEach((user) => {
                    commands.push(`snmp-server user ${user.username} NETOPS v3 auth ${user.authProtocol || 'sha'} ${user.authPassword || '<auth>'} priv ${user.privProtocol || 'aes'} ${user.privPassword || '<priv>'}`)
                })
            } else if (config.services.snmpCommunity) {
                commands.push(`snmp-server community ${config.services.snmpCommunity} RO`)
            }
            if (config.services.netflow.enabled && config.services.netflow.collector) {
                commands.push(`ip flow-export destination ${config.services.netflow.collector} ${config.services.netflow.port || 2055}`)
                commands.push(`ip flow-export version ${config.services.netflow.version || 9}`)
            }
        }

        if (commands.length === 0) {
            return { sections: [], verifyCommands: [], rollbackCommands: [] }
        }

        return {
            sections: [{ name: 'monitoring', commands }],
            verifyCommands: vendor === 'mikrotik' ? ['/snmp print', '/system logging print'] : ['show logging', 'show snmp community'],
            rollbackCommands: rollback
        }
    }
}

export default monitoringModule
