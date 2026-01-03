import { API_BASE, apiJson } from '$lib/api/httpClient'

const TOOLS_BASE = `${API_BASE}/tools`

export async function generateConfig(data: {
    vendor: 'cisco' | 'fortigate' | 'mikrotik'
    action: 'set_interface_ip' | 'set_description' | 'create_vlan' | 'add_static_route'
    params: Record<string, any>
}): Promise<{ command: string }> {
    return apiJson(`${TOOLS_BASE}/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}
