/**
 * Drivers Module - Schemas & Types
 */
import { z } from 'zod'

export const driverDeviceTypeValues = [
    'workstation',
    'laptop',
    'printer',
    'switch',
    'router',
    'server',
    'peripheral',
    'other'
] as const

export const driverComponentValues = [
    'chipset',
    'lan',
    'wifi',
    'gpu',
    'audio',
    'storage',
    'bios',
    'firmware',
    'other'
] as const

export const driverOsValues = [
    'win10',
    'win11',
    'server2019',
    'server2022',
    'ubuntu',
    'debian',
    'rhel',
    'other'
] as const

export const driverArchValues = ['x64', 'arm64', 'x86'] as const

export const driverSupportStatusValues = ['supported', 'deprecated', 'blocked'] as const
export const driverRiskLevelValues = ['low', 'medium', 'high', 'critical'] as const

export const approvalStatusValues = ['draft', 'pending', 'approved', 'rejected'] as const

export const uuidSchema = z.string().uuid()

export const driverFileSchema = z.object({
    storageKey: z.string(),
    filename: z.string(),
    size: z.number().int().nonnegative(),
    mime: z.string().nullable().optional(),
    sha256: z.string().nullable().optional(),
    sha1: z.string().nullable().optional(),
    signed: z.boolean().default(false),
    signatureInfo: z.record(z.any()).nullable().optional()
})

export const driverInstallSchema = z.object({
    silentInstallCmd: z.string().nullable().optional(),
    silentUninstallCmd: z.string().nullable().optional(),
    detectRules: z.record(z.any()).nullable().optional()
})

export const driverApprovalSchema = z.object({
    status: z.enum(approvalStatusValues),
    requestedBy: uuidSchema.nullable().optional(),
    approvedBy: uuidSchema.nullable().optional(),
    approvedAt: z.string().datetime().nullable().optional(),
    reason: z.string().nullable().optional()
})

export const driverLinksSchema = z.object({
    vendorUrl: z.string().url().nullable().optional(),
    releaseNotesUrl: z.string().url().nullable().optional()
})

export const driverPackageSchema = z.object({
    id: uuidSchema,
    parentId: uuidSchema.nullable().optional(),
    vendor: z.string(),
    deviceType: z.enum(driverDeviceTypeValues),
    model: z.string(),
    component: z.enum(driverComponentValues),
    os: z.enum(driverOsValues),
    osVersion: z.string().nullable().optional(),
    arch: z.enum(driverArchValues),
    version: z.string(),
    releaseDate: z.string().date().nullable().optional(),
    supportStatus: z.enum(driverSupportStatusValues),
    riskLevel: z.enum(driverRiskLevelValues),
    compatibilityNotes: z.string().nullable().optional(),
    file: driverFileSchema.nullable().optional(),
    install: driverInstallSchema.optional(),
    approval: driverApprovalSchema,
    tags: z.array(z.string()).default([]),
    links: driverLinksSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

export type DriverPackage = z.infer<typeof driverPackageSchema>

export const driverListQuerySchema = z.object({
    vendor: z.string().optional(),
    model: z.string().optional(),
    os: z.enum(driverOsValues).optional(),
    arch: z.enum(driverArchValues).optional(),
    component: z.enum(driverComponentValues).optional(),
    status: z.enum(approvalStatusValues).optional(),
    supportStatus: z.enum(driverSupportStatusValues).optional(),
    riskLevel: z.enum(driverRiskLevelValues).optional(),
    tag: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
        .enum(['updatedAt', 'releaseDate', 'vendor', 'model', 'version'])
        .default('updatedAt')
})

export type DriverListQueryInput = z.infer<typeof driverListQuerySchema>

export const createDriverSchema = z.object({
    parentId: uuidSchema.optional(),
    vendor: z.string().min(1),
    deviceType: z.enum(driverDeviceTypeValues).default('other'),
    model: z.string().min(1),
    component: z.enum(driverComponentValues).default('other'),
    os: z.enum(driverOsValues).default('other'),
    osVersion: z.string().optional(),
    arch: z.enum(driverArchValues).default('x64'),
    version: z.string().min(1),
    releaseDate: z.string().date().optional(),
    supportStatus: z.enum(driverSupportStatusValues).default('supported'),
    riskLevel: z.enum(driverRiskLevelValues).default('low'),
    compatibilityNotes: z.string().optional(),
    install: driverInstallSchema.optional(),
    tags: z.array(z.string()).default([]),
    links: driverLinksSchema.optional()
})

export type CreateDriverInput = z.infer<typeof createDriverSchema>

export const updateDriverSchema = createDriverSchema.partial().extend({
    // Immutable fields in normal edit flows; keep them optional but service may restrict.
})

export type UpdateDriverInput = z.infer<typeof updateDriverSchema>

export const idParamSchema = z.object({ id: uuidSchema })
export type IdParam = z.infer<typeof idParamSchema>

export const approvalActionSchema = z.object({
    reason: z.string().trim().min(1).optional(),
    note: z.string().trim().optional()
})

export type ApprovalActionInput = z.infer<typeof approvalActionSchema>

export const bulkDriversSchema = z.object({
    action: z.enum(['tag/add', 'tag/remove', 'setRisk', 'submitApproval', 'block', 'unblock', 'delete']),
    ids: z.array(uuidSchema).min(1),
    tag: z.string().optional(),
    riskLevel: z.enum(driverRiskLevelValues).optional(),
    reason: z.string().trim().min(1).optional()
})

export type BulkDriversInput = z.infer<typeof bulkDriversSchema>

export const driverRecommendationQuerySchema = z.object({
    assetId: uuidSchema.optional(),
    vendor: z.string().optional(),
    model: z.string().optional(),
    os: z.enum(driverOsValues).optional(),
    arch: z.enum(driverArchValues).optional(),
    component: z.enum(driverComponentValues).optional()
})

export type DriverRecommendationQueryInput = z.infer<typeof driverRecommendationQuerySchema>

