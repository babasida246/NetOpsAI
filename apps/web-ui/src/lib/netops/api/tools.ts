import { API_BASE, apiJsonData } from '$lib/api/httpClient'

const TOOLS_BASE = `${API_BASE}/tools`

export async function generateConfig(data: {
    vendor: 'cisco' | 'fortigate' | 'mikrotik'
    action: 'baseline'
    | 'wan_uplink'
    | 'lan_vlan'
    | 'dhcp_server'
    | 'static_route'
    | 'ospf'
    | 'nat_overload'
    | 'firewall_basic'
    | 'load_balancing'
    | 'bridge'
    | 'secure_baseline'
    params: Record<string, any>
}): Promise<{ command: string }> {
    return apiJsonData(`${TOOLS_BASE}/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}
