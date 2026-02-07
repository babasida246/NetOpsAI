/**
 * Requests Module - Type Definitions
 * TypeScript interfaces for asset request and approval management
 */

// ==================== Base Types ====================

export type RequestType = 'new' | 'replacement' | 'upgrade' | 'return';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RequestStatus =
    | 'draft'
    | 'pending_approval'
    | 'need_info'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'fulfilling'
    | 'completed';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type CommentType = 'comment' | 'info_request' | 'info_response';

export type ApproverRole =
    | 'direct_manager'
    | 'department_head'
    | 'it_department'
    | 'finance'
    | 'asset_manager'
    | 'admin';

// ==================== Entity Interfaces ====================

export interface AssetRequest {
    id: string;
    requestCode: string;
    requestType: RequestType;
    requesterId: string;
    departmentId: string | null;
    assetCategoryId: string | null;
    assetModelId: string | null;
    quantity: number;
    currentAssetId: string | null;
    justification: string;
    priority: RequestPriority;
    requiredDate: string | null;
    status: RequestStatus;
    approvalChain: ApprovalChainStep[] | null;
    totalApprovalSteps: number;
    currentApprovalStep: number;
    fulfilledBy: string | null;
    fulfilledAt: Date | null;
    fulfilledAssetIds: string[] | null;
    cancelledBy: string | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
    rejectReason: string | null;
    submittedAt: Date | null;
    organizationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
}

export interface AssetRequestWithDetails extends AssetRequest {
    // Requester info
    requesterName: string | null;
    requesterEmail: string | null;
    departmentName: string | null;

    // Asset info
    categoryName: string | null;
    modelName: string | null;
    currentAssetTag: string | null;
    currentAssetName: string | null;

    // Approval progress
    approvedSteps: number;
    pendingApproverName: string | null;
    pendingApproverRole: ApproverRole | null;

    // Stats
    commentCount: number;
    attachmentCount: number;
    daysWaiting: number | null;
}

export interface ApprovalChainStep {
    order: number;
    role: ApproverRole;
    approverId?: string;
    autoAssign?: boolean;
}

