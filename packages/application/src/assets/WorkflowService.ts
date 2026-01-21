import { AppError } from '@domain/core'
import type {
    AssetAssignmentInput,
    IAssetEventRepo,
    IWorkflowRepo,
    MaintenanceTicketInput,
    WorkflowRequestRecord
} from '@contracts/shared'
import { AssetService } from './AssetService.js'
import { MaintenanceService } from './MaintenanceService.js'

export interface WorkflowServiceContext {
    userId: string
    correlationId: string
}

export class WorkflowService {
    constructor(
        private workflows: IWorkflowRepo,
        private assets: AssetService,
        private maintenance: MaintenanceService,
        private events: IAssetEventRepo
    ) { }

    async submitRequest(
        input: Parameters<IWorkflowRepo['submit']>[0],
        ctx: WorkflowServiceContext
    ): Promise<WorkflowRequestRecord> {
        if (input.assetId) {
            await this.assets.getAssetById(input.assetId)
        }
        const request = await this.workflows.submit({
            ...input,
            requestedBy: ctx.userId,
            correlationId: ctx.correlationId
        })
        if (request.assetId) {
            await this.appendAssetEvent(request.assetId, 'REQUEST_SUBMITTED', {
                requestId: request.id,
                requestType: request.requestType
            }, ctx)
        }
        return request
    }

    async approveRequest(id: string, ctx: WorkflowServiceContext): Promise<WorkflowRequestRecord> {
        const request = await this.requireRequest(id)
        if (request.status !== 'submitted') {
            throw AppError.conflict('Request is not in submitted state')
        }
        const updated = await this.workflows.updateStatus(id, 'approved', {
            approvedBy: ctx.userId,
            correlationId: ctx.correlationId
        })
        if (!updated) {
            throw AppError.internal('Failed to approve request')
        }
        if (updated.assetId) {
            await this.appendAssetEvent(updated.assetId, 'REQUEST_APPROVED', {
                requestId: updated.id,
                requestType: updated.requestType
            }, ctx)
        }
        return updated
    }

    async rejectRequest(id: string, reason: string | undefined, ctx: WorkflowServiceContext): Promise<WorkflowRequestRecord> {
        const request = await this.requireRequest(id)
        if (request.status !== 'submitted') {
            throw AppError.conflict('Request is not in submitted state')
        }
        const updated = await this.workflows.updateStatus(id, 'rejected', {
            approvedBy: ctx.userId,
            payload: reason ? { reason } : undefined,
            correlationId: ctx.correlationId
        })
        if (!updated) {
            throw AppError.internal('Failed to reject request')
        }
        if (updated.assetId) {
            await this.appendAssetEvent(updated.assetId, 'REQUEST_REJECTED', {
                requestId: updated.id,
                requestType: updated.requestType,
                reason: reason ?? null
            }, ctx)
        }
        return updated
    }

    async executeRequest(id: string, ctx: WorkflowServiceContext): Promise<WorkflowRequestRecord> {
        const request = await this.requireRequest(id)
        if (request.status !== 'approved') {
            throw AppError.conflict('Request is not approved')
        }

        await this.workflows.updateStatus(id, 'in_progress', {
            approvedBy: request.approvedBy ?? ctx.userId,
            correlationId: ctx.correlationId
        })

        await this.executeAction(request, ctx)

        const updated = await this.workflows.updateStatus(id, 'done', {
            approvedBy: request.approvedBy ?? ctx.userId,
            correlationId: ctx.correlationId
        })
        if (!updated) {
            throw AppError.internal('Failed to complete request')
        }
        return updated
    }

    async listRequests(filters: Parameters<IWorkflowRepo['list']>[0]): Promise<ReturnType<IWorkflowRepo['list']>> {
        return await this.workflows.list(filters)
    }

    async getRequest(id: string): Promise<WorkflowRequestRecord> {
        return await this.requireRequest(id)
    }

    private async requireRequest(id: string): Promise<WorkflowRequestRecord> {
        const request = await this.workflows.getById(id)
        if (!request) {
            throw AppError.notFound('Workflow request not found')
        }
        return request
    }

    private async executeAction(request: WorkflowRequestRecord, ctx: WorkflowServiceContext): Promise<void> {
        const assetId = request.assetId
        if (!assetId) {
            throw AppError.badRequest('Request missing assetId')
        }

        switch (request.requestType) {
            case 'assign': {
                const payload = request.payload as Partial<AssetAssignmentInput>
                if (!payload.assigneeId || !payload.assigneeName || !payload.assigneeType) {
                    throw AppError.badRequest('Assign payload missing assignee fields')
                }
                await this.assets.assignAsset(assetId, {
                    assigneeId: payload.assigneeId,
                    assigneeName: payload.assigneeName,
                    assigneeType: payload.assigneeType,
                    note: payload.note
                }, ctx)
                return
            }
            case 'return': {
                const note = (request.payload as { note?: string } | undefined)?.note
                await this.assets.returnAsset(assetId, note, ctx)
                return
            }
            case 'move': {
                const locationId = (request.payload as { locationId?: string } | undefined)?.locationId
                if (!locationId) {
                    throw AppError.badRequest('Move payload missing locationId')
                }
                await this.assets.moveAsset(assetId, locationId, ctx)
                return
            }
            case 'repair': {
                const payload = request.payload as Partial<MaintenanceTicketInput>
                if (!payload.title || !payload.severity) {
                    throw AppError.badRequest('Repair payload missing title or severity')
                }
                await this.maintenance.openTicket(assetId, {
                    title: payload.title,
                    severity: payload.severity,
                    diagnosis: payload.diagnosis,
                    resolution: payload.resolution
                }, ctx)
                return
            }
            case 'dispose':
                await this.assets.changeStatus(assetId, 'disposed', ctx)
                return
            default:
                throw AppError.badRequest('Unsupported request type')
        }
    }

    private async appendAssetEvent(
        assetId: string,
        eventType: 'REQUEST_SUBMITTED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED',
        payload: Record<string, unknown>,
        ctx: WorkflowServiceContext
    ): Promise<void> {
        await this.events.append({
            assetId,
            eventType,
            payload,
            actorUserId: ctx.userId,
            correlationId: ctx.correlationId
        })
    }
}
