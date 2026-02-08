/**
 * Admin Module
 * 
 * Admin operations: user management, audit logs.
 */
import { API_BASE, authJson, authJsonData } from '../../core/http-client'
import type { ApiResponse } from '../../core/types'

// ============================================================================
// Types
// ============================================================================

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
    details?: Record<string, unknown> | null
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: string
}

export interface CreateUserRequest {
    email: string
    name: string
    password: string
    role?: string
}

export interface UpdateUserRequest {
    email?: string
    name?: string
    role?: string
    isActive?: boolean
}

// ============================================================================
// Admin Users API
// ============================================================================

export async function listUsers(): Promise<ApiResponse<AdminUser[]>> {
    return authJson<ApiResponse<AdminUser[]>>(`${API_BASE}/v1/admin/users`)
}

export async function createUser(data: CreateUserRequest): Promise<AdminUser> {
    return authJsonData<AdminUser>(`${API_BASE}/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<AdminUser> {
    return authJsonData<AdminUser>(`${API_BASE}/v1/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
    return authJsonData<{ success: boolean }>(`${API_BASE}/v1/admin/users/${id}`, { method: 'DELETE' })
}

export async function resetPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return authJsonData<{ success: boolean; message: string }>(`${API_BASE}/v1/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
    })
}

// ============================================================================
// Audit Logs API
// ============================================================================

export async function listAuditLogs(params?: { limit?: number; page?: number }): Promise<ApiResponse<AuditLogEntry[]>> {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', params.limit.toString())
    if (params?.page) search.append('page', params.page.toString())
    const query = search.toString()
    return authJson<ApiResponse<AuditLogEntry[]>>(`${API_BASE}/v1/admin/audit-logs${query ? `?${query}` : ''}`)
}
