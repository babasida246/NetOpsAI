/**
 * Requests Module - Repository Layer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool, PoolClient, QueryResult } from 'pg';
import { RequestsRepository } from './requests.repository.js';
import {
    CreateRequestDto,
    RequestListQuery,
    AddAttachmentDto,
    AddCommentDto,
    ApprovalChainStep
} from './requests.types.js';

// Mock Pool
function createMockPool() {
    return {
        query: vi.fn(),
        connect: vi.fn()
    } as unknown as Pool;
}

// Mock PoolClient
function createMockClient() {
    return {
        query: vi.fn(),
        release: vi.fn()
    } as unknown as PoolClient;
}

// Helper to create query result
function createQueryResult<T>(rows: T[], rowCount = rows.length): QueryResult<T> {
    return {
        rows,
        rowCount,
        command: 'SELECT',
        oid: 0,
        fields: []
    };
}

// Sample data
const sampleRequestRow = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    request_code: 'REQ-20240101-0001',
    request_type: 'new',
    requester_id: '550e8400-e29b-41d4-a716-446655440010',
    department_id: '550e8400-e29b-41d4-a716-446655440020',
    asset_category_id: '550e8400-e29b-41d4-a716-446655440030',
    asset_model_id: null,
    quantity: 1,
    current_asset_id: null,
    justification: 'Need a new laptop for development work and testing',
    priority: 'normal',
    required_date: '2024-02-01',
    status: 'draft',
    approval_chain: null,
    total_approval_steps: 0,
    current_approval_step: 0,
    fulfilled_by: null,
    fulfilled_at: null,
    fulfilled_asset_ids: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    rejected_by: null,
    rejected_at: null,
    reject_reason: null,
    submitted_at: null,
    organization_id: '550e8400-e29b-41d4-a716-446655440040',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    created_by: '550e8400-e29b-41d4-a716-446655440010'
};

const sampleRequestWithDetailsRow = {
    ...sampleRequestRow,
    requester_name: 'John Doe',
    requester_email: 'john@example.com',
    department_name: 'Engineering',
    category_name: 'Laptop',
    model_name: null,
    current_asset_tag: null,
    current_asset_name: null,
    approved_steps: 0,
    pending_approver_name: null,
    pending_approver_role: null,
    comment_count: 0,
    attachment_count: 0,
    days_waiting: null
};

const sampleApprovalStepRow = {
    id: '550e8400-e29b-41d4-a716-446655440050',
    request_id: '550e8400-e29b-41d4-a716-446655440001',
    step_order: 1,
    approver_id: '550e8400-e29b-41d4-a716-446655440060',
    approver_role: 'direct_manager',
    status: 'pending',
    decision_date: null,
    comments: null,
    is_escalated: false,
    escalated_from: null,
    escalated_at: null,
    escalation_reason: null,
    reminder_sent_count: 0,
    last_reminder_sent_at: null,
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
};

const sampleAttachmentRow = {
    id: '550e8400-e29b-41d4-a716-446655440070',
    request_id: '550e8400-e29b-41d4-a716-446655440001',
    file_name: 'document.pdf',
    file_path: '/uploads/document.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    uploaded_by: '550e8400-e29b-41d4-a716-446655440010',
    uploaded_at: new Date('2024-01-01T10:00:00Z'),
    description: 'Supporting document'
};

const sampleCommentRow = {
    id: '550e8400-e29b-41d4-a716-446655440080',
    request_id: '550e8400-e29b-41d4-a716-446655440001',
    comment_type: 'comment',
    content: 'This is a test comment',
    author_id: '550e8400-e29b-41d4-a716-446655440010',
    approval_step_id: null,
    parent_comment_id: null,
    created_at: new Date('2024-01-01T10:00:00Z')
};

const sampleAuditLogRow = {
    id: '550e8400-e29b-41d4-a716-446655440090',
    request_id: '550e8400-e29b-41d4-a716-446655440001',
    event_type: 'created',
    actor_id: '550e8400-e29b-41d4-a716-446655440010',
    old_status: null,
    new_status: 'draft',
    metadata: { requestType: 'new' },
    created_at: new Date('2024-01-01T10:00:00Z')
};

const sampleTemplateRow = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    name: 'Default Laptop Template',
    description: 'Default approval chain for laptop requests',
    asset_category_id: '550e8400-e29b-41d4-a716-446655440030',
    min_value: null,
    max_value: null,
    department_id: null,
    request_type: null,
    priority: 0,
    steps: [{ order: 1, role: 'direct_manager', autoAssign: true }],
    is_active: true,
    organization_id: '550e8400-e29b-41d4-a716-446655440040',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    created_by: '550e8400-e29b-41d4-a716-446655440010'
};

describe('RequestsRepository', () => {
    let pool: Pool;
    let repository: RequestsRepository;

    beforeEach(() => {
        pool = createMockPool();
        repository = new RequestsRepository(pool);
    });

    // ==================== Request CRUD Tests ====================

    describe('create', () => {
        it('should create a new request', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestRow]));

            const dto: CreateRequestDto = {
                requestType: 'new',
                requesterId: '550e8400-e29b-41d4-a716-446655440010',
                departmentId: '550e8400-e29b-41d4-a716-446655440020',
                assetCategoryId: '550e8400-e29b-41d4-a716-446655440030',
                quantity: 1,
                justification: 'Need a new laptop for development work and testing',
                priority: 'normal',
                requiredDate: '2024-02-01',
                organizationId: '550e8400-e29b-41d4-a716-446655440040',
                createdBy: '550e8400-e29b-41d4-a716-446655440010'
            };

            const result = await repository.create(dto);

            expect(result).toBeDefined();
            expect(result.id).toBe(sampleRequestRow.id);
            expect(result.requestCode).toBe('REQ-20240101-0001');
            expect(result.requestType).toBe('new');
            expect(result.status).toBe('draft');
            expect(mockQuery).toHaveBeenCalledTimes(1);
        });

        it('should create a replacement request with current asset', async () => {
            const replacementRow = {
                ...sampleRequestRow,
                request_type: 'replacement',
                current_asset_id: '550e8400-e29b-41d4-a716-446655440110'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([replacementRow]));

            const dto: CreateRequestDto = {
                requestType: 'replacement',
                requesterId: '550e8400-e29b-41d4-a716-446655440010',
                currentAssetId: '550e8400-e29b-41d4-a716-446655440110',
                justification: 'Current laptop is too old and needs replacement',
                createdBy: '550e8400-e29b-41d4-a716-446655440010'
            };

            const result = await repository.create(dto);

            expect(result.requestType).toBe('replacement');
            expect(result.currentAssetId).toBe('550e8400-e29b-41d4-a716-446655440110');
        });
    });

    describe('findById', () => {
        it('should find request by ID', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestRow]));

            const result = await repository.findById(sampleRequestRow.id);

            expect(result).toBeDefined();
            expect(result?.id).toBe(sampleRequestRow.id);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM asset_requests'),
                [sampleRequestRow.id]
            );
        });

        it('should return null when request not found', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([]));

            const result = await repository.findById('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('findByIdWithDetails', () => {
        it('should find request with full details', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            const result = await repository.findByIdWithDetails(sampleRequestRow.id);

            expect(result).toBeDefined();
            expect(result?.requesterName).toBe('John Doe');
            expect(result?.requesterEmail).toBe('john@example.com');
            expect(result?.departmentName).toBe('Engineering');
            expect(result?.categoryName).toBe('Laptop');
        });
    });

    describe('findByCode', () => {
        it('should find request by code', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestRow]));

            const result = await repository.findByCode('REQ-20240101-0001');

            expect(result).toBeDefined();
            expect(result?.requestCode).toBe('REQ-20240101-0001');
        });
    });

    describe('update', () => {
        it('should update request fields', async () => {
            const updatedRow = { ...sampleRequestRow, priority: 'high', quantity: 2 };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([updatedRow]));

            const result = await repository.update(sampleRequestRow.id, {
                priority: 'high',
                quantity: 2
            });

            expect(result).toBeDefined();
            expect(result?.priority).toBe('high');
            expect(result?.quantity).toBe(2);
        });

        it('should return request unchanged when no updates provided', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestRow]));

            const result = await repository.update(sampleRequestRow.id, {});

            expect(result).toBeDefined();
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM asset_requests'),
                [sampleRequestRow.id]
            );
        });
    });

    describe('updateStatus', () => {
        it('should update request status', async () => {
            const updatedRow = {
                ...sampleRequestRow,
                status: 'pending_approval',
                submitted_at: new Date()
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([updatedRow]));

            const result = await repository.updateStatus(
                sampleRequestRow.id,
                'pending_approval',
                { submittedAt: new Date() }
            );

            expect(result).toBeDefined();
            expect(result?.status).toBe('pending_approval');
        });
    });

    describe('delete', () => {
        it('should delete request', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([], 1));

            const result = await repository.delete(sampleRequestRow.id);

            expect(result).toBe(true);
        });

        it('should return false when request not found', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([], 0));

            const result = await repository.delete('non-existent-id');

            expect(result).toBe(false);
        });
    });

    // ==================== Request Query Tests ====================

    describe('findAll', () => {
        it('should return paginated requests', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '5' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            const result = await repository.findAll({
                page: 1,
                limit: 20
            });

            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(5);
        });

        it('should filter by status', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '2' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            const result = await repository.findAll({
                status: 'pending_approval',
                page: 1,
                limit: 20
            });

            expect(result.data).toHaveLength(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('status = ANY'),
                expect.arrayContaining([['pending_approval']])
            );
        });

        it('should filter by multiple statuses', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '3' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            await repository.findAll({
                status: ['draft', 'pending_approval'],
                page: 1,
                limit: 20
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('status = ANY'),
                expect.arrayContaining([['draft', 'pending_approval']])
            );
        });

        it('should filter by requesterId', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '1' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            await repository.findAll({
                requesterId: sampleRequestRow.requester_id,
                page: 1,
                limit: 20
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('requester_id'),
                expect.arrayContaining([sampleRequestRow.requester_id])
            );
        });

        it('should search by text', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '1' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            await repository.findAll({
                search: 'laptop',
                page: 1,
                limit: 20
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('ILIKE'),
                expect.arrayContaining(['%laptop%'])
            );
        });

        it('should sort by priority', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '1' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            await repository.findAll({
                sortBy: 'priority',
                sortOrder: 'asc',
                page: 1,
                limit: 20
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('CASE r.priority'),
                expect.any(Array)
            );
        });
    });

    describe('findByRequesterId', () => {
        it('should find requests by requester ID', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '2' }]))
                .mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            const result = await repository.findByRequesterId(sampleRequestRow.requester_id);

            expect(result).toHaveLength(1);
        });
    });

    describe('findPendingByApprover', () => {
        it('should find pending requests for approver', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleRequestWithDetailsRow]));

            const result = await repository.findPendingByApprover(
                sampleApprovalStepRow.approver_id
            );

            expect(result).toHaveLength(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'pending_approval'"),
                [sampleApprovalStepRow.approver_id]
            );
        });
    });

    describe('findReadyForFulfillment', () => {
        it('should find requests ready for fulfillment', async () => {
            const approvedRow = { ...sampleRequestWithDetailsRow, status: 'approved' };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([{ count: '1' }]))
                .mockResolvedValueOnce(createQueryResult([approvedRow]));

            const result = await repository.findReadyForFulfillment();

            expect(result.data).toHaveLength(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("IN ('approved', 'fulfilling')"),
                expect.any(Array)
            );
        });
    });

    describe('hasPendingSimilarRequest', () => {
        it('should return true if similar request exists', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([{ exists: true }]));

            const result = await repository.hasPendingSimilarRequest(
                sampleRequestRow.requester_id,
                sampleRequestRow.asset_category_id!,
                'new'
            );

            expect(result).toBe(true);
        });

        it('should return false if no similar request exists', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([{ exists: false }]));

            const result = await repository.hasPendingSimilarRequest(
                sampleRequestRow.requester_id,
                sampleRequestRow.asset_category_id!,
                'new'
            );

            expect(result).toBe(false);
        });
    });

    // ==================== Approval Step Tests ====================

    describe('createApprovalStep', () => {
        it('should create approval step', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleApprovalStepRow]));

            const result = await repository.createApprovalStep(
                sampleRequestRow.id,
                1,
                sampleApprovalStepRow.approver_id,
                'direct_manager'
            );

            expect(result).toBeDefined();
            expect(result.stepOrder).toBe(1);
            expect(result.approverRole).toBe('direct_manager');
            expect(result.status).toBe('pending');
        });
    });

    describe('createApprovalSteps', () => {
        it('should create multiple approval steps', async () => {
            const step2Row = { ...sampleApprovalStepRow, step_order: 2, approver_role: 'department_head' };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([sampleApprovalStepRow]))
                .mockResolvedValueOnce(createQueryResult([step2Row]));

            const steps: ApprovalChainStep[] = [
                { order: 1, role: 'direct_manager', approverId: sampleApprovalStepRow.approver_id },
                { order: 2, role: 'department_head', approverId: '550e8400-e29b-41d4-a716-446655440070' }
            ];

            const result = await repository.createApprovalSteps(sampleRequestRow.id, steps);

            expect(result).toHaveLength(2);
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should skip steps without approverId', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleApprovalStepRow]));

            const steps: ApprovalChainStep[] = [
                { order: 1, role: 'direct_manager', approverId: sampleApprovalStepRow.approver_id },
                { order: 2, role: 'department_head' } // No approverId
            ];

            const result = await repository.createApprovalSteps(sampleRequestRow.id, steps);

            expect(result).toHaveLength(1);
            expect(mockQuery).toHaveBeenCalledTimes(1);
        });
    });

    describe('findApprovalStepsByRequestId', () => {
        it('should find all steps for request', async () => {
            const step2Row = { ...sampleApprovalStepRow, step_order: 2 };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleApprovalStepRow, step2Row]));

            const result = await repository.findApprovalStepsByRequestId(sampleRequestRow.id);

            expect(result).toHaveLength(2);
        });
    });

    describe('findCurrentApprovalStep', () => {
        it('should find current pending step', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleApprovalStepRow]));

            const result = await repository.findCurrentApprovalStep(sampleRequestRow.id);

            expect(result).toBeDefined();
            expect(result?.stepOrder).toBe(1);
        });
    });

    describe('updateApprovalStep', () => {
        it('should update step to approved', async () => {
            const approvedRow = {
                ...sampleApprovalStepRow,
                status: 'approved',
                decision_date: new Date(),
                comments: 'Approved'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([approvedRow]));

            const result = await repository.updateApprovalStep(
                sampleApprovalStepRow.id,
                'approved',
                'Approved'
            );

            expect(result).toBeDefined();
            expect(result?.status).toBe('approved');
            expect(result?.comments).toBe('Approved');
        });
    });

    describe('escalateApprovalStep', () => {
        it('should escalate step to new approver', async () => {
            const escalatedRow = {
                ...sampleApprovalStepRow,
                approver_id: '550e8400-e29b-41d4-a716-446655440100',
                is_escalated: true,
                escalated_from: sampleApprovalStepRow.approver_id,
                escalated_at: new Date(),
                escalation_reason: 'Original approver unavailable'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([escalatedRow]));

            const result = await repository.escalateApprovalStep(
                sampleApprovalStepRow.id,
                '550e8400-e29b-41d4-a716-446655440100',
                'Original approver unavailable'
            );

            expect(result).toBeDefined();
            expect(result?.isEscalated).toBe(true);
            expect(result?.escalatedFrom).toBe(sampleApprovalStepRow.approver_id);
        });
    });

    describe('updateReminderSent', () => {
        it('should increment reminder count', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([], 1));

            await repository.updateReminderSent(sampleApprovalStepRow.id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('reminder_sent_count = reminder_sent_count + 1'),
                [sampleApprovalStepRow.id]
            );
        });
    });

    // ==================== Attachment Tests ====================

    describe('createAttachment', () => {
        it('should create attachment', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleAttachmentRow]));

            const dto: AddAttachmentDto = {
                requestId: sampleRequestRow.id,
                fileName: 'document.pdf',
                filePath: '/uploads/document.pdf',
                fileSize: 1024,
                fileType: 'application/pdf',
                uploadedBy: sampleRequestRow.requester_id,
                description: 'Supporting document'
            };

            const result = await repository.createAttachment(dto);

            expect(result).toBeDefined();
            expect(result.fileName).toBe('document.pdf');
        });
    });

    describe('findAttachmentsByRequestId', () => {
        it('should find attachments for request', async () => {
            const attachmentWithDetails = {
                ...sampleAttachmentRow,
                uploaded_by_name: 'John Doe'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([attachmentWithDetails]));

            const result = await repository.findAttachmentsByRequestId(sampleRequestRow.id);

            expect(result).toHaveLength(1);
            expect(result[0].uploadedByName).toBe('John Doe');
        });
    });

    describe('deleteAttachment', () => {
        it('should delete attachment', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([], 1));

            const result = await repository.deleteAttachment(sampleAttachmentRow.id);

            expect(result).toBe(true);
        });
    });

    // ==================== Comment Tests ====================

    describe('createComment', () => {
        it('should create comment', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleCommentRow]));

            const dto: AddCommentDto = {
                requestId: sampleRequestRow.id,
                content: 'This is a test comment',
                authorId: sampleRequestRow.requester_id,
                commentType: 'comment'
            };

            const result = await repository.createComment(dto);

            expect(result).toBeDefined();
            expect(result.content).toBe('This is a test comment');
        });

        it('should create info request comment', async () => {
            const infoRequestRow = {
                ...sampleCommentRow,
                comment_type: 'info_request',
                content: 'Please provide more details',
                approval_step_id: sampleApprovalStepRow.id
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([infoRequestRow]));

            const dto: AddCommentDto = {
                requestId: sampleRequestRow.id,
                content: 'Please provide more details',
                authorId: sampleApprovalStepRow.approver_id,
                commentType: 'info_request',
                approvalStepId: sampleApprovalStepRow.id
            };

            const result = await repository.createComment(dto);

            expect(result.commentType).toBe('info_request');
        });
    });

    describe('findCommentsByRequestId', () => {
        it('should find comments for request', async () => {
            const commentWithDetails = {
                ...sampleCommentRow,
                author_name: 'John Doe',
                author_email: 'john@example.com',
                parent_content: null
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([commentWithDetails]));

            const result = await repository.findCommentsByRequestId(sampleRequestRow.id);

            expect(result).toHaveLength(1);
            expect(result[0].authorName).toBe('John Doe');
        });
    });

    describe('findPendingInfoRequests', () => {
        it('should find unanswered info requests', async () => {
            const infoRequestRow = {
                ...sampleCommentRow,
                comment_type: 'info_request'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([infoRequestRow]));

            const result = await repository.findPendingInfoRequests(sampleRequestRow.id);

            expect(result).toHaveLength(1);
            expect(result[0].commentType).toBe('info_request');
        });
    });

    // ==================== Audit Log Tests ====================

    describe('createAuditLog', () => {
        it('should create audit log entry', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleAuditLogRow]));

            const result = await repository.createAuditLog(
                sampleRequestRow.id,
                'created',
                sampleRequestRow.requester_id,
                null,
                'draft',
                { requestType: 'new' }
            );

            expect(result).toBeDefined();
            expect(result.eventType).toBe('created');
        });
    });

    describe('findAuditLogsByRequestId', () => {
        it('should find audit logs for request', async () => {
            const auditWithDetails = {
                ...sampleAuditLogRow,
                actor_name: 'John Doe',
                request_code: 'REQ-20240101-0001'
            };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([auditWithDetails]));

            const result = await repository.findAuditLogsByRequestId(sampleRequestRow.id);

            expect(result).toHaveLength(1);
            expect(result[0].actorName).toBe('John Doe');
        });
    });

    // ==================== Template Tests ====================

    describe('createTemplate', () => {
        it('should create approval chain template', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleTemplateRow]));

            const result = await repository.createTemplate({
                name: 'Default Laptop Template',
                description: 'Default approval chain for laptop requests',
                assetCategoryId: sampleTemplateRow.asset_category_id,
                steps: [{ order: 1, role: 'direct_manager', autoAssign: true }],
                createdBy: sampleRequestRow.requester_id
            });

            expect(result).toBeDefined();
            expect(result.name).toBe('Default Laptop Template');
        });
    });

    describe('findActiveTemplates', () => {
        it('should find active templates', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleTemplateRow]));

            const result = await repository.findActiveTemplates();

            expect(result).toHaveLength(1);
            expect(result[0].isActive).toBe(true);
        });
    });

    describe('findMatchingTemplate', () => {
        it('should find matching template', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([sampleTemplateRow]));

            const result = await repository.findMatchingTemplate(
                sampleTemplateRow.asset_category_id,
                null,
                null,
                'new',
                sampleTemplateRow.organization_id
            );

            expect(result).toBeDefined();
            expect(result?.name).toBe('Default Laptop Template');
        });

        it('should return null when no matching template', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([]));

            const result = await repository.findMatchingTemplate(
                '550e8400-e29b-41d4-a716-446655440999',
                null,
                null,
                'new',
                null
            );

            expect(result).toBeNull();
        });
    });

    describe('updateTemplate', () => {
        it('should update template', async () => {
            const updatedRow = { ...sampleTemplateRow, name: 'Updated Template' };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([updatedRow]));

            const result = await repository.updateTemplate(sampleTemplateRow.id, {
                name: 'Updated Template'
            });

            expect(result?.name).toBe('Updated Template');
        });

        it('should deactivate template', async () => {
            const deactivatedRow = { ...sampleTemplateRow, is_active: false };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([deactivatedRow]));

            const result = await repository.updateTemplate(sampleTemplateRow.id, {
                isActive: false
            });

            expect(result?.isActive).toBe(false);
        });
    });

    describe('deleteTemplate', () => {
        it('should delete template', async () => {
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery.mockResolvedValueOnce(createQueryResult([], 1));

            const result = await repository.deleteTemplate(sampleTemplateRow.id);

            expect(result).toBe(true);
        });
    });

    // ==================== Statistics Tests ====================

    describe('getStatistics', () => {
        it('should return request statistics', async () => {
            const statsRow = {
                total_requests: '10',
                draft: '1',
                pending_approval: '2',
                need_info: '1',
                approved: '2',
                rejected: '1',
                cancelled: '1',
                fulfilling: '1',
                completed: '1',
                priority_low: '2',
                priority_normal: '5',
                priority_high: '2',
                priority_urgent: '1',
                type_new: '5',
                type_replacement: '3',
                type_upgrade: '1',
                type_return: '1',
                avg_completion_days: '3.5'
            };
            const overdueRow = { count: '2' };
            const mockQuery = pool.query as ReturnType<typeof vi.fn>;
            mockQuery
                .mockResolvedValueOnce(createQueryResult([statsRow]))
                .mockResolvedValueOnce(createQueryResult([overdueRow]));

            const result = await repository.getStatistics();

            expect(result.totalRequests).toBe(10);
            expect(result.byStatus.draft).toBe(1);
            expect(result.byStatus.pending_approval).toBe(2);
            expect(result.byPriority.normal).toBe(5);
            expect(result.byType.new).toBe(5);
            expect(result.avgCompletionDays).toBe(3.5);
            expect(result.overdueApprovals).toBe(2);
        });
    });

    // ==================== Transaction Tests ====================

    describe('withTransaction', () => {
        it('should commit on success', async () => {
            const mockClient = createMockClient();
            const mockConnect = pool.connect as ReturnType<typeof vi.fn>;
            mockConnect.mockResolvedValueOnce(mockClient);

            const mockClientQuery = mockClient.query as ReturnType<typeof vi.fn>;
            mockClientQuery
                .mockResolvedValueOnce(createQueryResult([])) // BEGIN
                .mockResolvedValueOnce(createQueryResult([{ result: 'success' }])) // User query
                .mockResolvedValueOnce(createQueryResult([])); // COMMIT

            const result = await repository.withTransaction(async (client) => {
                const res = await client.query('SELECT $1 as result', ['success']);
                return res.rows[0].result;
            });

            expect(result).toBe('success');
            expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
            expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            const mockClient = createMockClient();
            const mockConnect = pool.connect as ReturnType<typeof vi.fn>;
            mockConnect.mockResolvedValueOnce(mockClient);

            const mockClientQuery = mockClient.query as ReturnType<typeof vi.fn>;
            mockClientQuery
                .mockResolvedValueOnce(createQueryResult([])) // BEGIN
                .mockRejectedValueOnce(new Error('Query failed')) // User query
                .mockResolvedValueOnce(createQueryResult([])); // ROLLBACK

            await expect(
                repository.withTransaction(async () => {
                    throw new Error('Query failed');
                })
            ).rejects.toThrow('Query failed');

            expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
            expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
