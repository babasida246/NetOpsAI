/**
 * Requests Module - Zod Validation Schemas
 * Validation schemas for request and approval operations
 */

import { z } from 'zod';

// ==================== Base Schemas ====================

export const requestTypeSchema = z.enum(['new', 'replacement', 'upgrade', 'return']);
export const requestPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export const requestStatusSchema = z.enum([
    'draft',
    'pending_approval',
    'need_info',
    'approved',
    'rejected',
    'cancelled',
    'fulfilling',
    'completed'
]);

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'skipped']);
export const commentTypeSchema = z.enum(['comment', 'info_request', 'info_response']);
export const approverRoleSchema = z.enum([
    'direct_manager',
    'department_head',
    'it_department',
    'finance',
    'asset_manager',
    'admin'
]);

// UUID validation
const uuidSchema = z.string().uuid();
const optionalUuidSchema = z.string().uuid().optional().nullable();

// Date validation
const dateStringSchema = z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
);
const optionalDateStringSchema = dateStringSchema.optional().nullable();

// ==================== Approval Chain Step Schema ====================

export const approvalChainStepSchema = z.object({
    order: z.number().int().positive(),
    role: approverRoleSchema,
    approverId: optionalUuidSchema,
    autoAssign: z.boolean().optional()
});

// ==================== Create Request Schema ====================

export const createRequestSchema = z.object({
    requestType: requestTypeSchema,
    requesterId: uuidSchema,
    departmentId: optionalUuidSchema,
    assetCategoryId: optionalUuidSchema,
    assetModelId: optionalUuidSchema,
    quantity: z.number().int().positive().default(1),
    currentAssetId: optionalUuidSchema,
    justification: z.string()
        .min(20, 'Justification must be at least 20 characters')
        .max(2000, 'Justification cannot exceed 2000 characters'),
    priority: requestPrioritySchema.default('normal'),
    requiredDate: optionalDateStringSchema,
    organizationId: optionalUuidSchema,
    createdBy: uuidSchema
}).refine(
    (data) => {
        // REQ-R08: Replacement/upgrade/return must have currentAssetId
        if (['replacement', 'upgrade', 'return'].includes(data.requestType)) {
            return data.currentAssetId != null;
        }
        return true;
    },
    {
        message: 'Replacement, upgrade, and return requests must specify the current asset',
        path: ['currentAssetId']
    }
);

// ==================== Update Request Schema ====================

export const updateRequestSchema = z.object({
    assetCategoryId: optionalUuidSchema,
    assetModelId: optionalUuidSchema,
    quantity: z.number().int().positive().optional(),
    justification: z.string()
        .min(20, 'Justification must be at least 20 characters')
        .max(2000, 'Justification cannot exceed 2000 characters')
        .optional(),
    priority: requestPrioritySchema.optional(),
    requiredDate: optionalDateStringSchema
});

// ==================== Submit Request Schema ====================

export const submitRequestSchema = z.object({
    requestId: uuidSchema,
    submittedBy: uuidSchema
});

// ==================== Approval Schemas ====================

export const approveRequestSchema = z.object({
    requestId: uuidSchema,
    approverId: uuidSchema,
    comments: z.string().max(1000).optional().nullable()
});

export const rejectRequestSchema = z.object({
    requestId: uuidSchema,
    approverId: uuidSchema,
    reason: z.string()
        .min(10, 'Rejection reason must be at least 10 characters')
        .max(1000, 'Rejection reason cannot exceed 1000 characters')
});

export const requestMoreInfoSchema = z.object({
    requestId: uuidSchema,
    approverId: uuidSchema,
    question: z.string()
        .min(10, 'Question must be at least 10 characters')
        .max(1000, 'Question cannot exceed 1000 characters')
});

export const provideInfoSchema = z.object({
    requestId: uuidSchema,
    commentId: uuidSchema,
    response: z.string()
        .min(10, 'Response must be at least 10 characters')
        .max(2000, 'Response cannot exceed 2000 characters'),
    respondedBy: uuidSchema
});

// ==================== Cancel Request Schema ====================

export const cancelRequestSchema = z.object({
    requestId: uuidSchema,
    cancelledBy: uuidSchema,
    reason: z.string().max(500).optional().nullable()
});

// ==================== Fulfillment Schemas ====================

export const startFulfillmentSchema = z.object({
    requestId: uuidSchema,
    startedBy: uuidSchema
});

export const fulfillRequestSchema = z.object({
    requestId: uuidSchema,
    assetIds: z.array(uuidSchema).min(1, 'At least one asset must be provided'),
    fulfilledBy: uuidSchema,
    notes: z.string().max(1000).optional().nullable()
});

// ==================== Attachment Schema ====================

export const addAttachmentSchema = z.object({
    requestId: uuidSchema,
    fileName: z.string().min(1).max(255),
    filePath: z.string().min(1).max(500),
    fileSize: z.number().int().positive().optional().nullable(),
    fileType: z.string().max(100).optional().nullable(),
    uploadedBy: uuidSchema,
    description: z.string().max(500).optional().nullable()
});

