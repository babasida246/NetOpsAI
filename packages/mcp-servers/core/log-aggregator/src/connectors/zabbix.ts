export interface ZabbixAlert {
    timestamp: Date
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    host: string
    trigger: string
}

export class ZabbixConnector {
    constructor(
        private apiUrl: string,
        private apiToken: string
    ) { }

    async getAlerts(
        startTime: Date,
        endTime: Date,
        severity?: string
    ): Promise<ZabbixAlert[]> {
        // TODO: Real Zabbix API integration
        // For now, return mock data
        return [
            {
                timestamp: new Date(),
                severity: 'warning',
                message: 'High CPU usage on HIS server',
                host: 'his-prod-01',
                trigger: 'CPU > 80%'
            },
            {
                timestamp: new Date(),
                severity: 'error',
                message: 'Database connection pool exhausted',
                host: 'db-prod-01',
                trigger: 'Connection pool full'
            }
        ]
    }
}
