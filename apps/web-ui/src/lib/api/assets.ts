import { API_BASE, apiJson, authorizedFetch } from './httpClient'

export type AssetStatus = 'in_stock' | 'in_use' | 'in_repair' | 'retired' | 'disposed' | 'lost'
export type AssigneeType = 'person' | 'department' | 'system'
export type MaintenanceSeverity = 'low' | 'medium' | 'high' | 'critical'
export type MaintenanceStatus = 'open' | 'in_progress' | 'closed' | 'canceled'

export type Asset = {
    id: string
    assetCode: string
    status: AssetStatus
    modelId?: string | null
    categoryId?: string | null
    vendorId?: string | null
    locationId?: string | null
    serialNo?: string | null
    macAddress?: string | null
    mgmtIp?: string | null
    hostname?: string | null
    vlanId?: number | null
    switchName?: string | null
    switchPort?: string | null
    purchaseDate?: string | null
    warrantyEnd?: string | null
    notes?: string | null
    modelName?: string | null
    modelBrand?: string | null
    categoryName?: string | null
    vendorName?: string | null
    locationName?: string | null
    createdAt: string
    updatedAt: string
}

export type AssetAssignment = {
    id: string
    assetId: string
    assigneeType: AssigneeType
    assigneeId?: string | null
    assigneeName: string
    assignedAt: string
    returnedAt?: string | null
    note?: string | null
}

export type MaintenanceTicket = {
    id: string
    assetId: string
    title: string
    severity: MaintenanceSeverity
    status: MaintenanceStatus
    openedAt: string
    closedAt?: string | null
    diagnosis?: string | null
    resolution?: string | null
    createdBy?: string | null
}

export type AssetEvent = {
    id: string
    assetId: string
    eventType: string
    payload: Record<string, unknown>
    actorUserId?: string | null
    correlationId?: string | null
    createdAt: string
}

export type AssetSearchParams = {
    query?: string
    status?: AssetStatus
    categoryId?: string
    modelId?: string
    vendorId?: string
    locationId?: string
    warrantyExpiringDays?: number
    page?: number
    limit?: number
    sort?: 'newest' | 'asset_code_asc' | 'asset_code_desc' | 'warranty_end_asc'
}

export type AssetCreateInput = {
    assetCode: string
    modelId: string
    status?: AssetStatus
    vendorId?: string
    locationId?: string
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

export type AssetAssignInput = {
    assigneeType: AssigneeType
    assigneeId: string
    assigneeName: string
    assignedAt?: string
    note?: string
}

export type MaintenanceCreateInput = {
    assetId: string
    title: string
    severity: MaintenanceSeverity
    diagnosis?: string
    resolution?: string
}

type ApiResponse<T> = { data: T; meta?: { total?: number; page?: number; limit?: number } }

export function getAssetHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || ''
    const role = localStorage.getItem('userRole') || 'viewer'
    if (!userId) {
        throw new Error('Authentication required')
    }
    return {
        'x-user-id': userId,
        'x-user-role': role
    }
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
    if (entries.length === 0) return ''
    const query = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    return `?${query}`
}

export async function listAssets(params: AssetSearchParams = {}): Promise<ApiResponse<Asset[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<Asset[]>>(`${API_BASE}/v1/assets${query}`, {
        headers: getAssetHeaders()
    })
}

export async function exportAssetsCsv(params: AssetSearchParams = {}): Promise<string> {
    const query = buildQuery({ ...params, export: 'csv' })
    const response = await authorizedFetch(`${API_BASE}/v1/assets${query}`, {
        headers: getAssetHeaders()
    })
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response.text()
}

export async function getAssetDetail(assetId: string): Promise<ApiResponse<{
    asset: Asset
    assignments: AssetAssignment[]
    maintenance: MaintenanceTicket[]
}>> {
    return apiJson<ApiResponse<{ asset: Asset; assignments: AssetAssignment[]; maintenance: MaintenanceTicket[] }>>(
        `${API_BASE}/v1/assets/${assetId}`,
        { headers: getAssetHeaders() }
    )
}

export async function getAssetTimeline(assetId: string, page = 1, limit = 20): Promise<ApiResponse<AssetEvent[]>> {
    const query = buildQuery({ page, limit })
    return apiJson<ApiResponse<AssetEvent[]>>(`${API_BASE}/v1/assets/${assetId}/timeline${query}`, {
        headers: getAssetHeaders()
    })
}

export async function createAsset(input: AssetCreateInput): Promise<ApiResponse<Asset>> {
    return apiJson<ApiResponse<Asset>>(`${API_BASE}/v1/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateAsset(assetId: string, patch: Partial<AssetCreateInput>): Promise<ApiResponse<Asset>> {
    return apiJson<ApiResponse<Asset>>(`${API_BASE}/v1/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function assignAsset(assetId: string, input: AssetAssignInput): Promise<ApiResponse<{ asset: Asset; assignment: AssetAssignment }>> {
    return apiJson<ApiResponse<{ asset: Asset; assignment: AssetAssignment }>>(`${API_BASE}/v1/assets/${assetId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function returnAsset(assetId: string, note?: string): Promise<ApiResponse<{ asset: Asset; assignment: AssetAssignment }>> {
    return apiJson<ApiResponse<{ asset: Asset; assignment: AssetAssignment }>>(`${API_BASE}/v1/assets/${assetId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify({ note })
    })
}

export async function moveAsset(assetId: string, locationId: string): Promise<ApiResponse<Asset>> {
    return apiJson<ApiResponse<Asset>>(`${API_BASE}/v1/assets/${assetId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify({ locationId })
    })
}

export async function openMaintenanceTicket(input: MaintenanceCreateInput): Promise<ApiResponse<MaintenanceTicket>> {
    return apiJson<ApiResponse<MaintenanceTicket>>(`${API_BASE}/v1/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}
