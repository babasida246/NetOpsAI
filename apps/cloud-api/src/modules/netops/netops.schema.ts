/**
 * NetOps Schemas - Zod validation schemas for API endpoints
 */

import { z } from 'zod'

// ====================
// ENUMS
// ====================

export const deviceVendorSchema = z.enum(['cisco', 'mikrotik', 'fortigate', 'generic'])
export const deviceRoleSchema = z.enum(['core', 'distribution', 'access', 'edge', 'firewall', 'wan', 'datacenter', 'branch'])
export const deviceStatusSchema = z.enum(['active', 'maintenance', 'decommissioned', 'unreachable'])
export const configTypeSchema = z.enum(['running', 'startup', 'candidate', 'generated', 'rollback'])
export const configSourceSchema = z.enum(['pull', 'upload', 'generated', 'rollback'])
export const lintSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])
export const changeStatusSchema = z.enum([
    'draft', 'planned', 'candidate_ready', 'verified', 'waiting_approval',
    'approved', 'rejected', 'deploying', 'deployed', 'verified_post',
    'failed', 'rolled_back', 'closed'
])
export const intentTypeSchema = z.enum([
    'vlan_trunk', 'firewall_policy', 'nat_rule', 'routing', 'acl', 'interface', 'custom'
])

// ====================
// DEVICES
// ====================

export const createDeviceSchema = z.object({
    name: z.string().min(1).max(255),
    hostname: z.string().min(1).max(255),
    vendor: deviceVendorSchema,
    model: z.string().max(100).optional(),
    osVersion: z.string().max(100).optional(),
    mgmtIp: z.string().ip({ version: 'v4' }),
    site: z.string().max(100).optional(),
    role: deviceRoleSchema.optional(),
    tags: z.array(z.string()).default([]),
    status: deviceStatusSchema.default('active')
})

export const updateDeviceSchema = createDeviceSchema.partial()

export const deviceFiltersSchema = z.object({
    vendor: deviceVendorSchema.optional(),
    site: z.string().optional(),
    role: deviceRoleSchema.optional(),
    status: deviceStatusSchema.optional(),
    tags: z.array(z.string()).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0)
})

export const importDevicesSchema = z.object({
    devices: z.array(createDeviceSchema).min(1).max(100)
})

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>
export type DeviceFiltersInput = z.infer<typeof deviceFiltersSchema>
export type ImportDevicesInput = z.infer<typeof importDevicesSchema>

// ====================
// CONFIG VERSIONS
// ====================

export const uploadConfigSchema = z.object({
    deviceId: z.string().uuid(),
    configType: configTypeSchema.default('running'),
    rawConfig: z.string().min(1).max(5_000_000), // 5MB max
    source: configSourceSchema.default('upload')
})

export const pullConfigSchema = z.object({
    configType: configTypeSchema.default('running')
})

export const configDiffQuerySchema = z.object({
    to: z.string().uuid()
})

export type UploadConfigInput = z.infer<typeof uploadConfigSchema>
export type PullConfigInput = z.infer<typeof pullConfigSchema>

// ====================
// RULEPACKS
// ====================

export const lintMatchSchema = z.object({
    type: z.enum(['jsonpath', 'regex', 'custom']),
    path: z.string().optional(),
    pattern: z.string().optional(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'not_empty', 'empty', 'matches', 'exists']).optional(),
    value: z.any().optional(),
    predicate: z.string().optional()
})

export const lintRuleSchema = z.object({
    id: z.string().min(1).max(50),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    severity: lintSeveritySchema,
    vendorScope: z.array(deviceVendorSchema).default([]),
    match: lintMatchSchema,
    remediation: z.string().optional(),
    waivable: z.boolean().default(true)
})

export const createRulepackSchema = z.object({
    name: z.string().min(1).max(100),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
    description: z.string().optional(),
    vendorScope: z.array(deviceVendorSchema).default([]),
    rules: z.array(lintRuleSchema).min(1)
})

export type CreateRulepackInput = z.infer<typeof createRulepackSchema>

// ====================
// LINT
// ====================

export const runLintSchema = z.object({
    targetType: z.enum(['device', 'config_version', 'change_set']),
    targetId: z.string().uuid(),
    rulepackId: z.string().uuid()
})

export type RunLintInput = z.infer<typeof runLintSchema>

// ====================
// CHANGES
// ====================

export const createChangeSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    intentType: intentTypeSchema.optional(),
    intentParams: z.record(z.unknown()).optional(),
    deviceScope: z.array(z.string().uuid()).min(1),
    riskLevel: riskLevelSchema.default('medium'),
    requiredApprovals: z.number().min(1).max(5).default(1),
    lintBlocking: z.boolean().default(true)
})

export const updateChangeSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    rollbackPlan: z.string().optional(),
    preCheckCommands: z.array(z.string()).optional(),
    postCheckCommands: z.array(z.string()).optional()
})

export const changeFiltersSchema = z.object({
    status: z.union([changeStatusSchema, z.array(changeStatusSchema)]).optional(),
    createdBy: z.string().uuid().optional(),
    assignedTo: z.string().uuid().optional(),
    deviceId: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0)
})

export const approvalDecisionSchema = z.object({
    decision: z.enum(['approved', 'rejected', 'waived']),
    comments: z.string().optional(),
    waivedFindings: z.array(z.string().uuid()).optional()
})