export interface ApprovalStep {
    id: string;
    requestId: string;
    stepOrder: number;
    approverId: string;
    approverRole: ApproverRole | null;
    status: ApprovalStatus;
    decisionDate: Date | null;
    comments: string | null;
    isEscalated: boolean;
    escalatedFrom: string | null;
    escalatedAt: Date | null;
    escalationReason: string | null;
    reminderSentCount: number;
    lastReminderSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ApprovalStepWithDetails extends ApprovalStep {
    approverName: string | null;
    approverEmail: string | null;
    escalatedFromName: string | null;
    requestCode: string;
    requesterName: string | null;
}

export interface RequestAttachment {
    id: string;
    requestId: string;
    fileName: string;
    filePath: string;
    fileSize: number | null;
    fileType: string | null;
    uploadedBy: string;
    uploadedAt: Date;
    description: string | null;
}

export interface RequestAttachmentWithDetails extends RequestAttachment {
    uploadedByName: string | null;
}

export interface RequestComment {
    id: string;
    requestId: string;
    commentType: CommentType;
    content: string;
    authorId: string;
    approvalStepId: string | null;
    parentCommentId: string | null;
    createdAt: Date;
}

export interface RequestCommentWithDetails extends RequestComment {
    authorName: string | null;
    authorEmail: string | null;
    parentContent: string | null;
}

export interface RequestAuditLog {
    id: string;
    requestId: string;
    eventType: string;
    actorId: string;
    oldStatus: RequestStatus | null;
    newStatus: RequestStatus | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

export interface RequestAuditLogWithDetails extends RequestAuditLog {
    actorName: string | null;
    requestCode: string;
}

export interface ApprovalChainTemplate {
    id: string;
    name: string;
    description: string | null;
    assetCategoryId: string | null;
    minValue: number | null;
    maxValue: number | null;
    departmentId: string | null;
    requestType: RequestType | null;
    priority: number;
    steps: ApprovalChainStep[];
    isActive: boolean;
    organizationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
}

// ==================== DTOs ====================

// Create Request DTOs
export interface CreateRequestDto {
    requestType: RequestType;
    requesterId: string;
    departmentId?: string | null;
    assetCategoryId?: string | null;
    assetModelId?: string | null;
    quantity?: number;
    currentAssetId?: string | null;
    justification: string;
    priority?: RequestPriority;
    requiredDate?: string | null;
    organizationId?: string | null;
    createdBy: string;
}

export interface UpdateRequestDto {
    assetCategoryId?: string | null;
    assetModelId?: string | null;
    quantity?: number;
    justification?: string;
    priority?: RequestPriority;
    requiredDate?: string | null;
}

export interface SubmitRequestDto {
    requestId: string;
    submittedBy: string;
}

// Approval DTOs
export interface ApproveRequestDto {
    requestId: string;
    approverId: string;
    comments?: string | null;
}

export interface RejectRequestDto {
    requestId: string;
    approverId: string;
    reason: string;
}

export interface RequestMoreInfoDto {
    requestId: string;
    approverId: string;
    question: string;
}

export interface ProvideInfoDto {
    requestId: string;
    commentId: string;
    response: string;
    respondedBy: string;
}

// Cancel Request DTOs
export interface CancelRequestDto {
    requestId: string;
    cancelledBy: string;
    reason?: string | null;
}

// Fulfillment DTOs
export interface FulfillRequestDto {
    requestId: string;
    assetIds: string[];
    fulfilledBy: string;
    notes?: string | null;
}

export interface StartFulfillmentDto {
    requestId: string;
    startedBy: string;
}

// Attachment DTOs
export interface AddAttachmentDto {
    requestId: string;
    fileName: string;
    filePath: string;
    fileSize?: number | null;
    fileType?: string | null;
    uploadedBy: string;
    description?: string | null;
}

// Comment DTOs
export interface AddCommentDto {
    requestId: string;
    content: string;
    authorId: string;
    commentType?: CommentType;
    approvalStepId?: string | null;
    parentCommentId?: string | null;
}

// Escalation DTOs
export interface EscalateApprovalDto {
    stepId: string;
    newApproverId: string;
    reason: string;
    escalatedBy: string;
}

// Template DTOs
export interface CreateTemplateDto {
    name: string;
    description?: string | null;
    assetCategoryId?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    departmentId?: string | null;
    requestType?: RequestType | null;
    priority?: number;
    steps: ApprovalChainStep[];
    organizationId?: string | null;
    createdBy: string;
}

export interface UpdateTemplateDto {
    name?: string;
    description?: string | null;
    assetCategoryId?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    departmentId?: string | null;
    requestType?: RequestType | null;
    priority?: number;
    steps?: ApprovalChainStep[];
    isActive?: boolean;
}

// ==================== Query Interfaces ====================

export interface RequestListQuery {
    status?: RequestStatus | RequestStatus[];
    requestType?: RequestType | RequestType[];
    priority?: RequestPriority | RequestPriority[];
    requesterId?: string;
    departmentId?: string;
    assetCategoryId?: string;
    organizationId?: string;
    submittedFrom?: string;
    submittedTo?: string;
    requiredDateFrom?: string;
    requiredDateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'submitted_at' | 'required_date' | 'priority' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface ApprovalQueueQuery {
    approverId: string;
    status?: ApprovalStatus;
    priority?: RequestPriority | RequestPriority[];
    organizationId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'submitted_at' | 'priority' | 'days_waiting';
    sortOrder?: 'asc' | 'desc';
}

export interface FulfillmentQueueQuery {
    status?: 'approved' | 'fulfilling';
    assetCategoryId?: string;
    departmentId?: string;
    organizationId?: string;
    priority?: RequestPriority | RequestPriority[];
    page?: number;
    limit?: number;
    sortBy?: 'submitted_at' | 'priority' | 'required_date';
    sortOrder?: 'asc' | 'desc';
}

// ==================== Response Interfaces ====================

export interface RequestListResponse {
    data: AssetRequestWithDetails[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApprovalQueueResponse {
    data: Array<{
        request: AssetRequestWithDetails;
        step: ApprovalStepWithDetails;
        daysWaiting: number;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface FulfillmentQueueResponse {
    data: AssetRequestWithDetails[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface RequestDetailResponse {
    request: AssetRequestWithDetails;
    approvalSteps: ApprovalStepWithDetails[];
    comments: RequestCommentWithDetails[];
    attachments: RequestAttachmentWithDetails[];
    auditLogs: RequestAuditLogWithDetails[];
}

export interface RequestStatistics {
    totalRequests: number;
    byStatus: Record<RequestStatus, number>;
    byPriority: Record<RequestPriority, number>;
    byType: Record<RequestType, number>;
    avgCompletionDays: number | null;
    pendingApprovals: number;
    overdueApprovals: number;
}

// ==================== Result Types ====================

export interface RequestResult {
    success: boolean;
    request?: AssetRequest;
    error?: string;
}

export interface ApprovalResult {
    success: boolean;
    step?: ApprovalStep;
    isFullyApproved?: boolean;
    nextStep?: ApprovalStep | null;
    error?: string;
}

export interface FulfillmentResult {
    success: boolean;
    request?: AssetRequest;
    checkoutIds?: string[];
    error?: string;
}

export interface CancelResult {
    success: boolean;
    request?: AssetRequest;
    error?: string;
}
