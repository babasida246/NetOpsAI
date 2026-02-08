import { API_BASE, apiJsonData } from '$lib/api/httpClient'
import type { CanonicalConfig, Vendor } from './types'

const TOOLING_BASE = `${API_BASE}/netops/tools`

export async function syncConfigToCmdb(payload: {
    deviceId: string
    vendor: Vendor
    config: CanonicalConfig
    commands: string[]
    configHash: string
}): Promise<{ status: 'success' | 'failed'; message: string }> {
    try {
        await apiJsonData(`${TOOLING_BASE}/config/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        return { status: 'success', message: 'CMDB sync completed.' }
    } catch (error: any) {
        if (typeof localStorage !== 'undefined') {
            const key = 'netops.cli.cmdbSync.v1'
            const raw = localStorage.getItem(key)
            const existing = raw ? (JSON.parse(raw) as any[]) : []
            existing.unshift({
                ...payload,
                timestamp: new Date().toISOString(),
                error: error?.message || 'CMDB sync failed'
            })
            localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)))
        }
        return { status: 'failed', message: 'CMDB sync failed. Stored locally for later sync.' }
    }
}
