import { describe, it, expect, beforeEach } from 'vitest'
import { WorkflowService } from './WorkflowService.js'
import { AssetService } from './AssetService.js'
import { MaintenanceService } from './MaintenanceService.js'
import type {
    AssetAssignmentInput,
    AssetAssignmentRecord,
    AssetBulkUpsertInput,
    AssetCreateInput,
    AssetEventInput,
    AssetEventPage,
    AssetEventRecord,
    AssetRecord,
    AssetSearchFilters,
    AssetSearchResult,
    AssetUpdatePatch,
    IAssetEventRepo,
    IAssetRepo,
    IAssignmentRepo,
    IMaintenanceRepo,
    IWorkflowRepo,
    MaintenanceTicketInput,
    MaintenanceTicketRecord,
    MaintenanceTicketStatusPatch,
    WorkflowRequestInput,
    WorkflowRequestPage,
    WorkflowRequestRecord,
    WorkflowStatusPatch
} from '@contracts/shared'

class FakeAssetRepo implements IAssetRepo {
    private items: AssetRecord[] = [{ id: 'asset-1', assetCode: 'A1', modelId: 'm1', status: 'in_stock', createdAt: new Date(), updatedAt: new Date() }]
    async create(_asset: AssetCreateInput): Promise<AssetRecord> { throw new Error('not used') }
    async update(id: string, patch: AssetUpdatePatch) {
        const existing = await this.getById(id)
        if (!existing) throw new Error('Asset not found')
        const updated = { ...existing, ...patch, updatedAt: new Date() }
        this.items = this.items.map(item => item.id === id ? updated : item)
        return updated
    }
    async getById(id: string) { return this.items.find(item => item.id === id) ?? null }
    async getByAssetCode(code: string) { return this.items.find(item => item.assetCode === code) ?? null }
    async delete() { return false }
    async search(_filters: AssetSearchFilters): Promise<AssetSearchResult> {
        return { items: [...this.items], total: this.items.length, page: 1, limit: 50 }
    }
    async bulkUpsert(_items: AssetBulkUpsertInput[]) { return { created: 0, updated: 0, items: [] } }
}

class FakeAssignmentRepo implements IAssignmentRepo {
    async assign(assetId: string, assignment: AssetAssignmentInput): Promise<AssetAssignmentRecord> {
        return {
            id: 'assign-1',
            assetId,
            assigneeType: assignment.assigneeType,
            assigneeId: assignment.assigneeId,
            assigneeName: assignment.assigneeName,
            assignedAt: assignment.assignedAt ?? new Date(),
            returnedAt: null,
            note: assignment.note ?? null
        }
    }
    async return() { return null }
    async listByAsset() { return [] }
    async getActiveByAsset() { return null }
}

class FakeMaintenanceRepo implements IMaintenanceRepo {
    async open(ticket: MaintenanceTicketInput): Promise<MaintenanceTicketRecord> {
        return {
            id: 'ticket-1',
            assetId: ticket.assetId,
            title: ticket.title,
            severity: ticket.severity,
            status: ticket.status ?? 'open',
            openedAt: ticket.openedAt ?? new Date(),
            closedAt: null,
            diagnosis: ticket.diagnosis ?? null,
            resolution: ticket.resolution ?? null,
            createdBy: ticket.createdBy ?? null,
            correlationId: ticket.correlationId ?? null
        }
    }
    async updateStatus(): Promise<MaintenanceTicketRecord | null> { return null }
    async list() { return { items: [], total: 0, page: 1, limit: 50 } }
    async getById() { return null }
}

class FakeEventRepo implements IAssetEventRepo {
    private items: AssetEventRecord[] = []
    private seq = 1
    async append(event: AssetEventInput): Promise<AssetEventRecord> {
        const record: AssetEventRecord = { id: `event-${this.seq++}`, createdAt: new Date(), payload: event.payload ?? {}, ...event }
        this.items.push(record)
        return record
    }
    async listByAsset(assetId: string, page: number, limit: number): Promise<AssetEventPage> {
        return { items: this.items.filter(item => item.assetId === assetId), page, limit }
    }
    getAll() { return this.items }
}

class FakeWorkflowRepo implements IWorkflowRepo {
    private items: WorkflowRequestRecord[] = []
    private seq = 1
    async submit(input: WorkflowRequestInput): Promise<WorkflowRequestRecord> {
        const record: WorkflowRequestRecord = {
            id: `req-${this.seq++}`,
            requestType: input.requestType,
            assetId: input.assetId ?? null,
            fromDept: input.fromDept ?? null,
            toDept: input.toDept ?? null,
            requestedBy: input.requestedBy ?? null,
            approvedBy: null,
            status: 'submitted',
            payload: input.payload ?? {},
            createdAt: new Date(),
            updatedAt: new Date(),
            correlationId: input.correlationId ?? null
        }
        this.items.push(record)
        return record
    }
    async approve(id: string, patch: WorkflowStatusPatch) {
        return this.updateStatus(id, 'approved', patch)
    }
    async reject(id: string, patch: WorkflowStatusPatch) {
        return this.updateStatus(id, 'rejected', patch)
    }
    async list(): Promise<WorkflowRequestPage> {
        return { items: [...this.items], total: this.items.length, page: 1, limit: 50 }
    }
    async getById(id: string): Promise<WorkflowRequestRecord | null> {
        return this.items.find(item => item.id === id) ?? null
    }
    async updateStatus(id: string, status: WorkflowRequestRecord['status'], patch: WorkflowStatusPatch) {
        const existing = await this.getById(id)
        if (!existing) return null
        const updated: WorkflowRequestRecord = {
            ...existing,
            status,
            approvedBy: patch.approvedBy ?? existing.approvedBy,
            payload: patch.payload ?? existing.payload,
            correlationId: patch.correlationId ?? existing.correlationId,
            updatedAt: new Date()
        }
        this.items = this.items.map(item => item.id === id ? updated : item)
        return updated
    }
}

describe('WorkflowService', () => {
    const ctx = { userId: 'u1', correlationId: 'c1' }
    let workflow: WorkflowService
    let events: FakeEventRepo
    let workflowRepo: FakeWorkflowRepo

    beforeEach(() => {
        const assetsRepo = new FakeAssetRepo()
        events = new FakeEventRepo()
        const assetService = new AssetService(assetsRepo, new FakeAssignmentRepo(), events, new FakeMaintenanceRepo())
        const maintenanceService = new MaintenanceService(assetsRepo, new FakeAssignmentRepo(), new FakeMaintenanceRepo(), events)
        workflowRepo = new FakeWorkflowRepo()
        workflow = new WorkflowService(workflowRepo, assetService, maintenanceService, events)
    })

    it('submits and approves workflow request', async () => {
        const request = await workflow.submitRequest({
            requestType: 'move',
            assetId: 'asset-1',
            payload: { locationId: 'loc-2' }
        }, ctx)
        expect(request.status).toBe('submitted')

        const approved = await workflow.approveRequest(request.id, ctx)
        expect(approved.status).toBe('approved')
        expect(events.getAll().some(item => item.eventType === 'REQUEST_APPROVED')).toBe(true)
    })
})
