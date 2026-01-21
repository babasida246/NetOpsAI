import { z } from 'zod'
import { CiStatusValues, CmdbFieldTypeValues, EnvironmentValues } from '@domain/core'

export const cmdbTypeIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const cmdbVersionIdParamsSchema = z.object({
    versionId: z.string().uuid()
})

export const cmdbAttrDefIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const cmdbCiIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const cmdbRelationshipIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const cmdbServiceIdParamsSchema = z.object({
    id: z.string().uuid()
})

export const cmdbServiceMemberIdParamsSchema = z.object({
    id: z.string().uuid(),
    memberId: z.string().uuid()
})

export const cmdbTypeCreateSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional()
})

export const cmdbAttrDefCreateSchema = z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    fieldType: z.enum(CmdbFieldTypeValues),
    required: z.boolean().optional(),
    unit: z.string().nullable().optional(),
    enumValues: z.array(z.string()).nullable().optional(),
    pattern: z.string().nullable().optional(),
    minValue: z.number().nullable().optional(),
    maxValue: z.number().nullable().optional(),
    stepValue: z.number().nullable().optional(),
    minLen: z.number().int().nullable().optional(),
    maxLen: z.number().int().nullable().optional(),
    defaultValue: z.unknown().optional(),
    isSearchable: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional()
})

export const cmdbAttrDefUpdateSchema = cmdbAttrDefCreateSchema.partial()

export const cmdbCiCreateSchema = z.object({
    typeId: z.string().uuid(),
    name: z.string().min(1),
    ciCode: z.string().min(1),
    status: z.enum(CiStatusValues).optional(),
    environment: z.enum(EnvironmentValues).optional(),
    assetId: z.string().uuid().nullable().optional(),
    locationId: z.string().uuid().nullable().optional(),
    ownerTeam: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    attributes: z.record(z.unknown()).optional()
})

export const cmdbCiUpdateSchema = cmdbCiCreateSchema.partial()

export const cmdbCiListQuerySchema = z.object({
    q: z.string().optional(),
    status: z.enum(CiStatusValues).optional(),
    environment: z.enum(EnvironmentValues).optional(),
    typeId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
})

export const cmdbGraphQuerySchema = z.object({
    depth: z.coerce.number().int().positive().optional(),
    direction: z.enum(['upstream', 'downstream', 'both']).optional()
})

export const cmdbRelationshipCreateSchema = z.object({
    relTypeId: z.string().uuid(),
    fromCiId: z.string().uuid(),
    toCiId: z.string().uuid(),
    sinceDate: z.string().nullable().optional(),
    note: z.string().nullable().optional()
})

export const cmdbRelationshipTypeCreateSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    reverseName: z.string().nullable().optional(),
    allowedFromTypeId: z.string().uuid().nullable().optional(),
    allowedToTypeId: z.string().uuid().nullable().optional()
})

export const cmdbServiceCreateSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    criticality: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    sla: z.string().nullable().optional(),
    status: z.string().nullable().optional()
})

export const cmdbServiceUpdateSchema = cmdbServiceCreateSchema.partial()

export const cmdbServiceListQuerySchema = z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional()
})

export const cmdbServiceMemberCreateSchema = z.object({
    ciId: z.string().uuid(),
    role: z.string().nullable().optional()
})