export type CreateChangeInput = z.infer<typeof createChangeSchema>
export type UpdateChangeInput = z.infer<typeof updateChangeSchema>
export type ChangeFiltersInput = z.infer<typeof changeFiltersSchema>
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>

// ====================
// RESPONSE SCHEMAS
// ====================

export const deviceResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    hostname: z.string(),
    vendor: deviceVendorSchema,
    model: z.string().nullable(),
    osVersion: z.string().nullable(),
    mgmtIp: z.string(),
    site: z.string().nullable(),
    role: deviceRoleSchema.nullable(),
    tags: z.array(z.string()),
    status: deviceStatusSchema,
    lastSeenAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

export const configVersionResponseSchema = z.object({
    id: z.string().uuid(),
    deviceId: z.string().uuid(),
    configType: configTypeSchema,
    configHash: z.string(),
    parserVersion: z.string().nullable(),
    hasNormalized: z.boolean(),
    parseErrors: z.array(z.object({
        line: z.number().optional(),
        message: z.string(),
        severity: z.enum(['error', 'warning'])
    })).nullable(),
    fileSizeBytes: z.number().nullable(),
    lineCount: z.number().nullable(),
    collectedAt: z.string().datetime(),
    source: configSourceSchema
})

export const lintFindingResponseSchema = z.object({
    id: z.string(),
    ruleId: z.string(),
    ruleName: z.string(),
    severity: lintSeveritySchema,
    message: z.string(),
    path: z.string().optional(),
    remediation: z.string().optional(),
    waived: z.boolean()
})

export const lintRunResponseSchema = z.object({
    id: z.string().uuid(),
    targetType: z.string(),
    targetId: z.string().uuid(),
    rulepackId: z.string().uuid(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    findings: z.array(lintFindingResponseSchema),
    summary: z.object({
        critical: z.number(),
        high: z.number(),
        medium: z.number(),
        low: z.number(),
        info: z.number(),
        waived: z.number(),
        total: z.number(),
        passed: z.boolean()
    }).nullable(),
    rulesEvaluated: z.number(),
    rulesPassed: z.number(),
    rulesFailed: z.number(),
    rulesSkipped: z.number(),
    durationMs: z.number().nullable(),
    createdAt: z.string().datetime()
})

export const changeRequestResponseSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    intentType: intentTypeSchema.nullable(),
    deviceScope: z.array(z.string().uuid()),
    status: changeStatusSchema,
    riskLevel: riskLevelSchema,
    requiredApprovals: z.number(),
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

// ====================
// ORCHESTRATION SCHEMAS
// ====================

export const orchestrationStatusSchema = z.enum([
    'pending',
    'running',
    'awaiting_approval',
    'approved',
    'rejected',
    'deploying',
    'deployed',
    'rolled_back',
    'failed',
    'cancelled'
])

export const orchestrationLayerSchema = z.enum([
    'L0_intake',
    'L1_context',
    'L2_deterministic',
    'L3_planner',
    'L4_expert',
    'L5_verification',
    'L6_judge',
    'L7_deploy'
])

export const createOrchestrationRunSchema = z.object({
    intent: z.string().min(10).max(2000).describe('Natural language description of the intended change'),
    intentParams: z.record(z.unknown()).optional().describe('Structured intent parameters'),
    scope: z.object({
        deviceIds: z.array(z.string().uuid()).optional(),
        sites: z.array(z.string()).optional(),
        roles: z.array(z.string()).optional(),
        vendors: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional()
    }).optional().describe('Explicit scope targeting'),
    changeRequestId: z.string().uuid().optional().describe('Link to existing change request')
})

export const orchestrationRunFiltersSchema = z.object({
    status: orchestrationStatusSchema.optional(),
    createdBy: z.string().uuid().optional(),
    changeRequestId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
})

export const orchestrationApprovalSchema = z.object({
    decision: z.enum(['approve', 'reject']),
    comment: z.string().max(1000).optional()
})

export const orchestrationWaiverSchema = z.object({
    reason: z.string().min(10).max(1000).describe('Justification for waiving critical findings')
})

export const orchestrationRunIdParamSchema = z.object({
    runId: z.string().uuid()
})

export type CreateOrchestrationRunInput = z.infer<typeof createOrchestrationRunSchema>
export type OrchestrationRunFiltersInput = z.infer<typeof orchestrationRunFiltersSchema>
export type OrchestrationApprovalInput = z.infer<typeof orchestrationApprovalSchema>
export type OrchestrationWaiverInput = z.infer<typeof orchestrationWaiverSchema>
export type OrchestrationRunIdParam = z.infer<typeof orchestrationRunIdParamSchema>

// ====================
// PARAM SCHEMAS
// ====================

export const deviceIdParamSchema = z.object({
    id: z.string().uuid()
})

export const configIdParamSchema = z.object({
    id: z.string().uuid()
})

export const rulepackIdParamSchema = z.object({
    id: z.string().uuid()
})

export const lintRunIdParamSchema = z.object({
    id: z.string().uuid()
})

export const changeIdParamSchema = z.object({
    id: z.string().uuid()
})

export type DeviceIdParam = z.infer<typeof deviceIdParamSchema>
export type ConfigIdParam = z.infer<typeof configIdParamSchema>
export type RulepackIdParam = z.infer<typeof rulepackIdParamSchema>
export type LintRunIdParam = z.infer<typeof lintRunIdParamSchema>
export type ChangeIdParam = z.infer<typeof changeIdParamSchema>
