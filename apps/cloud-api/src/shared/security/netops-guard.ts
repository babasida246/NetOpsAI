import { ForbiddenError, BadRequestError } from '../errors/http-errors.js'

export const RISK_LEVELS = ['R0_READ', 'R1_SAFE_WRITE', 'R2_CHANGE', 'R3_DANGEROUS'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

const WRITE_RISKS: RiskLevel[] = ['R1_SAFE_WRITE', 'R2_CHANGE', 'R3_DANGEROUS']
const CHANGE_RISKS: RiskLevel[] = ['R2_CHANGE', 'R3_DANGEROUS']

export function normalizeRiskLevel(input?: string | null): RiskLevel {
    if (!input) return 'R0_READ'
    const match = RISK_LEVELS.find((level) => level === input)
    if (match) return match
    throw new BadRequestError(`Unsupported risk level: ${input}`)
}

export function isWriteRisk(level: RiskLevel): boolean {
    return WRITE_RISKS.includes(level)
}

export function isChangeRisk(level: RiskLevel): boolean {
    return CHANGE_RISKS.includes(level)
}

export function enforceReason(level: RiskLevel, reason?: string): void {
    if (level === 'R0_READ') return
    if (!reason || reason.trim().length < 5) {
        throw new BadRequestError('Reason is required for write actions')
    }
}

export function enforceChangeControls(input: {
    level: RiskLevel
    changeRequestId?: string
    approvalGranted?: boolean
    dryRun?: boolean
    rollbackPlan?: string
    precheck?: string[]
    postcheck?: string[]
    maintenanceWindowId?: string
    breakGlass?: boolean
    requireMaintenanceWindow?: boolean
    breakGlassAllowed?: boolean
}): void {
    if (!isChangeRisk(input.level)) return

    if (!input.changeRequestId) {
        throw new BadRequestError('Change request ID is required for R2/R3 actions')
    }

    if (input.requireMaintenanceWindow && !input.maintenanceWindowId) {
        throw new BadRequestError('Maintenance window is required for R2/R3 actions')
    }

    if (input.level === 'R3_DANGEROUS' && !input.breakGlassAllowed) {
        throw new ForbiddenError('Break-glass approval required for R3 actions')
    }

    if (input.dryRun === true) {
        return
    }

    if (!input.approvalGranted) {
        throw new ForbiddenError('Approval is required before executing R2/R3 actions')
    }

    if (!input.rollbackPlan || input.rollbackPlan.trim().length < 10) {
        throw new BadRequestError('Rollback plan is required for R2/R3 actions')
    }

    if (!input.precheck || input.precheck.length === 0) {
        throw new BadRequestError('Precheck commands are required for R2/R3 actions')
    }

    if (!input.postcheck || input.postcheck.length === 0) {
        throw new BadRequestError('Postcheck commands are required for R2/R3 actions')
    }
}

export function redactSensitive(input: string): string {
    const patterns = [
        /password\s+\S+/gi,
        /secret\s+\S+/gi,
        /community\s+\S+/gi,
        /token\s+\S+/gi,
        /key\s+\S+/gi
    ]
    return patterns.reduce((value, pattern) => value.replace(pattern, (match) => {
        const parts = match.split(/\s+/)
        return `${parts[0]} [REDACTED]`
    }), input)
}

export function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
            sanitized[key] = redactSensitive(value)
        } else {
            sanitized[key] = value
        }
    }
    return sanitized
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
    viewer: ['netops.read'],
    netops: ['netops.read', 'netops.backup', 'netops.change.request'],
    admin: [
        'netops.read',
        'netops.backup',
        'netops.change.request',
        'netops.change.approve',
        'netops.change.execute',
        'netops.change.rollback'
    ],
    super_admin: [
        'netops.read',
        'netops.backup',
        'netops.change.request',
        'netops.change.approve',
        'netops.change.execute',
        'netops.change.rollback'
    ]
}

export function hasPermission(context: { role?: string; permissions?: string[] }, permission: string): boolean {
    const direct = context.permissions ?? []
    if (direct.includes(permission)) return true

    const role = context.role ?? 'viewer'
    const rolePerms = ROLE_PERMISSIONS[role] ?? []
    return rolePerms.includes(permission) || role === 'super_admin'
}

export function requirePermission(
    context: { role?: string; permissions?: string[] },
    permission: string,
    message = 'Insufficient permissions'
): void {
    if (!hasPermission(context, permission)) {
        throw new ForbiddenError(message)
    }
}
