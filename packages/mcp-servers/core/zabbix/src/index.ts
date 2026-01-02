import axios, { AxiosInstance } from 'axios'

export interface ZabbixConfig {
    url: string
    token: string
    timeout?: number
    verifySsl?: boolean
}

export interface ZabbixHost {
    hostid: string
    host: string
    name: string
    status: string
    available: string
    error?: string
    groups?: Array<{ groupid: string; name: string }>
    interfaces?: Array<{
        interfaceid: string
        ip: string
        port: string
        type: string
    }>
}

export interface ZabbixAlert {
    alertid: string
    clock: string
    message: string
    severity: string
    subject: string
    sendto: string
    status: string
}

export interface ZabbixTrigger {
    triggerid: string
    description: string
    priority: string
    status: string
    value: string
    lastchange: string
    hosts?: ZabbixHost[]
}

export interface ZabbixProblem {
    eventid: string
    name: string
    severity: string
    clock: string
    acknowledged: string
    hosts?: ZabbixHost[]
}

export class ZabbixClient {
    private client: AxiosInstance
    private token: string
    private requestId = 1

    constructor(config: ZabbixConfig) {
        this.token = config.token
        this.client = axios.create({
            baseURL: config.url,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json-rpc',
            },
            ...(config.verifySsl === false && {
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                }),
            }),
        })
    }

    private async request(method: string, params: any = {}): Promise<any> {
        const payload = {
            jsonrpc: '2.0',
            method,
            params,
            id: this.requestId++,
            auth: this.token,
        }

        try {
            const response = await this.client.post('', payload)

            if (response.data.error) {
                throw new Error(`Zabbix API Error: ${response.data.error.message} (${response.data.error.data})`)
            }

            return response.data.result
        } catch (error: any) {
            if (error.response) {
                throw new Error(`Zabbix API HTTP Error: ${error.response.status} - ${error.response.statusText}`)
            }
            throw error
        }
    }

    async getHosts(filters?: {
        groupids?: string[]
        hostids?: string[]
        search?: { host?: string; name?: string }
    }): Promise<ZabbixHost[]> {
        const result = await this.request('host.get', {
            output: ['hostid', 'host', 'name', 'status', 'available', 'error'],
            selectGroups: ['groupid', 'name'],
            selectInterfaces: ['interfaceid', 'ip', 'port', 'type'],
            ...filters,
        })

        return result
    }

    async getHost(hostid: string): Promise<ZabbixHost | null> {
        const hosts = await this.getHosts({ hostids: [hostid] })
        return hosts[0] || null
    }

    async getHostByName(hostname: string): Promise<ZabbixHost | null> {
        const hosts = await this.getHosts({ search: { host: hostname } })
        return hosts[0] || null
    }

    async getAlerts(filters?: {
        hostids?: string[]
        time_from?: number
        time_till?: number
    }): Promise<ZabbixAlert[]> {
        const result = await this.request('alert.get', {
            output: 'extend',
            sortfield: 'clock',
            sortorder: 'DESC',
            ...filters,
        })

        return result
    }

    async getTriggers(filters?: {
        hostids?: string[]
        priority?: string
        active?: boolean
    }): Promise<ZabbixTrigger[]> {
        const result = await this.request('trigger.get', {
            output: 'extend',
            selectHosts: ['hostid', 'host', 'name'],
            sortfield: 'priority',
            sortorder: 'DESC',
            filter: {
                value: 1, // Only problems (triggers in PROBLEM state)
                ...(filters?.active !== undefined && { status: filters.active ? 0 : 1 }),
                ...(filters?.priority && { priority: filters.priority }),
            },
            ...(filters?.hostids && { hostids: filters.hostids }),
        })

        return result
    }

    async getProblems(filters?: {
        hostids?: string[]
        severities?: string[]
        acknowledged?: boolean
        recent?: boolean
    }): Promise<ZabbixProblem[]> {
        const result = await this.request('problem.get', {
            output: 'extend',
            selectHosts: ['hostid', 'host', 'name'],
            sortfield: ['eventid'],
            sortorder: 'DESC',
            ...(filters?.recent && { recent: true }),
            ...(filters?.hostids && { hostids: filters.hostids }),
            ...(filters?.severities && { severities: filters.severities }),
            ...(filters?.acknowledged !== undefined && {
                acknowledged: filters.acknowledged,
            }),
        })

        return result
    }

    async acknowledgeProblem(eventid: string, message: string): Promise<void> {
        await this.request('event.acknowledge', {
            eventids: [eventid],
            action: 6, // Close problem
            message,
        })
    }

    async getHistoryData(
        itemid: string,
        timeFrom: number,
        timeTill: number,
        limit = 100
    ): Promise<Array<{ clock: string; value: string }>> {
        const result = await this.request('history.get', {
            output: 'extend',
            itemids: [itemid],
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: 'clock',
            sortorder: 'DESC',
            limit,
        })

        return result
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.request('apiinfo.version')
            return true
        } catch {
            return false
        }
    }
}

// Factory function
export function createZabbixClient(config: ZabbixConfig): ZabbixClient {
    return new ZabbixClient(config)
}
