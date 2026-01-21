export type StockDocType = 'receipt' | 'issue' | 'adjust' | 'transfer'
export type StockDocStatus = 'draft' | 'posted' | 'canceled'

export interface StockDocumentRecord {
    id: string
    docType: StockDocType
    code: string
    status: StockDocStatus
    warehouseId?: string | null
    targetWarehouseId?: string | null
    docDate: string
    refType?: string | null
    refId?: string | null
    note?: string | null
    createdBy?: string | null
    approvedBy?: string | null
    correlationId?: string | null
    createdAt: Date
    updatedAt: Date
}

export interface StockDocumentLineRecord {
    id: string
    documentId: string
    partId: string
    qty: number
    unitCost?: number | null
    serialNo?: string | null
    note?: string | null
    adjustDirection?: 'plus' | 'minus' | null
}

export interface StockDocumentLineInput {
    partId: string
    qty: number
    unitCost?: number | null
    serialNo?: string | null
    note?: string | null
    adjustDirection?: 'plus' | 'minus' | null
}

export interface StockDocumentDetail {
    document: StockDocumentRecord
    lines: StockDocumentLineRecord[]
}

export interface StockDocumentCreateInput {
    docType: StockDocType
    code: string
    warehouseId?: string | null
    targetWarehouseId?: string | null
    docDate?: string
    refType?: string | null
    refId?: string | null
    note?: string | null
    createdBy?: string | null
    correlationId?: string | null
}

export interface StockDocumentUpdatePatch {
    docDate?: string
    note?: string | null
    warehouseId?: string | null
    targetWarehouseId?: string | null
    correlationId?: string | null
}

export interface StockDocumentListFilters {
    docType?: StockDocType
    status?: StockDocStatus
    from?: string
    to?: string
    page?: number
    limit?: number
}

export interface StockDocumentPage {
    items: StockDocumentRecord[]
    total: number
    page: number
    limit: number
}

export interface IStockDocumentRepo {
    create(input: StockDocumentCreateInput): Promise<StockDocumentRecord>
    update(id: string, patch: StockDocumentUpdatePatch): Promise<StockDocumentRecord | null>
    getById(id: string): Promise<StockDocumentRecord | null>
    list(filters: StockDocumentListFilters): Promise<StockDocumentPage>
    listLines(documentId: string): Promise<StockDocumentLineRecord[]>
    replaceLines(documentId: string, lines: StockDocumentLineInput[]): Promise<StockDocumentLineRecord[]>
    setStatus(id: string, status: StockDocStatus, approvedBy?: string | null): Promise<StockDocumentRecord | null>
}
