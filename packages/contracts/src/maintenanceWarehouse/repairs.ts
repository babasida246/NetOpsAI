import type { PartAction, RepairSeverity, RepairStatus, RepairType } from '@domain/core'

export interface RepairOrderRecord {
    id: string
    assetId: string
    ciId?: string | null
    code: string
    title: string
    description?: string | null
    severity: RepairSeverity
    status: RepairStatus
    openedAt: Date
    closedAt?: Date | null
    diagnosis?: string | null
    resolution?: string | null
    repairType: RepairType
    technicianName?: string | null
    vendorId?: string | null
    laborCost?: number | null
    partsCost?: number | null
    downtimeMinutes?: number | null
    createdBy?: string | null
    correlationId?: string | null
    createdAt: Date
    updatedAt: Date
}

export interface RepairOrderPartRecord {
    id: string
    repairOrderId: string
    partId?: string | null
    partName?: string | null
    warehouseId?: string | null
    action: PartAction
    qty: number
    unitCost?: number | null
    serialNo?: string | null
    note?: string | null
    stockDocumentId?: string | null
    createdAt: Date
}

export interface RepairOrderCreateInput {
    assetId: string
    ciId?: string | null
    title: string
    description?: string | null
    severity: RepairSeverity
    repairType: RepairType
    technicianName?: string | null
    vendorId?: string | null
    laborCost?: number | null
    downtimeMinutes?: number | null
    createdBy?: string | null
    correlationId?: string | null
}

export interface RepairOrderUpdatePatch {
    title?: string
    description?: string | null
    severity?: RepairSeverity
    status?: RepairStatus
    diagnosis?: string | null
    resolution?: string | null
    repairType?: RepairType
    technicianName?: string | null
    vendorId?: string | null
    laborCost?: number | null
    partsCost?: number | null
    downtimeMinutes?: number | null
    closedAt?: Date | null
    correlationId?: string | null
    ciId?: string | null
}

export interface RepairOrderFilters {
    assetId?: string
    ciId?: string
    status?: RepairStatus
    q?: string
    from?: string
    to?: string
    page?: number
    limit?: number
}

export interface RepairOrderPage {
    items: RepairOrderRecord[]
    total: number
    page: number
    limit: number
}

export interface RepairOrderPartInput {
    partId?: string | null
    partName?: string | null
    warehouseId?: string | null
    action: PartAction
    qty: number
    unitCost?: number | null
    serialNo?: string | null
    note?: string | null
    stockDocumentId?: string | null
}

export interface RepairOrderDetail {
    order: RepairOrderRecord
    parts: RepairOrderPartRecord[]
}

export interface IRepairOrderRepo {
    create(input: RepairOrderCreateInput): Promise<RepairOrderRecord>
    update(id: string, patch: RepairOrderUpdatePatch): Promise<RepairOrderRecord | null>
    getById(id: string): Promise<RepairOrderRecord | null>
    list(filters: RepairOrderFilters): Promise<RepairOrderPage>
}

export interface IRepairPartRepo {
    add(orderId: string, input: RepairOrderPartInput): Promise<RepairOrderPartRecord>
    listByOrder(orderId: string): Promise<RepairOrderPartRecord[]>
}
