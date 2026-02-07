/**
 * Requests Module - Service Layer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestsService } from './requests.service.js';
import { RequestsRepository } from './requests.repository.js';
import {
    AssetRequest,
    AssetRequestWithDetails,
    ApprovalStep,
    ApprovalChainTemplate,
    CreateRequestDto,
    ApproveRequestDto,
    RejectRequestDto,
    CancelRequestDto,
    FulfillRequestDto
} from './requests.types.js';

// Mock repository
function createMockRepository() {
    return {
        create: vi.fn(),
        findById: vi.fn(),
        findByIdWithDetails: vi.fn(),
        findByCode: vi.fn(),
        update: vi.fn(),
        updateStatus: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        findByRequesterId: vi.fn(),
        findPendingByApprover: vi.fn(),
        findReadyForFulfillment: vi.fn(),
        hasPendingSimilarRequest: vi.fn(),
        createApprovalStep: vi.fn(),
        createApprovalSteps: vi.fn(),
        findApprovalStepsByRequestId: vi.fn(),
        findApprovalStepsWithDetailsByRequestId: vi.fn(),
        findCurrentApprovalStep: vi.fn(),
        findApprovalStepById: vi.fn(),
        updateApprovalStep: vi.fn(),
        escalateApprovalStep: vi.fn(),
        updateReminderSent: vi.fn(),
        createAttachment: vi.fn(),
        findAttachmentsByRequestId: vi.fn(),
        findAttachmentById: vi.fn(),
        deleteAttachment: vi.fn(),
        createComment: vi.fn(),
        findCommentsByRequestId: vi.fn(),
        findCommentById: vi.fn(),
        findPendingInfoRequests: vi.fn(),
        createAuditLog: vi.fn(),
        findAuditLogsByRequestId: vi.fn(),
        createTemplate: vi.fn(),
        findTemplateById: vi.fn(),
        findActiveTemplates: vi.fn(),
        findMatchingTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
        getStatistics: vi.fn(),
        withTransaction: vi.fn()
    } as unknown as RequestsRepository;
}

// Sample data
const sampleRequest: AssetRequest = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    requestCode: 'REQ-20240101-0001',
    requestType: 'new',
    requesterId: '550e8400-e29b-41d4-a716-446655440010',
    departmentId: '550e8400-e29b-41d4-a716-446655440020',
    assetCategoryId: '550e8400-e29b-41d4-a716-446655440030',
    assetModelId: null,
    quantity: 1,
    currentAssetId: null,
    justification: 'Need a new laptop for development work and testing',
    priority: 'normal',
    requiredDate: '2024-02-01',
    status: 'draft',
    approvalChain: null,
    totalApprovalSteps: 0,
    currentApprovalStep: 0,
    fulfilledBy: null,
    fulfilledAt: null,
    fulfilledAssetIds: null,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectReason: null,
    submittedAt: null,
    organizationId: '550e8400-e29b-41d4-a716-446655440040',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: '550e8400-e29b-41d4-a716-446655440010'
};

const sampleRequestWithDetails: AssetRequestWithDetails = {
    ...sampleRequest,
    requesterName: 'John Doe',
    requesterEmail: 'john@example.com',
    departmentName: 'Engineering',
    categoryName: 'Laptop',
    modelName: null,
    currentAssetTag: null,
    currentAssetName: null,
    approvedSteps: 0,
    pendingApproverName: null,
    pendingApproverRole: null,
    commentCount: 0,
    attachmentCount: 0,
    daysWaiting: null
};

const sampleApprovalStep: ApprovalStep = {
    id: '550e8400-e29b-41d4-a716-446655440050',
    requestId: sampleRequest.id,
    stepOrder: 1,
    approverId: '550e8400-e29b-41d4-a716-446655440060',
    approverRole: 'direct_manager',
    status: 'pending',
    decisionDate: null,
    comments: null,
    isEscalated: false,
    escalatedFrom: null,
    escalatedAt: null,
    escalationReason: null,
    reminderSentCount: 0,
    lastReminderSentAt: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
};

const sampleTemplate: ApprovalChainTemplate = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    name: 'Default Laptop Template',
    description: 'Default approval chain for laptop requests',
    assetCategoryId: sampleRequest.assetCategoryId,
    minValue: null,
    maxValue: null,
    departmentId: null,
    requestType: null,
    priority: 0,
    steps: [
        { order: 1, role: 'direct_manager', approverId: sampleApprovalStep.approverId },
        { order: 2, role: 'department_head', approverId: '550e8400-e29b-41d4-a716-446655440070' }
    ],
    isActive: true,
    organizationId: sampleRequest.organizationId,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: '550e8400-e29b-41d4-a716-446655440010'
};

describe('RequestsService', () => {
    let repository: ReturnType<typeof createMockRepository>;
    let service: RequestsService;

    beforeEach(() => {
        repository = createMockRepository();
        service = new RequestsService(repository as unknown as RequestsRepository);
    });

    // ==================== Request CRUD Tests ====================

    describe('createRequest', () => {
        it('should create a new request', async () => {
            repository.hasPendingSimilarRequest.mockResolvedValue(false);
            repository.create.mockResolvedValue(sampleRequest);
            repository.createAuditLog.mockResolvedValue({});

            const dto: CreateRequestDto = {
                requestType: 'new',
                requesterId: sampleRequest.requesterId,
                assetCategoryId: sampleRequest.assetCategoryId,
                justification: 'Need a new laptop for development work and testing',
                createdBy: sampleRequest.requesterId
            };

            const result = await service.createRequest(dto);

            expect(result.success).toBe(true);
            expect(result.request).toBeDefined();
            expect(repository.create).toHaveBeenCalledWith(dto);
            expect(repository.createAuditLog).toHaveBeenCalledWith(
                sampleRequest.id,
                'created',
                dto.createdBy,
                null,
                'draft',
                { requestType: 'new' }
            );
        });

        it('should warn when similar request exists (REQ-R06)', async () => {
            repository.hasPendingSimilarRequest.mockResolvedValue(true);
            repository.create.mockResolvedValue(sampleRequest);
            repository.createAuditLog.mockResolvedValue({});

            const consoleSpy = vi.spyOn(console, 'warn');

            const dto: CreateRequestDto = {
                requestType: 'new',
                requesterId: sampleRequest.requesterId,
                assetCategoryId: sampleRequest.assetCategoryId,
                justification: 'Need a new laptop for development work and testing',
                createdBy: sampleRequest.requesterId
            };

            const result = await service.createRequest(dto);

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Similar pending request exists')
            );
        });

        it('should handle creation error', async () => {
            repository.hasPendingSimilarRequest.mockResolvedValue(false);
            repository.create.mockRejectedValue(new Error('Database error'));

            const dto: CreateRequestDto = {
                requestType: 'new',
                requesterId: sampleRequest.requesterId,
                justification: 'Need a new laptop for development work and testing',
                createdBy: sampleRequest.requesterId
            };

            const result = await service.createRequest(dto);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });

    describe('getRequestById', () => {
        it('should return request by ID', async () => {
            repository.findById.mockResolvedValue(sampleRequest);

            const result = await service.getRequestById(sampleRequest.id);

            expect(result).toEqual(sampleRequest);
        });

        it('should return null when not found', async () => {
            repository.findById.mockResolvedValue(null);

            const result = await service.getRequestById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getRequestDetail', () => {
        it('should return full request detail', async () => {
            repository.findByIdWithDetails.mockResolvedValue(sampleRequestWithDetails);
            repository.findApprovalStepsWithDetailsByRequestId.mockResolvedValue([]);
            repository.findCommentsByRequestId.mockResolvedValue([]);
            repository.findAttachmentsByRequestId.mockResolvedValue([]);
            repository.findAuditLogsByRequestId.mockResolvedValue([]);

            const result = await service.getRequestDetail(sampleRequest.id);

            expect(result).toBeDefined();
            expect(result?.request).toEqual(sampleRequestWithDetails);
            expect(result?.approvalSteps).toEqual([]);
            expect(result?.comments).toEqual([]);
            expect(result?.attachments).toEqual([]);
            expect(result?.auditLogs).toEqual([]);
        });

        it('should return null when request not found', async () => {
            repository.findByIdWithDetails.mockResolvedValue(null);

            const result = await service.getRequestDetail('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('updateRequest', () => {
        it('should update request in draft status', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            const updatedRequest = { ...sampleRequest, priority: 'high' as const };
            repository.update.mockResolvedValue(updatedRequest);
            repository.createAuditLog.mockResolvedValue({});

            const result = await service.updateRequest(
                sampleRequest.id,
                { priority: 'high' },
                sampleRequest.requesterId
            );

            expect(result.success).toBe(true);
            expect(result.request?.priority).toBe('high');
        });

        it('should reject update when not in draft status', async () => {
            const submittedRequest = { ...sampleRequest, status: 'pending_approval' as const };
            repository.findById.mockResolvedValue(submittedRequest);

            const result = await service.updateRequest(
                sampleRequest.id,
                { priority: 'high' },
                sampleRequest.requesterId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Can only update requests in draft status');
        });

        it('should return error when request not found', async () => {
            repository.findById.mockResolvedValue(null);

            const result = await service.updateRequest(
                'non-existent',
                { priority: 'high' },
                sampleRequest.requesterId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Request not found');
        });
    });

    describe('deleteRequest', () => {
        it('should delete request in draft status', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.delete.mockResolvedValue(true);

            const result = await service.deleteRequest(
                sampleRequest.id,
                sampleRequest.requesterId
            );

            expect(result.success).toBe(true);
        });

        it('should reject deletion when not in draft status', async () => {
            const submittedRequest = { ...sampleRequest, status: 'pending_approval' as const };
            repository.findById.mockResolvedValue(submittedRequest);

            const result = await service.deleteRequest(
                sampleRequest.id,
                sampleRequest.requesterId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Can only delete requests in draft status');
        });
    });

    // ==================== Submission Tests ====================

    describe('submitRequest', () => {
        it('should submit request for approval', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.findMatchingTemplate.mockResolvedValue(sampleTemplate);
            repository.createApprovalSteps.mockResolvedValue([sampleApprovalStep]);

            const submittedRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                totalApprovalSteps: 2,
                currentApprovalStep: 1
            };
            repository.updateStatus.mockResolvedValue(submittedRequest);
            repository.createAuditLog.mockResolvedValue({});

            // Mock withTransaction to execute callback
            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.submitRequest({
                requestId: sampleRequest.id,
                submittedBy: sampleRequest.requesterId
            });

            expect(result.success).toBe(true);
            expect(result.request?.status).toBe('pending_approval');
        });

        it('should reject submission when not in draft status', async () => {
            const submittedRequest = { ...sampleRequest, status: 'pending_approval' as const };
            repository.findById.mockResolvedValue(submittedRequest);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.submitRequest({
                requestId: sampleRequest.id,
                submittedBy: sampleRequest.requesterId
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Can only submit requests in draft status');
        });

        it('should reject submission when no template found', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.findMatchingTemplate.mockResolvedValue(null);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.submitRequest({
                requestId: sampleRequest.id,
                submittedBy: sampleRequest.requesterId
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('No approval chain configured for this request type');
        });
    });

    // ==================== Approval Tests ====================

    describe('approveRequest', () => {
        it('should approve current step (REQ-R03)', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                totalApprovalSteps: 2,
                currentApprovalStep: 1
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findCurrentApprovalStep.mockResolvedValue(sampleApprovalStep);

            const approvedStep = { ...sampleApprovalStep, status: 'approved' as const };
            repository.updateApprovalStep.mockResolvedValue(approvedStep);
            repository.updateStatus.mockResolvedValue({
                ...pendingRequest,
                currentApprovalStep: 2
            });
            repository.findApprovalStepsByRequestId.mockResolvedValue([
                sampleApprovalStep,
                { ...sampleApprovalStep, stepOrder: 2, approverId: '550e8400-e29b-41d4-a716-446655440070' }
            ]);
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const dto: ApproveRequestDto = {
                requestId: sampleRequest.id,
                approverId: sampleApprovalStep.approverId,
                comments: 'Approved'
            };

            const result = await service.approveRequest(dto);

            expect(result.success).toBe(true);
            expect(result.step?.status).toBe('approved');
            expect(result.isFullyApproved).toBe(false);
            expect(result.nextStep).toBeDefined();
        });

        it('should fully approve when last step', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                totalApprovalSteps: 1,
                currentApprovalStep: 1
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findCurrentApprovalStep.mockResolvedValue(sampleApprovalStep);

            const approvedStep = { ...sampleApprovalStep, status: 'approved' as const };
            repository.updateApprovalStep.mockResolvedValue(approvedStep);
            repository.updateStatus.mockResolvedValue({
                ...pendingRequest,
                status: 'approved'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.approveRequest({
                requestId: sampleRequest.id,
                approverId: sampleApprovalStep.approverId
            });

            expect(result.success).toBe(true);
            expect(result.isFullyApproved).toBe(true);
            expect(result.nextStep).toBeNull();
        });

        it('should reject self-approval (REQ-R04)', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                requesterId: sampleApprovalStep.approverId // Same as approver
            };
            repository.findById.mockResolvedValue(pendingRequest);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.approveRequest({
                requestId: sampleRequest.id,
                approverId: sampleApprovalStep.approverId
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot approve your own request');
        });

        it('should reject when wrong approver', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                currentApprovalStep: 1
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findCurrentApprovalStep.mockResolvedValue(sampleApprovalStep);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.approveRequest({
                requestId: sampleRequest.id,
                approverId: '550e8400-e29b-41d4-a716-446655440999' // Wrong approver
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('You are not the current approver for this request');
        });
    });

    describe('rejectRequest', () => {
        it('should reject request (REQ-R05)', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                currentApprovalStep: 1
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findCurrentApprovalStep.mockResolvedValue(sampleApprovalStep);

            const rejectedStep = { ...sampleApprovalStep, status: 'rejected' as const };
            repository.updateApprovalStep.mockResolvedValue(rejectedStep);
            repository.updateStatus.mockResolvedValue({
                ...pendingRequest,
                status: 'rejected'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const dto: RejectRequestDto = {
                requestId: sampleRequest.id,
                approverId: sampleApprovalStep.approverId,
                reason: 'Budget not available'
            };

            const result = await service.rejectRequest(dto);

            expect(result.success).toBe(true);
            expect(result.step?.status).toBe('rejected');
            expect(result.isFullyApproved).toBe(false);
        });
    });

    describe('requestMoreInfo', () => {
        it('should request more info and change status to need_info', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const,
                currentApprovalStep: 1
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findCurrentApprovalStep.mockResolvedValue(sampleApprovalStep);
            repository.createComment.mockResolvedValue({});
            repository.updateStatus.mockResolvedValue({
                ...pendingRequest,
                status: 'need_info'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.requestMoreInfo({
                requestId: sampleRequest.id,
                approverId: sampleApprovalStep.approverId,
                question: 'Please provide budget details'
            });

            expect(result.success).toBe(true);
            expect(repository.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    commentType: 'info_request',
                    content: 'Please provide budget details'
                }),
                expect.anything()
            );
        });
    });

    describe('provideInfo', () => {
        it('should provide info and return to pending_approval', async () => {
            const needInfoRequest = {
                ...sampleRequest,
                status: 'need_info' as const
            };
            repository.findById.mockResolvedValue(needInfoRequest);
            repository.findCommentById.mockResolvedValue({
                id: 'comment-id',
                commentType: 'info_request'
            });
            repository.createComment.mockResolvedValue({});
            repository.updateStatus.mockResolvedValue({
                ...needInfoRequest,
                status: 'pending_approval'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.provideInfo({
                requestId: sampleRequest.id,
                commentId: 'comment-id',
                response: 'Here are the budget details...',
                respondedBy: sampleRequest.requesterId
            });

            expect(result.success).toBe(true);
            expect(result.request?.status).toBe('pending_approval');
        });

        it('should reject when not requester', async () => {
            const needInfoRequest = {
                ...sampleRequest,
                status: 'need_info' as const
            };
            repository.findById.mockResolvedValue(needInfoRequest);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.provideInfo({
                requestId: sampleRequest.id,
                commentId: 'comment-id',
                response: 'Response...',
                respondedBy: '550e8400-e29b-41d4-a716-446655440999' // Not the requester
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Only the requester can provide information');
        });
    });

    // ==================== Cancel Tests ====================

    describe('cancelRequest', () => {
        it('should cancel request before approval (REQ-R07)', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.findApprovalStepsByRequestId.mockResolvedValue([]);
            repository.updateStatus.mockResolvedValue({
                ...sampleRequest,
                status: 'cancelled'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const dto: CancelRequestDto = {
                requestId: sampleRequest.id,
                cancelledBy: sampleRequest.requesterId,
                reason: 'No longer needed'
            };

            const result = await service.cancelRequest(dto);

            expect(result.success).toBe(true);
            expect(result.request?.status).toBe('cancelled');
        });

        it('should reject cancel when step already approved', async () => {
            const pendingRequest = {
                ...sampleRequest,
                status: 'pending_approval' as const
            };
            repository.findById.mockResolvedValue(pendingRequest);
            repository.findApprovalStepsByRequestId.mockResolvedValue([
                { ...sampleApprovalStep, status: 'approved' as const }
            ]);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.cancelRequest({
                requestId: sampleRequest.id,
                cancelledBy: sampleRequest.requesterId
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot cancel request that has already received approvals');
        });

        it('should reject cancel from non-requester', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.findApprovalStepsByRequestId.mockResolvedValue([]);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.cancelRequest({
                requestId: sampleRequest.id,
                cancelledBy: '550e8400-e29b-41d4-a716-446655440999' // Not the requester
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Only the requester can cancel their request');
        });
    });

    // ==================== Fulfillment Tests ====================

    describe('startFulfillment', () => {
        it('should start fulfillment for approved request', async () => {
            const approvedRequest = { ...sampleRequest, status: 'approved' as const };
            repository.findById.mockResolvedValue(approvedRequest);
            repository.updateStatus.mockResolvedValue({
                ...approvedRequest,
                status: 'fulfilling'
            });
            repository.createAuditLog.mockResolvedValue({});

            const result = await service.startFulfillment({
                requestId: sampleRequest.id,
                startedBy: '550e8400-e29b-41d4-a716-446655440080'
            });

            expect(result.success).toBe(true);
            expect(result.request?.status).toBe('fulfilling');
        });

        it('should reject when not approved', async () => {
            repository.findById.mockResolvedValue(sampleRequest);

            const result = await service.startFulfillment({
                requestId: sampleRequest.id,
                startedBy: '550e8400-e29b-41d4-a716-446655440080'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Request must be approved before fulfillment');
        });
    });

    describe('fulfillRequest', () => {
        it('should fulfill request with matching assets', async () => {
            const approvedRequest = { ...sampleRequest, status: 'approved' as const, quantity: 1 };
            repository.findById.mockResolvedValue(approvedRequest);
            repository.updateStatus.mockResolvedValue({
                ...approvedRequest,
                status: 'completed'
            });
            repository.createAuditLog.mockResolvedValue({});

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const dto: FulfillRequestDto = {
                requestId: sampleRequest.id,
                assetIds: ['550e8400-e29b-41d4-a716-446655440200'],
                fulfilledBy: '550e8400-e29b-41d4-a716-446655440080'
            };

            const result = await service.fulfillRequest(dto);

            expect(result.success).toBe(true);
            expect(result.request?.status).toBe('completed');
        });

        it('should reject when asset count mismatch', async () => {
            const approvedRequest = { ...sampleRequest, status: 'approved' as const, quantity: 2 };
            repository.findById.mockResolvedValue(approvedRequest);

            repository.withTransaction.mockImplementation(async (callback) => {
                return callback({} as any);
            });

            const result = await service.fulfillRequest({
                requestId: sampleRequest.id,
                assetIds: ['550e8400-e29b-41d4-a716-446655440200'], // Only 1 asset for quantity 2
                fulfilledBy: '550e8400-e29b-41d4-a716-446655440080'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Expected 2 asset(s), but 1 provided');
        });
    });

    // ==================== Escalation Tests ====================

    describe('escalateApproval', () => {
        it('should escalate pending step to new approver', async () => {
            repository.findApprovalStepById.mockResolvedValue(sampleApprovalStep);
            const escalatedStep = {
                ...sampleApprovalStep,
                approverId: '550e8400-e29b-41d4-a716-446655440100',
                isEscalated: true,
                escalatedFrom: sampleApprovalStep.approverId
            };
            repository.escalateApprovalStep.mockResolvedValue(escalatedStep);
            repository.createAuditLog.mockResolvedValue({});

            const result = await service.escalateApproval({
                stepId: sampleApprovalStep.id,
                newApproverId: '550e8400-e29b-41d4-a716-446655440100',
                reason: 'Original approver on leave',
                escalatedBy: '550e8400-e29b-41d4-a716-446655440080'
            });

            expect(result.success).toBe(true);
            expect(result.step?.isEscalated).toBe(true);
        });

        it('should reject escalation for non-pending step', async () => {
            const approvedStep = { ...sampleApprovalStep, status: 'approved' as const };
            repository.findApprovalStepById.mockResolvedValue(approvedStep);

            const result = await service.escalateApproval({
                stepId: sampleApprovalStep.id,
                newApproverId: '550e8400-e29b-41d4-a716-446655440100',
                reason: 'Test',
                escalatedBy: '550e8400-e29b-41d4-a716-446655440080'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Can only escalate pending steps');
        });
    });

    // ==================== Query Tests ====================

    describe('getRequests', () => {
        it('should return paginated requests', async () => {
            repository.findAll.mockResolvedValue({
                data: [sampleRequestWithDetails],
                total: 10
            });

            const result = await service.getRequests({ page: 1, limit: 20 });

            expect(result.data).toHaveLength(1);
            expect(result.pagination.total).toBe(10);
            expect(result.pagination.totalPages).toBe(1);
        });
    });

    describe('getApprovalQueue', () => {
        it('should return pending requests for approver', async () => {
            repository.findPendingByApprover.mockResolvedValue([sampleRequestWithDetails]);

            const result = await service.getApprovalQueue(sampleApprovalStep.approverId);

            expect(result).toHaveLength(1);
        });
    });

    describe('getFulfillmentQueue', () => {
        it('should return requests ready for fulfillment', async () => {
            repository.findReadyForFulfillment.mockResolvedValue({
                data: [{ ...sampleRequestWithDetails, status: 'approved' as const }],
                total: 1
            });

            const result = await service.getFulfillmentQueue();

            expect(result.data).toHaveLength(1);
        });
    });

    // ==================== Attachment Tests ====================

    describe('addAttachment', () => {
        it('should add attachment to draft request', async () => {
            repository.findById.mockResolvedValue(sampleRequest);
            repository.createAttachment.mockResolvedValue({
                id: 'attachment-id',
                fileName: 'document.pdf'
            });

            const result = await service.addAttachment({
                requestId: sampleRequest.id,
                fileName: 'document.pdf',
                filePath: '/uploads/document.pdf',
                uploadedBy: sampleRequest.requesterId
            });

            expect(result).toBeDefined();
            expect(result.fileName).toBe('document.pdf');
        });

        it('should reject attachment when request not found', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(
                service.addAttachment({
                    requestId: 'non-existent',
                    fileName: 'document.pdf',
                    filePath: '/uploads/document.pdf',
                    uploadedBy: sampleRequest.requesterId
                })
            ).rejects.toThrow('Request not found');
        });

        it('should reject attachment when status not allowed', async () => {
            const approvedRequest = { ...sampleRequest, status: 'approved' as const };
            repository.findById.mockResolvedValue(approvedRequest);

            await expect(
                service.addAttachment({
                    requestId: sampleRequest.id,
                    fileName: 'document.pdf',
                    filePath: '/uploads/document.pdf',
                    uploadedBy: sampleRequest.requesterId
                })
            ).rejects.toThrow('Cannot add attachments in current status');
        });
    });

    describe('deleteAttachment', () => {
        it('should delete attachment by uploader', async () => {
            repository.findAttachmentById.mockResolvedValue({
                id: 'attachment-id',
                requestId: sampleRequest.id,
                uploadedBy: sampleRequest.requesterId
            });
            repository.findById.mockResolvedValue(sampleRequest);
            repository.deleteAttachment.mockResolvedValue(true);

            const result = await service.deleteAttachment(
                'attachment-id',
                sampleRequest.requesterId
            );

            expect(result.success).toBe(true);
        });

        it('should reject deletion by non-uploader', async () => {
            repository.findAttachmentById.mockResolvedValue({
                id: 'attachment-id',
                requestId: sampleRequest.id,
                uploadedBy: sampleRequest.requesterId
            });

            const result = await service.deleteAttachment(
                'attachment-id',
                '550e8400-e29b-41d4-a716-446655440999'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Only the uploader can delete attachments');
        });
    });

    // ==================== Template Tests ====================

    describe('createTemplate', () => {
        it('should create approval chain template', async () => {
            repository.createTemplate.mockResolvedValue(sampleTemplate);

            const result = await service.createTemplate({
                name: 'Default Laptop Template',
                steps: [{ order: 1, role: 'direct_manager', autoAssign: true }],
                createdBy: sampleRequest.requesterId
            });

            expect(result).toBeDefined();
            expect(result.name).toBe('Default Laptop Template');
        });
    });

    describe('getActiveTemplates', () => {
        it('should return active templates', async () => {
            repository.findActiveTemplates.mockResolvedValue([sampleTemplate]);

            const result = await service.getActiveTemplates();

            expect(result).toHaveLength(1);
        });
    });

    // ==================== Statistics Tests ====================

    describe('getStatistics', () => {
        it('should return request statistics', async () => {
            const stats = {
                totalRequests: 10,
                byStatus: {
                    draft: 1,
                    pending_approval: 2,
                    need_info: 1,
                    approved: 2,
                    rejected: 1,
                    cancelled: 1,
                    fulfilling: 1,
                    completed: 1
                },
                byPriority: {
                    low: 2,
                    normal: 5,
                    high: 2,
                    urgent: 1
                },
                byType: {
                    new: 5,
                    replacement: 3,
                    upgrade: 1,
                    return: 1
                },
                avgCompletionDays: 3.5,
                pendingApprovals: 2,
                overdueApprovals: 1
            };
            repository.getStatistics.mockResolvedValue(stats);

            const result = await service.getStatistics();

            expect(result.totalRequests).toBe(10);
            expect(result.avgCompletionDays).toBe(3.5);
        });
    });
});
