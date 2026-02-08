import { z } from 'zod'
import { WorkflowRequestStatusValues, WorkflowRequestTypeValues } from '@domain/core'

export const workflowCreateSchema = z.object({
    requestType: z.enum(WorkflowRequestTypeValues),
    assetId: z.string().uuid().optional(),
    fromDept: z.string().optional(),
    toDept: z.string().optional(),
    payload: z.record(z.unknown()).optional()
})

export const workflowListSchema = z.object({
    status: z.enum(WorkflowRequestStatusValues).optional(),
    requestType: z.enum(WorkflowRequestTypeValues).optional(),
    requestedBy: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
})

export const workflowIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const workflowRejectSchema = z.object({
    reason: z.string().min(1).optional()
})

export type WorkflowCreateBody = z.infer<typeof workflowCreateSchema>
export type WorkflowListQuery = z.infer<typeof workflowListSchema>
export type WorkflowRejectBody = z.infer<typeof workflowRejectSchema>
