/**
 * Requests Module - Service Layer
 * Business logic for asset request and approval management
 * 
 * Business Rules:
 * REQ-R01: Self-request - Only create request for self (except Managers)
 * REQ-R02: Justification required - Must have reason >= 20 characters
 * REQ-R03: Sequential approval - Must approve in chain order
 * REQ-R04: No self-approve - Cannot approve own request
 * REQ-R05: Reject ends flow - Reject at any step → request rejected
 * REQ-R06: One pending - Warn if similar request pending
 * REQ-R07: Cancel before approval - Can only cancel before any approval
 * REQ-R08: Replacement needs asset - Replacement request must specify current asset
 */

import { PoolClient } from 'pg';
import { RequestsRepository } from './requests.repository.js';
import {
    AssetRequest,
    AssetRequestWithDetails,
    ApprovalStep,
    ApprovalStepWithDetails,
    RequestAttachment,
    RequestAttachmentWithDetails,
    RequestComment,
    RequestCommentWithDetails,
    RequestAuditLogWithDetails,
    ApprovalChainTemplate,
    ApprovalChainStep,
    CreateRequestDto,
    UpdateRequestDto,
    SubmitRequestDto,
    ApproveRequestDto,
    RejectRequestDto,
    RequestMoreInfoDto,
    ProvideInfoDto,
    CancelRequestDto,
    FulfillRequestDto,
    StartFulfillmentDto,
    AddAttachmentDto,
    AddCommentDto,
    EscalateApprovalDto,
    CreateTemplateDto,
    UpdateTemplateDto,
    RequestListQuery,
    FulfillmentQueueQuery,
    RequestResult,
    ApprovalResult,
    FulfillmentResult,
    CancelResult,
    RequestDetailResponse,
    RequestStatistics
} from './requests.types.js';

export class RequestsService {
    constructor(private repository: RequestsRepository) { }

    // ==================== Request CRUD ====================

