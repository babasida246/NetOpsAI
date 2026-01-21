import { API_BASE, apiJson } from './httpClient'
import { buildQuery, getAssetHeaders } from './assets'

export type WarehouseRecord = {
    id: string
    code: string
    name: string
    locationId?: string | null
    createdAt: string
}

export type SparePartRecord = {
    id: string
    partCode: string
    name: string
    category?: string | null
    uom?: string | null
    manufacturer?: string | null
    model?: string | null
    spec: Record<string, unknown>
    minLevel: number
    createdAt: string
}

export type StockViewRecord = {
    warehouseId: string
    warehouseCode: string
    warehouseName: string
    partId: string
    partCode: string
    partName: string
    onHand: number
    reserved: number
    available: number
    uom?: string | null
    minLevel: number
}

export type StockOnHandRow = {
    partId: string
    partCode: string
    partName: string
    warehouseId: string
    warehouseName: string
    onHand: number
    uom?: string | null
    minLevel: number
}

export type StockAvailableRow = {
    partId: string
    partCode: string
    partName: string
    warehouseId: string
    warehouseName: string
    onHand: number
    reserved: number
    available: number
    uom?: string | null
    minLevel: number
}

export type ReorderAlertRow = {
    partId: string
    partCode: string
    partName: string
    warehouseId: string
    warehouseName: string
    onHand: number
    minLevel: number
    uom?: string | null
}

export type FefoLotRow = {
    lotId: string
    lotNumber: string
    partId: string
    partCode: string
    partName: string
    warehouseId: string
    warehouseName: string
    manufactureDate?: string | null
    expiryDate?: string | null
    daysUntilExpiry?: number | null
    onHand: number
    uom?: string | null
    status: 'expired' | 'critical' | 'warning' | 'normal'
}

export type ValuationResult = {
    total: number
    currency: string
    items: Array<{
        partId: string
        partCode: string
        partName: string
        onHand: number
        avgCost: number
        value: number
    }>
}

export type StockDocumentRecord = {
    id: string
    docType: 'receipt' | 'issue' | 'adjust' | 'transfer'
    code: string
    status: 'draft' | 'posted' | 'canceled'
    warehouseId?: string | null
    targetWarehouseId?: string | null
    docDate: string
    refType?: string | null
    refId?: string | null
    note?: string | null
    createdBy?: string | null
    approvedBy?: string | null
    correlationId?: string | null
    createdAt: string
    updatedAt: string
}

export type StockDocumentLine = {
    id?: string
    documentId?: string
    partId: string
    qty: number
    unitCost?: number | null
    serialNo?: string | null
    note?: string | null
    adjustDirection?: 'plus' | 'minus' | null
}

export type StockDocumentDetail = {
    document: StockDocumentRecord
    lines: StockDocumentLine[]
}

export type StockMovementRecord = {
    id: string
    warehouseId: string
    partId: string
    movementType: 'in' | 'out' | 'adjust_in' | 'adjust_out' | 'transfer_in' | 'transfer_out' | 'reserve' | 'release'
    qty: number
    unitCost?: number | null
    refType?: string | null
    refId?: string | null
    actorUserId?: string | null
    correlationId?: string | null
    createdAt: string
}

export type StockDocumentCreateInput = {
    docType: StockDocumentRecord['docType']
    code?: string
    warehouseId?: string | null
    targetWarehouseId?: string | null
    docDate?: string
    refType?: string | null
    refId?: string | null
    note?: string | null
    lines: StockDocumentLine[]
}

export type StockDocumentUpdateInput = {
    docDate?: string
    note?: string | null
    warehouseId?: string | null
    targetWarehouseId?: string | null
    lines: StockDocumentLine[]
}

type ApiResponse<T> = { data: T; meta?: { total?: number; page?: number; limit?: number } }

export async function listWarehouses(): Promise<ApiResponse<WarehouseRecord[]>> {
    return apiJson<ApiResponse<WarehouseRecord[]>>(`${API_BASE}/v1/warehouses`, {
        headers: getAssetHeaders()
    })
}

