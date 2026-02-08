/**
 * Asset Management Module
 * 
 * Advanced asset operations: import/export, inventory, workflows, reminders.
 */
import { API_BASE, apiJson, buildQuery, getAssetHeaders } from '../../core/http-client'
import type { ApiResponse } from '../../core/types'
import type { AssetStatus, MaintenanceTicket } from './index'

// ============================================================================
// Types
// ============================================================================

export type AssetImportRow = {
    assetCode: string
    modelId: string
    status?: AssetStatus
    locationId?: string
    vendorId?: string
    serialNo?: string
    macAddress?: string
    mgmtIp?: string
    hostname?: string
    vlanId?: number
    switchName?: string
    switchPort?: string
    purchaseDate?: string
    warrantyEnd?: string
    notes?: string
}

export type AssetImportPreview = {
    items: { row: AssetImportRow; valid: boolean; errors: string[]; existingId?: string }[]
    total: number
    validCount: number
    invalidCount: number
}

export type AssetImportCommitResult = { created: number; updated: number; skipped: number }

export type Attachment = {
    id: string
    assetId: string
    fileName: string
    mimeType?: string | null
    storageKey: string
    sizeBytes?: number | null
    version: number
    createdAt: string
}

export type InventorySession = {
    id: string
    name: string
    locationId?: string | null
    status: 'draft' | 'in_progress' | 'closed' | 'canceled'
    createdAt: string
    startedAt?: string | null
    closedAt?: string | null
}

export type InventoryItem = {
    id: string
    sessionId: string
    assetId?: string | null
    expectedLocationId?: string | null
    scannedLocationId?: string | null
    scannedAt?: string | null
    status: 'found' | 'missing' | 'moved' | 'unknown'
    note?: string | null
}

export type WorkflowRequest = {
    id: string
    requestType: 'assign' | 'return' | 'move' | 'repair' | 'dispose'
    assetId?: string | null
    status: 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'done' | 'canceled'
    requestedBy?: string | null
    approvedBy?: string | null
    payload: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export type Reminder = {
    id: string
    reminderType: 'warranty_expiring' | 'maintenance_due'
    assetId?: string | null
    dueAt: string
    status: 'pending' | 'sent' | 'canceled'
    channel: string
    createdAt: string
}

// ============================================================================
// Import API
// ============================================================================

export async function previewAssetImport(rows: AssetImportRow[]): Promise<ApiResponse<AssetImportPreview>> {
    return apiJson<ApiResponse<AssetImportPreview>>(`${API_BASE}/v1/assets/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify({ rows })
    })
}

export async function commitAssetImport(rows: AssetImportRow[]): Promise<ApiResponse<AssetImportCommitResult>> {
    return apiJson<ApiResponse<AssetImportCommitResult>>(`${API_BASE}/v1/assets/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify({ rows })
    })
}

// ============================================================================
// Maintenance API
// ============================================================================

export async function listMaintenanceTickets(params: { status?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<MaintenanceTicket[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<MaintenanceTicket[]>>(`${API_BASE}/v1/maintenance${query}`, {
        headers: getAssetHeaders()
    })
}

// ============================================================================
// Inventory Sessions API
// ============================================================================

export async function listInventorySessions(params: { status?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<InventorySession[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<InventorySession[]>>(`${API_BASE}/v1/inventory/sessions${query}`, {
        headers: getAssetHeaders()
    })
}

export async function createInventorySession(input: { name: string; locationId?: string }): Promise<ApiResponse<InventorySession>> {
    return apiJson<ApiResponse<InventorySession>>(`${API_BASE}/v1/inventory/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function getInventorySessionDetail(id: string): Promise<ApiResponse<{ session: InventorySession; items: InventoryItem[] }>> {
    return apiJson<ApiResponse<{ session: InventorySession; items: InventoryItem[] }>>(`${API_BASE}/v1/inventory/sessions/${id}`, {
        headers: getAssetHeaders()
    })
}

export async function scanInventoryAsset(sessionId: string, input: { assetId?: string; assetCode?: string; scannedLocationId?: string; note?: string }): Promise<ApiResponse<InventoryItem>> {
    return apiJson<ApiResponse<InventoryItem>>(`${API_BASE}/v1/inventory/sessions/${sessionId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function closeInventorySession(sessionId: string): Promise<ApiResponse<{ session: InventorySession; counts: Record<string, number> }>> {
    return apiJson<ApiResponse<{ session: InventorySession; counts: Record<string, number> }>>(`${API_BASE}/v1/inventory/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() }
    })
}

export async function getInventoryReport(sessionId: string): Promise<ApiResponse<{ session: InventorySession; counts: Record<string, number> }>> {
    return apiJson<ApiResponse<{ session: InventorySession; counts: Record<string, number> }>>(`${API_BASE}/v1/inventory/sessions/${sessionId}/report`, {
        headers: getAssetHeaders()
    })
}

// ============================================================================
// Workflow Requests API
// ============================================================================

export async function listWorkflowRequests(params: { status?: string; requestType?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<WorkflowRequest[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<WorkflowRequest[]>>(`${API_BASE}/v1/workflows${query}`, {
        headers: getAssetHeaders()
    })
}

export async function getWorkflowRequest(id: string): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows/${id}`, {
        headers: getAssetHeaders()
    })
}

export async function createWorkflowRequest(input: { requestType: string; assetId?: string; fromDept?: string; toDept?: string; payload?: Record<string, unknown> }): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function approveWorkflowRequest(id: string): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows/${id}/approve`, {
        method: 'POST',
        headers: { ...getAssetHeaders() }
    })
}

export async function rejectWorkflowRequest(id: string, reason?: string): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify({ reason })
    })
}

export async function executeWorkflowRequest(id: string): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows/${id}/execute`, {
        method: 'POST',
        headers: { ...getAssetHeaders() }
    })
}

export async function updateWorkflowRequest(id: string, patch: Partial<WorkflowRequest>): Promise<ApiResponse<WorkflowRequest>> {
    return apiJson<ApiResponse<WorkflowRequest>>(`${API_BASE}/v1/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

// ============================================================================
// Reminders API
// ============================================================================

export async function listReminders(params: { status?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<Reminder[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<Reminder[]>>(`${API_BASE}/v1/reminders${query}`, {
        headers: getAssetHeaders()
    })
}

export async function cancelReminder(id: string): Promise<ApiResponse<Reminder>> {
    return apiJson<ApiResponse<Reminder>>(`${API_BASE}/v1/reminders/${id}/cancel`, {
        method: 'POST',
        headers: { ...getAssetHeaders() }
    })
}