    /**
     * Create a new asset request (draft status)
     */
    async createRequest(dto: CreateRequestDto): Promise<RequestResult> {
        try {
            // REQ-R06: Check for similar pending requests
            if (dto.assetCategoryId) {
                const hasSimilar = await this.repository.hasPendingSimilarRequest(
                    dto.requesterId,
                    dto.assetCategoryId,
                    dto.requestType
                );
                if (hasSimilar) {
                    // Warning only, still allow creation
                    console.warn(`Similar pending request exists for user ${dto.requesterId}`);
                }
            }

            const request = await this.repository.create(dto);

            // Create audit log
            await this.repository.createAuditLog(
                request.id,
                'created',
                dto.createdBy,
                null,
                'draft',
                { requestType: dto.requestType }
            );

            return { success: true, request };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create request'
            };
        }
    }

    /**
     * Get request by ID
     */
    async getRequestById(id: string): Promise<AssetRequest | null> {
        return this.repository.findById(id);
    }

    /**
     * Get request with full details
     */
    async getRequestWithDetails(id: string): Promise<AssetRequestWithDetails | null> {
        return this.repository.findByIdWithDetails(id);
    }

    /**
     * Get request by code
     */
    async getRequestByCode(code: string): Promise<AssetRequest | null> {
        return this.repository.findByCode(code);
    }

    /**
     * Get full request detail (request + approvals + comments + attachments + audit)
     */
    async getRequestDetail(id: string): Promise<RequestDetailResponse | null> {
        const request = await this.repository.findByIdWithDetails(id);
        if (!request) return null;

        const [approvalSteps, comments, attachments, auditLogs] = await Promise.all([
            this.repository.findApprovalStepsWithDetailsByRequestId(id),
            this.repository.findCommentsByRequestId(id),
            this.repository.findAttachmentsByRequestId(id),
            this.repository.findAuditLogsByRequestId(id)
        ]);

        return {
            request,
            approvalSteps,
            comments,
            attachments,
            auditLogs
        };
    }

    /**
     * Update request (only in draft status)
     */
    async updateRequest(id: string, dto: UpdateRequestDto, updatedBy: string): Promise<RequestResult> {
        const request = await this.repository.findById(id);
        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        if (request.status !== 'draft') {
            return { success: false, error: 'Can only update requests in draft status' };
        }

        const updated = await this.repository.update(id, dto);
        if (!updated) {
            return { success: false, error: 'Failed to update request' };
        }

        // Audit log
        await this.repository.createAuditLog(
            id,
            'updated',
            updatedBy,
            null,
            null,
            { changes: dto }
        );

        return { success: true, request: updated };
    }

    /**
     * Delete request (only in draft status)
     */
    async deleteRequest(id: string, deletedBy: string): Promise<{ success: boolean; error?: string }> {
        const request = await this.repository.findById(id);
        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        if (request.status !== 'draft') {
            return { success: false, error: 'Can only delete requests in draft status' };
        }

        const deleted = await this.repository.delete(id);
        return { success: deleted };
    }

    // ==================== Request Submission ====================

    /**
     * Submit request for approval
     */
    async submitRequest(dto: SubmitRequestDto): Promise<RequestResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.status !== 'draft') {
                return { success: false, error: 'Can only submit requests in draft status' };
            }

            // Find matching approval chain template
            const template = await this.repository.findMatchingTemplate(
                request.assetCategoryId,
                null, // TODO: Get asset value if needed
                request.departmentId,
                request.requestType,
                request.organizationId
            );

            if (!template) {
                return { success: false, error: 'No approval chain configured for this request type' };
            }

            // Create approval steps from template
            const steps = await this.repository.createApprovalSteps(
                request.id,
                template.steps,
                client
            );

            if (steps.length === 0) {
                return { success: false, error: 'Failed to create approval chain' };
            }

            // Update request status
            const updated = await this.repository.updateStatus(
                request.id,
                'pending_approval',
                {
                    submittedAt: new Date(),
                    approvalChain: template.steps,
                    totalApprovalSteps: steps.length,
                    currentApprovalStep: 1
                },
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                request.id,
                'submitted',
                dto.submittedBy,
                'draft',
                'pending_approval',
                { templateId: template.id, totalSteps: steps.length },
                client
            );

            return { success: true, request: updated! };
        });
    }

    // ==================== Approval Workflow ====================

    /**
     * Approve current step
     */
    async approveRequest(dto: ApproveRequestDto): Promise<ApprovalResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.status !== 'pending_approval') {
                return { success: false, error: 'Request is not pending approval' };
            }

            // REQ-R04: No self-approve
            if (request.requesterId === dto.approverId) {
                return { success: false, error: 'Cannot approve your own request' };
            }

            // Get current step
            const currentStep = await this.repository.findCurrentApprovalStep(dto.requestId);
            if (!currentStep) {
                return { success: false, error: 'No pending approval step found' };
            }

            // REQ-R03: Sequential approval - verify this is the right approver
            if (currentStep.approverId !== dto.approverId) {
                return { success: false, error: 'You are not the current approver for this request' };
            }

            // Update step to approved
            const updatedStep = await this.repository.updateApprovalStep(
                currentStep.id,
                'approved',
                dto.comments,
                client
            );

            // Audit log for step
            await this.repository.createAuditLog(
                dto.requestId,
                'approval_step_completed',
                dto.approverId,
                null,
                null,
                { stepOrder: currentStep.stepOrder, decision: 'approved', comments: dto.comments },
                client
            );

            // Check if this was the last step
            const isLastStep = currentStep.stepOrder === request.totalApprovalSteps;

            if (isLastStep) {
                // Fully approved
                await this.repository.updateStatus(
                    dto.requestId,
                    'approved',
                    { currentApprovalStep: request.totalApprovalSteps },
                    client
                );

                await this.repository.createAuditLog(
                    dto.requestId,
                    'approved',
                    dto.approverId,
                    'pending_approval',
                    'approved',
                    { fullyApproved: true },
                    client
                );

                return {
                    success: true,
                    step: updatedStep!,
                    isFullyApproved: true,
                    nextStep: null
                };
            } else {
                // Move to next step
                await this.repository.updateStatus(
                    dto.requestId,
                    'pending_approval',
                    { currentApprovalStep: currentStep.stepOrder + 1 },
                    client
                );

                // Get next step info
                const allSteps = await this.repository.findApprovalStepsByRequestId(dto.requestId);
                const nextStep = allSteps.find(s => s.stepOrder === currentStep.stepOrder + 1);

                return {
                    success: true,
                    step: updatedStep!,
                    isFullyApproved: false,
                    nextStep: nextStep ?? null
                };
            }
        });
    }

    /**
     * Reject request
     */
    async rejectRequest(dto: RejectRequestDto): Promise<ApprovalResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.status !== 'pending_approval') {
                return { success: false, error: 'Request is not pending approval' };
            }

            // REQ-R04: No self-reject (also apply)
            if (request.requesterId === dto.approverId) {
                return { success: false, error: 'Cannot reject your own request' };
            }

            // Get current step
            const currentStep = await this.repository.findCurrentApprovalStep(dto.requestId);
            if (!currentStep) {
                return { success: false, error: 'No pending approval step found' };
            }

            // Verify approver
            if (currentStep.approverId !== dto.approverId) {
                return { success: false, error: 'You are not the current approver for this request' };
            }

            // Update step to rejected
            const updatedStep = await this.repository.updateApprovalStep(
                currentStep.id,
                'rejected',
                dto.reason,
                client
            );

            // REQ-R05: Reject ends flow
            await this.repository.updateStatus(
                dto.requestId,
                'rejected',
                {
                    rejectedBy: dto.approverId,
                    rejectedAt: new Date(),
                    rejectReason: dto.reason
                },
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                dto.requestId,
                'rejected',
                dto.approverId,
                'pending_approval',
                'rejected',
                { stepOrder: currentStep.stepOrder, reason: dto.reason },
                client
            );

            return {
                success: true,
                step: updatedStep!,
                isFullyApproved: false
            };
        });
    }

    /**
     * Request more information
     */
    async requestMoreInfo(dto: RequestMoreInfoDto): Promise<ApprovalResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.status !== 'pending_approval') {
                return { success: false, error: 'Request is not pending approval' };
            }

            // Get current step
            const currentStep = await this.repository.findCurrentApprovalStep(dto.requestId);
            if (!currentStep) {
                return { success: false, error: 'No pending approval step found' };
            }

            // Verify approver
            if (currentStep.approverId !== dto.approverId) {
                return { success: false, error: 'You are not the current approver for this request' };
            }

            // Create info request comment
            await this.repository.createComment(
                {
                    requestId: dto.requestId,
                    content: dto.question,
                    authorId: dto.approverId,
                    commentType: 'info_request',
                    approvalStepId: currentStep.id
                },
                client
            );

            // Update status to need_info
            await this.repository.updateStatus(
                dto.requestId,
                'need_info',
                {},
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                dto.requestId,
                'info_requested',
                dto.approverId,
                'pending_approval',
                'need_info',
                { stepOrder: currentStep.stepOrder, question: dto.question },
                client
            );

            return {
                success: true,
                step: currentStep
            };
        });
    }

    /**
     * Provide additional information
     */
    async provideInfo(dto: ProvideInfoDto): Promise<RequestResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.status !== 'need_info') {
                return { success: false, error: 'Request is not waiting for information' };
            }

            // Verify the requester is responding
            if (request.requesterId !== dto.respondedBy) {
                return { success: false, error: 'Only the requester can provide information' };
            }

            // Get the info request comment
            const infoRequest = await this.repository.findCommentById(dto.commentId);
            if (!infoRequest || infoRequest.commentType !== 'info_request') {
                return { success: false, error: 'Info request not found' };
            }

            // Create response comment
            await this.repository.createComment(
                {
                    requestId: dto.requestId,
                    content: dto.response,
                    authorId: dto.respondedBy,
                    commentType: 'info_response',
                    parentCommentId: dto.commentId
                },
                client
            );

            // Return to pending_approval status
            const updated = await this.repository.updateStatus(
                dto.requestId,
                'pending_approval',
                {},
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                dto.requestId,
                'info_provided',
                dto.respondedBy,
                'need_info',
                'pending_approval',
                { response: dto.response },
                client
            );

            return { success: true, request: updated! };
        });
    }

    // ==================== Cancel Request ====================

    /**
     * Cancel request
     */
    async cancelRequest(dto: CancelRequestDto): Promise<CancelResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            // REQ-R07: Can only cancel before any approval
            if (!['draft', 'pending_approval', 'need_info'].includes(request.status)) {
                return { success: false, error: 'Cannot cancel request in current status' };
            }

            // Check if any step is already approved
            const steps = await this.repository.findApprovalStepsByRequestId(dto.requestId);
            const hasApprovedStep = steps.some(s => s.status === 'approved');
            if (hasApprovedStep) {
                return { success: false, error: 'Cannot cancel request that has already received approvals' };
            }

            // Only requester can cancel their own request
            if (request.requesterId !== dto.cancelledBy) {
                return { success: false, error: 'Only the requester can cancel their request' };
            }

            // Update status
            const updated = await this.repository.updateStatus(
                dto.requestId,
                'cancelled',
                {
                    cancelledBy: dto.cancelledBy,
                    cancelledAt: new Date(),
                    cancelReason: dto.reason
                },
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                dto.requestId,
                'cancelled',
                dto.cancelledBy,
                request.status,
                'cancelled',
                { reason: dto.reason },
                client
            );

            return { success: true, request: updated! };
        });
    }

    // ==================== Fulfillment ====================

    /**
     * Start fulfillment process
     */
    async startFulfillment(dto: StartFulfillmentDto): Promise<RequestResult> {
        const request = await this.repository.findById(dto.requestId);
        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        if (request.status !== 'approved') {
            return { success: false, error: 'Request must be approved before fulfillment' };
        }

        const updated = await this.repository.updateStatus(
            dto.requestId,
            'fulfilling'
        );

        // Audit log
        await this.repository.createAuditLog(
            dto.requestId,
            'fulfilling',
            dto.startedBy,
            'approved',
            'fulfilling'
        );

        return { success: true, request: updated! };
    }

    /**
     * Complete fulfillment
     */
    async fulfillRequest(dto: FulfillRequestDto): Promise<FulfillmentResult> {
        return this.repository.withTransaction(async (client: PoolClient) => {
            const request = await this.repository.findById(dto.requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (!['approved', 'fulfilling'].includes(request.status)) {
                return { success: false, error: 'Request must be approved before fulfillment' };
            }

            // Validate asset count matches quantity
            if (dto.assetIds.length !== request.quantity) {
                return {
                    success: false,
                    error: `Expected ${request.quantity} asset(s), but ${dto.assetIds.length} provided`
                };
            }

            // Update request status
            const updated = await this.repository.updateStatus(
                dto.requestId,
                'completed',
                {
                    fulfilledBy: dto.fulfilledBy,
                    fulfilledAt: new Date(),
                    fulfilledAssetIds: dto.assetIds
                },
                client
            );

            // Audit log
            await this.repository.createAuditLog(
                dto.requestId,
                'completed',
                dto.fulfilledBy,
                request.status,
                'completed',
                { assetIds: dto.assetIds, notes: dto.notes },
                client
            );

            // TODO: Integrate with checkout module to actually checkout assets

            return {
                success: true,
                request: updated!,
                checkoutIds: [] // Would be populated after checkout integration
            };
        });
    }

    // ==================== Escalation ====================

    /**
     * Escalate approval to different approver
     */
    async escalateApproval(dto: EscalateApprovalDto): Promise<ApprovalResult> {
        const step = await this.repository.findApprovalStepById(dto.stepId);
        if (!step) {
            return { success: false, error: 'Approval step not found' };
        }

        if (step.status !== 'pending') {
            return { success: false, error: 'Can only escalate pending steps' };
        }

        const updated = await this.repository.escalateApprovalStep(
            dto.stepId,
            dto.newApproverId,
            dto.reason
        );

        // Audit log
        await this.repository.createAuditLog(
            step.requestId,
            'escalated',
            dto.escalatedBy,
            null,
            null,
            {
                stepOrder: step.stepOrder,
                originalApproverId: step.approverId,
                newApproverId: dto.newApproverId,
                reason: dto.reason
            }
        );

        return { success: true, step: updated! };
    }

    // ==================== Queries ====================

    /**
     * Get requests with filtering and pagination
     */
    async getRequests(query: RequestListQuery): Promise<{
        data: AssetRequestWithDetails[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const result = await this.repository.findAll(query);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        return {
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        };
    }

    /**
     * Get my requests (for requester)
     */
    async getMyRequests(
        requesterId: string,
        query?: Partial<RequestListQuery>
    ): Promise<AssetRequestWithDetails[]> {
        return this.repository.findByRequesterId(requesterId, query);
    }

    /**
     * Get approval queue (for approver)
     */
    async getApprovalQueue(approverId: string): Promise<AssetRequestWithDetails[]> {
        return this.repository.findPendingByApprover(approverId);
    }

    /**
     * Get fulfillment queue
     */
    async getFulfillmentQueue(query?: FulfillmentQueueQuery): Promise<{
        data: AssetRequestWithDetails[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const result = await this.repository.findReadyForFulfillment(query);
        const page = query?.page ?? 1;
        const limit = query?.limit ?? 20;

        return {
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        };
    }

    /**
     * Get approval steps for request
     */
    async getApprovalSteps(requestId: string): Promise<ApprovalStepWithDetails[]> {
        return this.repository.findApprovalStepsWithDetailsByRequestId(requestId);
    }

    // ==================== Attachments ====================

    /**
     * Add attachment to request
     */
    async addAttachment(dto: AddAttachmentDto): Promise<RequestAttachment> {
        const request = await this.repository.findById(dto.requestId);
        if (!request) {
            throw new Error('Request not found');
        }

        // Can only add attachments to draft or need_info requests
        if (!['draft', 'need_info'].includes(request.status)) {
            throw new Error('Cannot add attachments in current status');
        }

        return this.repository.createAttachment(dto);
    }

    /**
     * Get attachments for request
     */
    async getAttachments(requestId: string): Promise<RequestAttachmentWithDetails[]> {
        return this.repository.findAttachmentsByRequestId(requestId);
    }

    /**
     * Delete attachment
     */
    async deleteAttachment(
        attachmentId: string,
        deletedBy: string
    ): Promise<{ success: boolean; error?: string }> {
        const attachment = await this.repository.findAttachmentById(attachmentId);
        if (!attachment) {
            return { success: false, error: 'Attachment not found' };
        }

        // Only uploader can delete
        if (attachment.uploadedBy !== deletedBy) {
            return { success: false, error: 'Only the uploader can delete attachments' };
        }

        const request = await this.repository.findById(attachment.requestId);
        if (request && !['draft', 'need_info'].includes(request.status)) {
            return { success: false, error: 'Cannot delete attachments in current status' };
        }

        const deleted = await this.repository.deleteAttachment(attachmentId);
        return { success: deleted };
    }

    // ==================== Comments ====================

    /**
     * Add comment to request
     */
    async addComment(dto: AddCommentDto): Promise<RequestComment> {
        return this.repository.createComment(dto);
    }

    /**
     * Get comments for request
     */
    async getComments(requestId: string): Promise<RequestCommentWithDetails[]> {
        return this.repository.findCommentsByRequestId(requestId);
    }

    // ==================== Audit ====================

    /**
     * Get audit logs for request
     */
    async getAuditLogs(requestId: string): Promise<RequestAuditLogWithDetails[]> {
        return this.repository.findAuditLogsByRequestId(requestId);
    }

    // ==================== Templates ====================

    /**
     * Create approval chain template
     */
    async createTemplate(dto: CreateTemplateDto): Promise<ApprovalChainTemplate> {
        return this.repository.createTemplate(dto);
    }

    /**
     * Get template by ID
     */
    async getTemplateById(templateId: string): Promise<ApprovalChainTemplate | null> {
        return this.repository.findTemplateById(templateId);
    }

    /**
     * Get all active templates
     */
    async getActiveTemplates(organizationId?: string): Promise<ApprovalChainTemplate[]> {
        return this.repository.findActiveTemplates(organizationId);
    }

    /**
     * Update template
     */
    async updateTemplate(
        templateId: string,
        dto: UpdateTemplateDto
    ): Promise<ApprovalChainTemplate | null> {
        return this.repository.updateTemplate(templateId, dto);
    }

    /**
     * Delete template
     */
    async deleteTemplate(templateId: string): Promise<boolean> {
        return this.repository.deleteTemplate(templateId);
    }

    // ==================== Statistics ====================

    /**
     * Get request statistics
     */
    async getStatistics(organizationId?: string): Promise<RequestStatistics> {
        return this.repository.getStatistics(organizationId);
    }

    // ==================== Reminder Processing ====================

    /**
     * Process pending approvals for reminders (called by scheduler)
     */
    async processReminders(): Promise<void> {
        // Find all pending steps older than 2 days
        // This would be called by a scheduled job
        // Implementation depends on notification system
    }
}