export async function createWarehouse(input: { code: string; name: string; locationId?: string | null }): Promise<ApiResponse<WarehouseRecord>> {
    return apiJson<ApiResponse<WarehouseRecord>>(`${API_BASE}/v1/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateWarehouse(id: string, patch: { code?: string; name?: string; locationId?: string | null }): Promise<ApiResponse<WarehouseRecord>> {
    return apiJson<ApiResponse<WarehouseRecord>>(`${API_BASE}/v1/warehouses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function listSpareParts(params: { q?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<SparePartRecord[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<SparePartRecord[]>>(`${API_BASE}/v1/spare-parts${query}`, {
        headers: getAssetHeaders()
    })
}

export async function createSparePart(input: {
    partCode: string
    name: string
    category?: string | null
    uom?: string | null
    manufacturer?: string | null
    model?: string | null
    spec?: Record<string, unknown>
    minLevel?: number
}): Promise<ApiResponse<SparePartRecord>> {
    return apiJson<ApiResponse<SparePartRecord>>(`${API_BASE}/v1/spare-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateSparePart(id: string, patch: Partial<{
    partCode: string
    name: string
    category?: string | null
    uom?: string | null
    manufacturer?: string | null
    model?: string | null
    spec?: Record<string, unknown>
    minLevel?: number
}>): Promise<ApiResponse<SparePartRecord>> {
    return apiJson<ApiResponse<SparePartRecord>>(`${API_BASE}/v1/spare-parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function listStockView(params: { warehouseId?: string; q?: string; belowMin?: boolean; page?: number; limit?: number } = {}): Promise<ApiResponse<StockViewRecord[]>> {
    const query = buildQuery({
        warehouseId: params.warehouseId,
        q: params.q,
        belowMin: params.belowMin ? 'true' : undefined,
        page: params.page,
        limit: params.limit
    })
    return apiJson<ApiResponse<StockViewRecord[]>>(`${API_BASE}/v1/stock/view${query}`, {
        headers: getAssetHeaders()
    })
}

export async function listStockDocuments(params: { docType?: string; status?: string; from?: string; to?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<StockDocumentRecord[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<StockDocumentRecord[]>>(`${API_BASE}/v1/stock-documents${query}`, {
        headers: getAssetHeaders()
    })
}

export async function getStockDocument(id: string): Promise<ApiResponse<StockDocumentDetail>> {
    return apiJson<ApiResponse<StockDocumentDetail>>(`${API_BASE}/v1/stock-documents/${id}`, {
        headers: getAssetHeaders()
    })
}

export async function createStockDocument(input: StockDocumentCreateInput): Promise<ApiResponse<StockDocumentDetail>> {
    return apiJson<ApiResponse<StockDocumentDetail>>(`${API_BASE}/v1/stock-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateStockDocument(id: string, input: StockDocumentUpdateInput): Promise<ApiResponse<StockDocumentDetail>> {
    return apiJson<ApiResponse<StockDocumentDetail>>(`${API_BASE}/v1/stock-documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function postStockDocument(id: string): Promise<ApiResponse<StockDocumentRecord>> {
    return apiJson<ApiResponse<StockDocumentRecord>>(`${API_BASE}/v1/stock-documents/${id}/post`, {
        method: 'POST',
        headers: getAssetHeaders()
    })
}

export async function cancelStockDocument(id: string): Promise<ApiResponse<StockDocumentRecord>> {
    return apiJson<ApiResponse<StockDocumentRecord>>(`${API_BASE}/v1/stock-documents/${id}/cancel`, {
        method: 'POST',
        headers: getAssetHeaders()
    })
}

export async function listStockMovements(params: { partId?: string; warehouseId?: string; from?: string; to?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<StockMovementRecord[]>> {
    const query = buildQuery(params)
    return apiJson<ApiResponse<StockMovementRecord[]>>(`${API_BASE}/v1/stock/ledger${query}`, {
        headers: getAssetHeaders()
    })
}

export async function reportStockOnHand(params: { warehouseId?: string; itemId?: string; limit?: number } = {}): Promise<StockOnHandRow[]> {
    const query = buildQuery(params)
    return apiJson<StockOnHandRow[]>(`${API_BASE}/v1/reports/stock-on-hand${query}`, {
        headers: getAssetHeaders()
    })
}

export async function reportStockAvailable(params: { warehouseId?: string; itemId?: string; limit?: number } = {}): Promise<StockAvailableRow[]> {
    const query = buildQuery(params)
    return apiJson<StockAvailableRow[]>(`${API_BASE}/v1/reports/stock-available${query}`, {
        headers: getAssetHeaders()
    })
}

export async function reportReorderAlerts(params: { warehouseId?: string; itemId?: string; limit?: number } = {}): Promise<ReorderAlertRow[]> {
    const query = buildQuery(params)
    return apiJson<ReorderAlertRow[]>(`${API_BASE}/v1/reports/reorder-alerts${query}`, {
        headers: getAssetHeaders()
    })
}

export async function reportFefoLots(params: { warehouseId?: string; daysThreshold?: number; limit?: number } = {}): Promise<FefoLotRow[]> {
    const query = buildQuery(params)
    return apiJson<FefoLotRow[]>(`${API_BASE}/v1/reports/fefo-lots${query}`, {
        headers: getAssetHeaders()
    })
}

export async function reportValuation(params: { warehouseId?: string; currencyId?: string; limit?: number } = {}): Promise<ValuationResult> {
    const query = buildQuery(params)
    return apiJson<ValuationResult>(`${API_BASE}/v1/reports/valuation${query}`, { headers: getAssetHeaders() })
}
