import { API_BASE, apiJson, apiJsonCached, apiJsonData, requireAccessToken } from './httpClient'

const authJson = <T>(input: string, init?: RequestInit) => {
    requireAccessToken()
    return apiJson<T>(input, init)
}

const authJsonData = <T>(input: string, init?: RequestInit) => {
    requireAccessToken()
    return apiJsonData<T>(input, init)
}

const authJsonCached = <T>(
    input: string,
    init?: RequestInit,
    options?: { ttlMs?: number; errorTtlMs?: number }
) => {
    requireAccessToken()
    return apiJsonCached<T>(input, init, {
        ttlMs: options?.ttlMs ?? 5000,
        errorTtlMs: options?.errorTtlMs ?? 10000
    })
}

export interface AdminUser {
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
}

export interface AuditLogEntry {
    id: string
    userId: string | null
    action: string
    resource: string
    resourceId: string | null
    details?: Record<string, any> | null
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: string
}

export async function listUsers(): Promise<{ data: AdminUser[]; meta: any }> {
    return authJsonCached(`${API_BASE}/v1/admin/users`, undefined, { ttlMs: 5000, errorTtlMs: 10000 })
}

export async function createUser(data: { email: string; name: string; password: string; role?: string }): Promise<AdminUser> {
    return authJsonData(`${API_BASE}/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateUser(id: string, data: Partial<{ email: string; name: string; role: string; isActive: boolean }>): Promise<AdminUser> {
    return authJsonData(`${API_BASE}/v1/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
    return authJsonData(`${API_BASE}/v1/admin/users/${id}`, { method: 'DELETE' })
}

export async function resetPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return authJsonData(`${API_BASE}/v1/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
    })
}

export async function listAuditLogs(params?: { limit?: number; page?: number }): Promise<{ data: AuditLogEntry[]; meta: any }> {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', params.limit.toString())
    if (params?.page) search.append('page', params.page.toString())
    const query = search.toString()
    return authJsonCached(`${API_BASE}/v1/admin/audit-logs${query ? `?${query}` : ''}`, undefined, { ttlMs: 5000, errorTtlMs: 10000 })
}
