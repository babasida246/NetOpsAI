import type { ModuleDefinition } from './types'
import type { CanonicalConfig, QosQueue, RiskItem, Vendor, ValidationFinding } from '../types'

const qosSchema = {
    title: 'QoS',
    type: 'object',
    properties: {
        queues: { type: 'array', items: { type: 'object', title: 'Queue' } }
    }
} as const

const validateQos = (config: CanonicalConfig): ValidationFinding[] => {
    const findings: ValidationFinding[] = []
    config.qos.queues.forEach((queue, index) => {
        if (!queue.name || !queue.target) {
            findings.push({
                id: `qos.queue.${index}`,
                severity: 'error',
                field: `qos.queues.${index}`,
                message: 'QoS queue requires name and target.',
                suggestion: 'Provide queue name and target (IP/CIDR).'
            })
        }
        if (!queue.maxLimit) {
            findings.push({
                id: `qos.queue.${index}.limit`,
                severity: 'warn',
                field: `qos.queues.${index}.maxLimit`,
                message: 'Queue max-limit is missing.',
                suggestion: 'Define max bandwidth for this queue.'
            })
        }
    })
    return findings
}

const riskQos = (config: CanonicalConfig): RiskItem[] => {
    const items: RiskItem[] = []
    if (config.qos.queues.length > 0) {
        items.push({
            id: 'qos.enabled',
            level: 'LOW',
            labelKey: 'netops.generator.risk.qosEnabled',
            detailKey: 'netops.generator.risk.qosEnabledDetail'
        })
    }
    return items
}

const renderMikrotikQueue = (queue: QosQueue): string => {
    return `/queue simple add name=${queue.name} target=${queue.target} max-limit=${queue.maxLimit} priority=${queue.priority ?? 8}`
}

const renderCiscoQueue = (queue: QosQueue): string[] => {
    return [
        `class-map match-any ${queue.name}`,
        ` match access-group name ${queue.name}`,
        `policy-map ${queue.name}`,
        ` class ${queue.name}`,
        `  police ${queue.maxLimit}`
    ]
}

const qosModule: ModuleDefinition = {
    key: 'qos',
    title: 'QoS',
    inputSchema: qosSchema,
    validate: validateQos,
    risk: (config) => riskQos(config),
    render: (config: CanonicalConfig, vendor: Vendor) => {
        if (config.qos.queues.length === 0) {
            return { sections: [], verifyCommands: [], rollbackCommands: [] }
        }
        const commands: string[] = []
        const rollback: string[] = []
        if (vendor === 'mikrotik') {
            config.qos.queues.forEach((queue) => {
                commands.push(renderMikrotikQueue(queue))
                rollback.push(`/queue simple remove [find name=${queue.name}]`)
            })
        } else {
            config.qos.queues.forEach((queue) => {
                commands.push(...renderCiscoQueue(queue))
            })
            rollback.push('no policy-map NETOPS-QOS')
        }
        return {
            sections: [{ name: 'qos', commands }],
            verifyCommands: vendor === 'mikrotik' ? ['/queue simple print'] : ['show policy-map'],
            rollbackCommands: rollback
        }
    }
}

export default qosModule

