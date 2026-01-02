import type { ToolDefinition } from '@tools/registry'
import { ZabbixConnector } from '../connectors/zabbix.js'
import { SyslogConnector } from '../connectors/syslog.js'
import { FortiGateConnector } from '../connectors/fortigate.js'

export const getLogsTool: ToolDefinition = {
    name: 'get_logs',
    description: 'Fetch logs from monitoring systems (Zabbix, syslog, FortiGate)',
    inputSchema: {
        type: 'object',
        properties: {
            source: {
                type: 'string',
                enum: ['zabbix', 'syslog', 'fortigate'],
                description: 'Log source'
            },
            timeRange: {
                type: 'object',
                properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' }
                },
                required: ['start', 'end']
            },
            severity: {
                type: 'string',
                enum: ['info', 'warning', 'error', 'critical']
            },
            limit: {
                type: 'number',
                default: 100
            }
        },
        required: ['source', 'timeRange']
    },
    async execute(args: {
        source: string
        timeRange: { start: string; end: string }
        severity?: string
        limit?: number
    }) {
        const startTime = new Date(args.timeRange.start)
        const endTime = new Date(args.timeRange.end)

        let logs: any[] = []

        switch (args.source) {
            case 'zabbix': {
                const connector = new ZabbixConnector(
                    process.env.ZABBIX_API_URL || '',
                    process.env.ZABBIX_API_TOKEN || ''
                )
                logs = await connector.getAlerts(startTime, endTime, args.severity)
                break
            }
            case 'syslog': {
                const connector = new SyslogConnector()
                logs = await connector.getLogs(startTime, endTime, args.severity)
                break
            }
            case 'fortigate': {
                const connector = new FortiGateConnector(
                    process.env.FORTIGATE_API_URL || '',
                    process.env.FORTIGATE_API_TOKEN || ''
                )
                logs = await connector.getLogs(startTime, endTime)
                break
            }
            default:
                throw new Error(`Unsupported source: ${args.source}`)
        }

        // Apply limit
        const limited = logs.slice(0, args.limit || 100)

        return {
            source: args.source,
            count: limited.length,
            logs: limited.map(log => ({
                ...log,
                timestamp: log.timestamp.toISOString()
            }))
        }
    },
    strategy: 'retry',
    timeout: 30000,
    requiresAuth: true
}
