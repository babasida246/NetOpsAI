import { API_BASE, apiJson, requireAccessToken } from './httpClient'

const authJson = <T>(input: string, init?: RequestInit) => {
    requireAccessToken()
    return apiJson<T>(input, init)
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
    return authJson(`${API_BASE}/admin/users`)
}

export async function createUser(data: { email: string; name: string; password: string; role?: string }): Promise<AdminUser> {
    return authJson(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateUser(id: string, data: Partial<{ email: string; name: string; role: string; isActive: boolean }>): Promise<AdminUser> {
    return authJson(`${API_BASE}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
    return authJson(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' })
}

export async function resetPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return authJson(`${API_BASE}/admin/users/${id}/reset-password`, {
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
    return authJson(`${API_BASE}/admin/audit-logs${query ? `?${query}` : ''}`)
}
