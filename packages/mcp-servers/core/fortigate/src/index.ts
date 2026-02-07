import axios, { AxiosInstance } from 'axios'

export interface FortiGateConfig {
    url: string
    apiKey: string
    timeout?: number
    verifySsl?: boolean
}

export interface FortiGatePolicy {
    policyid: string
    name: string
    srcintf: Array<{ name: string }>
    dstintf: Array<{ name: string }>
    srcaddr: Array<{ name: string }>
    dstaddr: Array<{ name: string }>
    service: Array<{ name: string }>
    action: 'accept' | 'deny'
    status: 'enable' | 'disable'
    nat: string
    schedule: string
    comments?: string
}

export interface FortiGateAddress {
    name: string
    type: string
    subnet?: string
    'start-ip'?: string
    'end-ip'?: string
    fqdn?: string
    comment?: string
}

export interface FortiGateInterface {
    name: string
    ip: string
    status: 'up' | 'down'
    type: string
    vdom: string
    speed?: string
    duplex?: string
    link?: string
}

export interface FortiGateSession {
    session_id: string
    proto: string
    src: string
    dst: string
    sport: string
    dport: string
    state: string
    expire: string
    bytes: string
    pkts: string
}

export interface FortiGateSystemStatus {
    version: string
    serial: string
    hostname: string
    operation_mode: string
    current_time: string
    uptime: string
    cpu: string
    memory: string
}

export class FortiGateClient {
    private client: AxiosInstance
    private vdom: string

    constructor(config: FortiGateConfig, vdom = 'root') {
        this.vdom = vdom
        this.client = axios.create({
            baseURL: config.url,
            timeout: config.timeout || 30000,
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            ...(config.verifySsl === false && {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                }),
            }),
        })
    }

    private async request<T>(
        method: 'get' | 'post' | 'put' | 'delete',
        path: string,
        data?: any
    ): Promise<T> {
        try {
            const url = `/api/v2/cmdb${path}?vdom=${this.vdom}`
            const response = await this.client.request({
                method,
                url,
                data,
            })

            if (response.data.http_status !== 200 && response.data.status !== 'success') {
                throw new Error(
                    `FortiGate API Error: ${response.data.http_status} - ${response.data.error || 'Unknown error'}`
                )
            }

            return response.data.results || response.data
        } catch (error: any) {
            if (error.response) {
                throw new Error(
                    `FortiGate API HTTP Error: ${error.response.status} - ${error.response.statusText}`
                )
            }
            throw error
        }
    }

    async getSystemStatus(): Promise<FortiGateSystemStatus> {
        try {
            const response = await this.client.get(`/api/v2/monitor/system/status`)
            return response.data.results
        } catch (error: any) {
            throw new Error(`Failed to get system status: ${error.message}`)
        }
    }

    async getPolicies(filters?: {
        policyid?: string
        name?: string
    }): Promise<FortiGatePolicy[]> {
        let path = '/firewall/policy'
        if (filters?.policyid) {
            path += `/${filters.policyid}`
        }

        const result = await this.request<FortiGatePolicy[]>('get', path)
        return Array.isArray(result) ? result : [result]
    }

    async getPolicy(policyid: string): Promise<FortiGatePolicy | null> {
        const policies = await this.getPolicies({ policyid })
        return policies[0] || null
    }

    async createPolicy(policy: Partial<FortiGatePolicy>): Promise<FortiGatePolicy> {
        const result = await this.request<FortiGatePolicy>('post', '/firewall/policy', policy)
        return result
    }

    async updatePolicy(
        policyid: string,
        updates: Partial<FortiGatePolicy>
    ): Promise<FortiGatePolicy> {
        const result = await this.request<FortiGatePolicy>(
            'put',
            `/firewall/policy/${policyid}`,
            updates
        )
        return result
    }

    async deletePolicy(policyid: string): Promise<void> {
        await this.request('delete', `/firewall/policy/${policyid}`)
    }

    async getAddresses(): Promise<FortiGateAddress[]> {
        const result = await this.request<FortiGateAddress[]>('get', '/firewall/address')
        return result
    }

    async getAddress(name: string): Promise<FortiGateAddress | null> {
        try {
            const result = await this.request<FortiGateAddress>('get', `/firewall/address/${name}`)
            return result
        } catch {
            return null
        }
    }

    async createAddress(address: FortiGateAddress): Promise<FortiGateAddress> {
        const result = await this.request<FortiGateAddress>('post', '/firewall/address', address)
        return result
    }

    async deleteAddress(name: string): Promise<void> {
        await this.request('delete', `/firewall/address/${name}`)
    }

    async getInterfaces(): Promise<FortiGateInterface[]> {
        try {
            const response = await this.client.get(
                `/api/v2/monitor/system/interface?vdom=${this.vdom}`
            )
            return response.data.results
        } catch (error: any) {
            throw new Error(`Failed to get interfaces: ${error.message}`)
        }
    }

    async getSessions(filters?: {
        srcaddr?: string
        dstaddr?: string
        proto?: string
    }): Promise<FortiGateSession[]> {
        try {
            let url = `/api/v2/monitor/firewall/session?vdom=${this.vdom}`
            if (filters?.srcaddr) url += `&srcaddr=${filters.srcaddr}`
            if (filters?.dstaddr) url += `&dstaddr=${filters.dstaddr}`
            if (filters?.proto) url += `&proto=${filters.proto}`

            const response = await this.client.get(url)
            return response.data.results || []
        } catch (error: any) {
            throw new Error(`Failed to get sessions: ${error.message}`)
        }
    }

    async getTrafficStats(interface_name: string): Promise<any> {
        try {
            const response = await this.client.get(
                `/api/v2/monitor/system/interface/select?interface_name=${interface_name}&vdom=${this.vdom}`
            )
            return response.data.results
        } catch (error: any) {
            throw new Error(`Failed to get traffic stats: ${error.message}`)
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.getSystemStatus()
            return true
        } catch {
            return false
        }
    }
}

// Factory function
export function createFortiGateClient(
    config: FortiGateConfig,
    vdom?: string
): FortiGateClient {
    return new FortiGateClient(config, vdom)
}