// ==================== Comment Schema ====================

export const addCommentSchema = z.object({
    requestId: uuidSchema,
    content: z.string()
        .min(1, 'Comment cannot be empty')
        .max(2000, 'Comment cannot exceed 2000 characters'),
    authorId: uuidSchema,
    commentType: commentTypeSchema.default('comment'),
    approvalStepId: optionalUuidSchema,
    parentCommentId: optionalUuidSchema
});

// ==================== Escalation Schema ====================

export const escalateApprovalSchema = z.object({
    stepId: uuidSchema,
    newApproverId: uuidSchema,
    reason: z.string()
        .min(10, 'Escalation reason must be at least 10 characters')
        .max(500, 'Escalation reason cannot exceed 500 characters'),
    escalatedBy: uuidSchema
});

// ==================== Template Schemas ====================

export const createTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    assetCategoryId: optionalUuidSchema,
    minValue: z.number().nonnegative().optional().nullable(),
    maxValue: z.number().nonnegative().optional().nullable(),
    departmentId: optionalUuidSchema,
    requestType: requestTypeSchema.optional().nullable(),
    priority: z.number().int().nonnegative().default(0),
    steps: z.array(approvalChainStepSchema).min(1, 'At least one approval step is required'),
    organizationId: optionalUuidSchema,
    createdBy: uuidSchema
}).refine(
    (data) => {
        if (data.minValue != null && data.maxValue != null) {
            return data.minValue <= data.maxValue;
        }
        return true;
    },
    {
        message: 'Min value must be less than or equal to max value',
        path: ['minValue']
    }
);

export const updateTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    assetCategoryId: optionalUuidSchema,
    minValue: z.number().nonnegative().optional().nullable(),
    maxValue: z.number().nonnegative().optional().nullable(),
    departmentId: optionalUuidSchema,
    requestType: requestTypeSchema.optional().nullable(),
    priority: z.number().int().nonnegative().optional(),
    steps: z.array(approvalChainStepSchema).min(1).optional(),
    isActive: z.boolean().optional()
});

// ==================== Query Schemas ====================

export const requestListQuerySchema = z.object({
    status: z.union([requestStatusSchema, z.array(requestStatusSchema)]).optional(),
    requestType: z.union([requestTypeSchema, z.array(requestTypeSchema)]).optional(),
    priority: z.union([requestPrioritySchema, z.array(requestPrioritySchema)]).optional(),
    requesterId: optionalUuidSchema,
    departmentId: optionalUuidSchema,
    assetCategoryId: optionalUuidSchema,
    organizationId: optionalUuidSchema,
    submittedFrom: optionalDateStringSchema,
    submittedTo: optionalDateStringSchema,
    requiredDateFrom: optionalDateStringSchema,
    requiredDateTo: optionalDateStringSchema,
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['created_at', 'submitted_at', 'required_date', 'priority', 'status']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const approvalQueueQuerySchema = z.object({
    approverId: uuidSchema,
    status: approvalStatusSchema.optional(),
    priority: z.union([requestPrioritySchema, z.array(requestPrioritySchema)]).optional(),
    organizationId: optionalUuidSchema,
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['submitted_at', 'priority', 'days_waiting']).default('submitted_at'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const fulfillmentQueueQuerySchema = z.object({
    status: z.enum(['approved', 'fulfilling']).optional(),
    assetCategoryId: optionalUuidSchema,
    departmentId: optionalUuidSchema,
    organizationId: optionalUuidSchema,
    priority: z.union([requestPrioritySchema, z.array(requestPrioritySchema)]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['submitted_at', 'priority', 'required_date']).default('submitted_at'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// ==================== Route Parameter Schemas ====================

export const requestIdParamSchema = z.object({
    id: uuidSchema
});

export const stepIdParamSchema = z.object({
    stepId: uuidSchema
});

export const templateIdParamSchema = z.object({
    templateId: uuidSchema
});

export const attachmentIdParamSchema = z.object({
    attachmentId: uuidSchema
});

export const commentIdParamSchema = z.object({
    commentId: uuidSchema
});

// ==================== Type Exports ====================

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type SubmitRequestInput = z.infer<typeof submitRequestSchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type RequestMoreInfoInput = z.infer<typeof requestMoreInfoSchema>;
export type ProvideInfoInput = z.infer<typeof provideInfoSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
export type StartFulfillmentInput = z.infer<typeof startFulfillmentSchema>;
export type FulfillRequestInput = z.infer<typeof fulfillRequestSchema>;
export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type EscalateApprovalInput = z.infer<typeof escalateApprovalSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type RequestListQueryInput = z.infer<typeof requestListQuerySchema>;
export type ApprovalQueueQueryInput = z.infer<typeof approvalQueueQuerySchema>;
export type FulfillmentQueueQueryInput = z.infer<typeof fulfillmentQueueQuerySchema>;
