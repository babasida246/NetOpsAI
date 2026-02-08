/**
 * NetOps Service - Business logic for network operations
 */

import type { Pool } from 'pg'
import type {
    NetDevice,
    NetConfigVersion,
    NetRulepack,
    NetLintRun,
    NetChangeRequest,
    NormalizedConfig,
    DeviceFilters,
    ChangeFilters,
    ChangeRequestStatus,
    LintRule,
    DeviceVendor,
    LintFinding,
    LintSummary,
    ParseError
} from './netops.types.js'
import { NetOpsRepository } from './netops.repository.js'
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/http-errors.js'
import type {
    CreateDeviceInput,
    UpdateDeviceInput,
    DeviceFiltersInput,
    UploadConfigInput,
    CreateRulepackInput,
    RunLintInput,
    CreateChangeInput,
    ApprovalDecisionInput
} from './netops.schema.js'

// ====================
// INLINE HELPERS (until workspace packages are built)
// ====================

// Redaction patterns for credentials
const REDACTION_PATTERNS = [
    /(?<=password\s+)\S+/gi,
    /(?<=secret\s+\d?\s*)\S+/gi,
    /(?<=community\s+)\S+/gi,
    /(?<=key\s+)\S+/gi,
    /(?<=psk\s+)\S+/gi
]

function redactConfig(rawConfig: string): { redactedConfig: string; redactions: string[]; hasRedactions: boolean } {
    let redactedConfig = rawConfig
    const redactions: string[] = []

    for (const pattern of REDACTION_PATTERNS) {
        redactedConfig = redactedConfig.replace(pattern, (match) => {
            redactions.push(`[REDACTED:${pattern.source.substring(0, 20)}]`)
            return '[REDACTED]'
        })
    }

    return { redactedConfig, redactions, hasRedactions: redactions.length > 0 }
}

function containsForbiddenDefaults(config: string): { hasForbidden: boolean; findings: string[] } {
    const forbidden = ['password cisco', 'community public', 'community private', 'enable secret admin']
    const findings: string[] = []

    for (const pattern of forbidden) {
        if (config.toLowerCase().includes(pattern.toLowerCase())) {
            findings.push(pattern)
        }
    }

    return { hasForbidden: findings.length > 0, findings }
}

function createSafeConfigSummary(config: string): { lineCount: number; redactionTypes: string[] } {
    return {
        lineCount: config.split('\n').length,
        redactionTypes: []
    }
}

function redactLogDetails(details: Record<string, unknown>): Record<string, unknown> {
    // Simple pass-through for now
    return details
}

// Simple mock collector
const collectorFactory = {
    getCollector: (vendor: DeviceVendor) => ({
        async pullConfig(connection: { host: string; credentials: unknown }, configType: string): Promise<string> {
            // Mock implementation - returns sample config
            return `! Mock ${vendor} configuration for ${connection.host}
hostname mock-device
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
end`
        }
    })
}

// Simple mock parser registry
const parserRegistry = {
    getParser: (vendor: DeviceVendor) => ({
        version: '1.0.0',
        async parse(config: string): Promise<{ normalized: NormalizedConfig; errors: string[]; warnings: string[] }> {
            // Extract hostname from config
            const hostnameMatch = config.match(/hostname\s+(\S+)/i)
            const hostname = hostnameMatch ? hostnameMatch[1] : 'unknown'

            return {
                normalized: {
                    schemaVersion: 'v1',
                    device: { hostname, vendor },
                    interfaces: [],
                    vlans: [],
                    routing: { static: [], ospf: [], bgp: [] },
                    security: { acls: [], users: [], aaa: null },
                    mgmt: { ssh: null, snmp: null, ntp: null, logging: null }
                },
                errors: [],
                warnings: []
            }
        }
    }),
    detectAndGetParser: (config: string) => parserRegistry.getParser('cisco')
}

// Simple mock lint engine
const lintEngine = {
    async evaluate(rules: LintRule[], context: { config: NormalizedConfig; targetId: string; targetType: string }): Promise<{
        findings: LintFinding[]
        summary: LintSummary
        rulesEvaluated: number
        rulesPassed: number
        rulesFailed: number
        rulesSkipped: number
        durationMs: number
    }> {
        const startTime = Date.now()
        const findings: LintFinding[] = []
        let passed = 0
        let failed = 0
        let skipped = 0

        for (const rule of rules) {
            if (!rule.enabled) {
                skipped++
                continue
            }

            // Simple evaluation - check if path exists in config
            let rulePass = true
            if (rule.type === 'match' && rule.path) {
                // Very simple path check
                const pathParts = rule.path.replace('$.', '').split('.')
                let value: unknown = context.config
                for (const part of pathParts) {
                    if (value && typeof value === 'object' && part in value) {
                        value = (value as Record<string, unknown>)[part]
                    } else {
                        value = undefined
                        break
                    }
                }

                if (rule.condition?.operator === 'exists') {
                    rulePass = value !== undefined
                } else if (rule.condition?.operator === 'notEmpty') {
                    rulePass = value !== undefined && value !== '' && value !== null
                } else if (rule.condition?.operator === 'equals') {
                    rulePass = value === rule.condition.value
                }
            }

            if (rulePass) {
                passed++
            } else {
                failed++
                findings.push({
                    ruleId: rule.id,
                    severity: rule.severity,
                    message: `Rule ${rule.name} failed`,
                    path: rule.path
                })
            }
        }

        return {
            findings,
            summary: {
                total: findings.length,
                critical: findings.filter(f => f.severity === 'critical').length,
                high: findings.filter(f => f.severity === 'high').length,
                medium: findings.filter(f => f.severity === 'medium').length,
                low: findings.filter(f => f.severity === 'low').length,
                info: findings.filter(f => f.severity === 'info').length,
                passed: failed === 0
            },
            rulesEvaluated: passed + failed,
            rulesPassed: passed,
            rulesFailed: failed,
            rulesSkipped: skipped,
            durationMs: Date.now() - startTime
        }
    }
}

export interface AuditContext {
    userId?: string
    userRole?: string
    requestId?: string
    ip?: string
    userAgent?: string
}

export class NetOpsService {
    private repo: NetOpsRepository

    constructor(db: Pool) {
        this.repo = new NetOpsRepository(db)
    }

    // ====================
    // DEVICES
    // ====================

    async getDevices(filters: DeviceFiltersInput): Promise<{ devices: NetDevice[]; total: number }> {
        const [devices, total] = await Promise.all([
            this.repo.findAllDevices(filters as DeviceFilters),
            this.repo.countDevices(filters as DeviceFilters)
        ])
        return { devices, total }
    }

    async getDeviceById(id: string): Promise<NetDevice> {
        const device = await this.repo.findDeviceById(id)
        if (!device) {
            throw new NotFoundError(`Device not found: ${id}`)
        }
        return device
    }

    async createDevice(input: CreateDeviceInput, ctx: AuditContext): Promise<NetDevice> {
        const device = await this.repo.createDevice({
            ...input,
            createdBy: ctx.userId
        })

        await this.logAudit('device.created', 'device', device.id, 'create', {
            name: device.name,
            hostname: device.hostname,
            vendor: device.vendor
        }, ctx)

        return device
    }

    async updateDevice(id: string, input: UpdateDeviceInput, ctx: AuditContext): Promise<NetDevice> {
        const existing = await this.getDeviceById(id)

        const updated = await this.repo.updateDevice(id, input as Partial<NetDevice>)
        if (!updated) {
            throw new NotFoundError(`Device not found: ${id}`)
        }

        await this.logAudit('device.updated', 'device', id, 'update', {
            changes: Object.keys(input)
        }, ctx)

        return updated
    }

    async deleteDevice(id: string, ctx: AuditContext): Promise<void> {
        const device = await this.getDeviceById(id)

        const deleted = await this.repo.deleteDevice(id)
        if (!deleted) {
            throw new NotFoundError(`Device not found: ${id}`)
        }

        await this.logAudit('device.deleted', 'device', id, 'delete', {
            name: device.name,
            hostname: device.hostname
        }, ctx)
    }

    async importDevices(devices: CreateDeviceInput[], ctx: AuditContext): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> {
        const results = { created: 0, errors: [] as Array<{ index: number; error: string }> }

        for (let i = 0; i < devices.length; i++) {
            try {
                await this.createDevice(devices[i], ctx)
                results.created++
            } catch (error) {
                results.errors.push({
                    index: i,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        return results
    }

    // ====================
    // CONFIGURATIONS
    // ====================

    async getDeviceConfigs(deviceId: string, limit = 10): Promise<NetConfigVersion[]> {
        await this.getDeviceById(deviceId) // Verify device exists
        return this.repo.findConfigsByDeviceId(deviceId, limit)
    }

    async getConfigById(id: string): Promise<NetConfigVersion> {
        const config = await this.repo.findConfigById(id)
        if (!config) {
            throw new NotFoundError(`Config version not found: ${id}`)
        }
        return config
    }

    async getConfigRaw(id: string): Promise<string> {
        const raw = await this.repo.getConfigRaw(id)
        if (!raw) {
            throw new NotFoundError(`Config version not found: ${id}`)
        }
        return raw
    }

    async uploadConfig(input: UploadConfigInput, ctx: AuditContext): Promise<NetConfigVersion> {
        const device = await this.getDeviceById(input.deviceId)

        // Redact sensitive data
        const { redactedConfig, redactions, hasRedactions } = redactConfig(input.rawConfig)

        // Check for forbidden defaults
        const forbiddenCheck = containsForbiddenDefaults(input.rawConfig)

        // Create config version with redacted content
        const configVersion = await this.repo.createConfigVersion({
            deviceId: input.deviceId,
            configType: input.configType,
            rawConfig: redactedConfig,
            source: input.source,
            collectedBy: ctx.userId
        })

        // Log audit
        const summary = createSafeConfigSummary(redactedConfig)
        await this.logAudit('config.uploaded', 'config_version', configVersion.id, 'upload', {
            deviceId: input.deviceId,
            deviceName: device.name,
            configType: input.configType,
            lineCount: summary.lineCount,
            hasRedactions,
            redactionTypes: summary.redactionTypes,
            forbiddenDefaults: forbiddenCheck.findings
        }, ctx)

        return configVersion
    }

    async pullConfig(deviceId: string, configType: string, ctx: AuditContext): Promise<NetConfigVersion> {
        const device = await this.getDeviceById(deviceId)

        // Get collector for vendor
        const collector = collectorFactory.getCollector(device.vendor as DeviceVendor)

        // In production, this would resolve credentials from vault
        // For now, using mock collector
        try {
            const rawConfig = await collector.pullConfig(
                {
                    host: device.mgmtIp,
                    credentials: { type: 'ssh', username: 'mock', password: 'mock' }
                },
                configType as any
            )

            // Redact and store
            const { redactedConfig, redactions } = redactConfig(rawConfig)

            const configVersion = await this.repo.createConfigVersion({
                deviceId,
                configType,
                rawConfig: redactedConfig,
                source: 'pull',
                collectedBy: ctx.userId
            })

            // Update device last_seen_at
            await this.repo.updateDevice(deviceId, { lastSeenAt: new Date() })

            await this.logAudit('config.pulled', 'config_version', configVersion.id, 'collect', {
                deviceId,
                deviceName: device.name,
                configType,
                hasRedactions: redactions.length > 0
            }, ctx)

            return configVersion
        } catch (error) {
            await this.logAudit('config.pull_failed', 'device', deviceId, 'collect', {
                deviceName: device.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            }, ctx)
            throw error
        }
    }

    async parseAndNormalize(configVersionId: string, ctx: AuditContext): Promise<NormalizedConfig> {
        const configVersion = await this.getConfigById(configVersionId)

        // Get raw config
        const rawConfig = await this.getConfigRaw(configVersionId)

        // Get device to determine vendor
        const device = await this.getDeviceById(configVersion.deviceId)

        // Get appropriate parser
        const parser = parserRegistry.getParser(device.vendor as DeviceVendor)
            || parserRegistry.detectAndGetParser(rawConfig)

        if (!parser) {
            throw new BadRequestError(`No parser available for vendor: ${device.vendor}`)
        }

        // Parse config
        const result = await parser.parse(rawConfig)

        // Store normalized config (convert string errors to ParseError format)
        const parseErrors: ParseError[] = result.errors.map((e: string | { message: string }) => ({
            message: typeof e === 'string' ? e : e.message,
            severity: 'error' as const
        }))

        await this.repo.updateConfigNormalized(
            configVersionId,
            result.normalized,
            parser.version,
            parseErrors
        )

        await this.logAudit('config.parsed', 'config_version', configVersionId, 'parse', {
            deviceId: device.id,
            deviceName: device.name,
            parserVersion: parser.version,
            errorCount: result.errors.length,
            warningCount: result.warnings.length
        }, ctx)

        return result.normalized
    }

    async getConfigDiff(versionId1: string, versionId2: string): Promise<{ from: string; to: string; diff: string[] }> {
        const [config1, config2] = await Promise.all([
            this.getConfigRaw(versionId1),
            this.getConfigRaw(versionId2)
        ])

        // Simple line-by-line diff
        const lines1 = config1.split('\n')
        const lines2 = config2.split('\n')

        const diff: string[] = []
        const maxLines = Math.max(lines1.length, lines2.length)

        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i] || ''
            const line2 = lines2[i] || ''

            if (line1 !== line2) {
                if (line1) diff.push(`- ${line1}`)
                if (line2) diff.push(`+ ${line2}`)
            }
        }

        return { from: versionId1, to: versionId2, diff }
    }

    // ====================
    // RULEPACKS
    // ====================

    async getRulepacks(): Promise<NetRulepack[]> {
        return this.repo.findAllRulepacks()
    }

    async getRulepackById(id: string): Promise<NetRulepack> {
        const rulepack = await this.repo.findRulepackById(id)
        if (!rulepack) {
            throw new NotFoundError(`Rulepack not found: ${id}`)
        }
        return rulepack
    }

    async createRulepack(input: CreateRulepackInput, ctx: AuditContext): Promise<NetRulepack> {
        // Transform input rules to LintRule format
        const rules: LintRule[] = input.rules.map(r => ({
            id: r.id,
            name: r.title,
            description: r.description,
            severity: r.severity,
            enabled: true,
            type: r.match.type === 'custom' ? 'custom' as const : 'match' as const,
            path: r.match.path,
            condition: r.match.operator ? {
                operator: r.match.operator,
                value: r.match.value
            } : undefined,
            customPredicate: r.match.predicate
        }))

        const rulepack = await this.repo.createRulepack({
            ...input,
            vendorScope: input.vendorScope as string[],
            rules,
            createdBy: ctx.userId
        })

        await this.logAudit('rulepack.created', 'rulepack', rulepack.id, 'create', {
            name: rulepack.name,
            version: rulepack.version,
            ruleCount: rulepack.ruleCount
        }, ctx)

        return rulepack
    }

    async activateRulepack(id: string, ctx: AuditContext): Promise<void> {
        const rulepack = await this.getRulepackById(id)
        await this.repo.activateRulepack(id)

        await this.logAudit('rulepack.activated', 'rulepack', id, 'activate', {
            name: rulepack.name
        }, ctx)
    }

    // ====================
    // LINT
    // ====================

    async runLint(input: RunLintInput, ctx: AuditContext): Promise<NetLintRun> {
        const rulepack = await this.getRulepackById(input.rulepackId)

        // Get normalized config based on target type
        let normalizedConfig: NormalizedConfig | null = null
        let targetName = ''

        if (input.targetType === 'config_version') {
            const configVersion = await this.getConfigById(input.targetId)
            normalizedConfig = configVersion.normalizedConfig || null

            if (!normalizedConfig) {
                // Auto-parse if not already parsed
                normalizedConfig = await this.parseAndNormalize(input.targetId, ctx)
            }

            const device = await this.getDeviceById(configVersion.deviceId)
            targetName = device.name
        } else if (input.targetType === 'device') {
            const device = await this.getDeviceById(input.targetId)
            targetName = device.name

            // Get latest config
            const latestConfig = await this.repo.findLatestConfig(input.targetId)
            if (latestConfig) {
                normalizedConfig = latestConfig.normalizedConfig || null
                if (!normalizedConfig) {
                    normalizedConfig = await this.parseAndNormalize(latestConfig.id, ctx)
                }
            }
        }

        if (!normalizedConfig) {
            throw new BadRequestError('No normalized configuration available for lint target')
        }

        // Create lint run record
        const lintRun = await this.repo.createLintRun({
            targetType: input.targetType,
            targetId: input.targetId,
            rulepackId: input.rulepackId,
            triggeredBy: ctx.userId
        })

        await this.logAudit('lint.started', 'lint_run', lintRun.id, 'start', {
            targetType: input.targetType,
            targetName,
            rulepackName: rulepack.name
        }, ctx)

        // Run lint engine
        try {
            const result = await lintEngine.evaluate(rulepack.rules as LintRule[], {
                config: normalizedConfig,
                targetId: input.targetId,
                targetType: input.targetType
            })

            // Update lint run with results
            await this.repo.updateLintRun(lintRun.id, {
                status: 'completed',
                findings: result.findings,
                summary: result.summary,
                rulesEvaluated: result.rulesEvaluated,
                rulesPassed: result.rulesPassed,
                rulesFailed: result.rulesFailed,
                rulesSkipped: result.rulesSkipped,
                durationMs: result.durationMs
            })

            await this.logAudit('lint.completed', 'lint_run', lintRun.id, 'complete', {
                passed: result.summary.passed,
                critical: result.summary.critical,
                high: result.summary.high,
                total: result.summary.total
            }, ctx)

            return await this.repo.findLintRunById(lintRun.id) as NetLintRun
        } catch (error) {
            await this.repo.updateLintRun(lintRun.id, { status: 'failed' })

            await this.logAudit('lint.failed', 'lint_run', lintRun.id, 'fail', {
                error: error instanceof Error ? error.message : 'Unknown error'
            }, ctx)

            throw error
        }
    }

    async getLintRun(id: string): Promise<NetLintRun> {
        const lintRun = await this.repo.findLintRunById(id)
        if (!lintRun) {
            throw new NotFoundError(`Lint run not found: ${id}`)
        }
        return lintRun
    }

    async getLintHistory(targetType: string, targetId: string): Promise<NetLintRun[]> {
        return this.repo.findLintRunsByTarget(targetType, targetId)
    }

    // ====================
    // CHANGES
    // ====================

    async getChanges(filters: ChangeFilters): Promise<{ changes: NetChangeRequest[]; total: number }> {
        const changes = await this.repo.findAllChanges(filters)
        return { changes, total: changes.length }
    }

    async getChangeById(id: string): Promise<NetChangeRequest> {
        const change = await this.repo.findChangeById(id)
        if (!change) {
            throw new NotFoundError(`Change request not found: ${id}`)
        }
        return change
    }

    async createChange(input: CreateChangeInput, ctx: AuditContext): Promise<NetChangeRequest> {
        // Verify all devices exist
        for (const deviceId of input.deviceScope) {
            await this.getDeviceById(deviceId)
        }

        const change = await this.repo.createChange({
            ...input,
            createdBy: ctx.userId!
        })

        await this.logAudit('change.created', 'change_request', change.id, 'create', {
            title: change.title,
            deviceCount: change.deviceScope.length,
            riskLevel: change.riskLevel
        }, ctx)

        return change
    }

    async updateChangeStatus(id: string, status: ChangeRequestStatus, ctx: AuditContext): Promise<NetChangeRequest> {
        const change = await this.getChangeById(id)

        // Validate state transition
        this.validateStatusTransition(change.status, status)

        await this.repo.updateChangeStatus(id, status)

        await this.logAudit(`change.${status}`, 'change_request', id, 'status_change', {
            fromStatus: change.status,
            toStatus: status
        }, ctx)

        return this.getChangeById(id)
    }

    private validateStatusTransition(current: ChangeRequestStatus, next: ChangeRequestStatus): void {
        const validTransitions: Record<string, string[]> = {
            'draft': ['planned', 'closed'],
            'planned': ['candidate_ready', 'draft', 'closed'],
            'candidate_ready': ['verified', 'planned', 'closed'],
            'verified': ['waiting_approval', 'candidate_ready', 'closed'],
            'waiting_approval': ['approved', 'rejected', 'verified'],
            'approved': ['deploying', 'waiting_approval'],
            'rejected': ['draft', 'closed'],
            'deploying': ['deployed', 'failed'],
            'deployed': ['verified_post', 'rolled_back'],
            'verified_post': ['closed', 'rolled_back'],
            'failed': ['rolled_back', 'draft'],
            'rolled_back': ['draft', 'closed'],
            'closed': [] // Terminal state
        }

        const allowed = validTransitions[current] || []
        if (!allowed.includes(next)) {
            throw new BadRequestError(
                `Invalid status transition: ${current} -> ${next}. Allowed: ${allowed.join(', ')}`
            )
        }
    }

    // ====================
    // ORCHESTRATION
    // ====================

    async createOrchestrationRun(
        input: { intent: string; intentParams?: Record<string, unknown>; scope?: Record<string, unknown>; changeRequestId?: string },
        ctx: AuditContext
    ): Promise<Record<string, unknown>> {
        const run = await this.repo.createOrchestrationRun({
            changeRequestId: input.changeRequestId || null,
            intent: input.intent,
            intentParams: input.intentParams || {},
            scope: input.scope || { deviceIds: [], sites: [], roles: [], vendors: [], tags: [] },
            status: 'pending',
            currentLayer: 'L0_intake',
            riskLevel: null,
            requiredApprovals: 1,
            receivedApprovals: 0,
            hasVerifyPlan: false,
            hasRollbackPlan: false,
            hasCriticalFindings: false,
            criticalFindingsWaived: false,
            deployEnabled: process.env.NETOPS_DEPLOY_ENABLED === 'true',
            createdBy: ctx.userId || 'system'
        })

        await this.logAudit('orchestration_created', 'orchestration_run', run.id, 'create', {
            intent: input.intent,
            scope: input.scope
        }, ctx)

        return run
    }

    async getOrchestrationRuns(filters: {
        status?: string
        createdBy?: string
        changeRequestId?: string
        limit?: number
        offset?: number
    }): Promise<Array<Record<string, unknown>>> {
        return this.repo.findOrchestrationRuns(filters)
    }

    async getOrchestrationRunById(runId: string): Promise<Record<string, unknown> | null> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) return null

        const nodes = await this.repo.findOrchestrationNodesByRunId(runId)
        return { ...run, nodes }
    }

    async executeOrchestrationRun(runId: string, ctx: AuditContext): Promise<Record<string, unknown>> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) {
            throw new NotFoundError('Orchestration run not found')
        }

        if (run.status !== 'pending') {
            throw new BadRequestError(`Cannot execute run in status: ${run.status}`)
        }

        // Start execution
        let updatedRun = await this.repo.updateOrchestrationRun(runId, {
            status: 'running',
            startedAt: new Date()
        })

        // Execute layers L0-L6 (simplified inline execution)
        try {
            // L0: Intake
            await this.executeOrchestrationNode(runId, 'intake', 'L0_intake', 0, ctx)
            updatedRun = await this.repo.updateOrchestrationRun(runId, { currentLayer: 'L1_context' })

            // L1: Context
            await this.executeOrchestrationNode(runId, 'context', 'L1_context', 1, ctx)
            updatedRun = await this.repo.updateOrchestrationRun(runId, { currentLayer: 'L2_deterministic' })

            // L2: Deterministic
            await this.executeOrchestrationNode(runId, 'deterministic', 'L2_deterministic', 2, ctx)
            updatedRun = await this.repo.updateOrchestrationRun(runId, {
                currentLayer: 'L3_planner',
                riskLevel: 'medium' // Simplified risk assessment
            })

            // L3: Planner (mock)
            await this.executeOrchestrationNode(runId, 'planner', 'L3_planner', 3, ctx, 'cheap')
            updatedRun = await this.repo.updateOrchestrationRun(runId, {
                currentLayer: 'L4_expert',
                plannerOutput: { version: 'v1', planId: `plan-${Date.now()}`, phases: [], verificationSteps: [] }
            })

            // L4: Expert (mock)
            await this.executeOrchestrationNode(runId, 'expert', 'L4_expert', 4, ctx, 'strong')
            updatedRun = await this.repo.updateOrchestrationRun(runId, {
                currentLayer: 'L5_verification',
                expertOutput: { version: 'v1', deviceConfigs: [], commandsSummary: { totalCommands: 0, bySection: {} } }
            })

            // L5: Verification
            await this.executeOrchestrationNode(runId, 'verification', 'L5_verification', 5, ctx)
            updatedRun = await this.repo.updateOrchestrationRun(runId, {
                currentLayer: 'L6_judge',
                hasVerifyPlan: true,
                hasRollbackPlan: true
            })

            // L6: Judge (mock)
            await this.executeOrchestrationNode(runId, 'judge', 'L6_judge', 6, ctx, 'strong')
            updatedRun = await this.repo.updateOrchestrationRun(runId, {
                currentLayer: 'L7_deploy',
                status: 'awaiting_approval',
                judgeOutput: { version: 'v1', verdict: 'approve', confidence: 0.9 }
            })

            await this.logAudit('orchestration_executed', 'orchestration_run', runId, 'execute', {
                finalStatus: 'awaiting_approval'
            }, ctx)

            return updatedRun!
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await this.repo.updateOrchestrationRun(runId, {
                status: 'failed',
                errorMessage,
                completedAt: new Date()
            })
            throw error
        }
    }

    private async executeOrchestrationNode(
        runId: string,
        nodeType: string,
        layer: string,
        sequenceNum: number,
        ctx: AuditContext,
        modelTier?: string
    ): Promise<void> {
        const startTime = Date.now()

        const node = await this.repo.createOrchestrationNode({
            runId,
            nodeType,
            layer,
            sequenceNum,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { layer },
            outputSummary: null,
            modelUsed: modelTier ? (modelTier === 'cheap' ? 'gpt-4o-mini' : 'gpt-4o') : null,
            modelTier: modelTier || null,
            promptTokens: modelTier ? 100 : null,
            completionTokens: modelTier ? 50 : null,
            llmLatencyMs: modelTier ? 500 : null,
            retryCount: 0,
            errorMessage: null,
            errorCode: null
        })

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50))

        await this.repo.updateOrchestrationNode(node.id, {
            status: 'completed',
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
            outputSummary: { success: true }
        })
    }

    async recordOrchestrationApproval(
        runId: string,
        input: { decision: 'approve' | 'reject'; comment?: string },
        ctx: AuditContext
    ): Promise<Record<string, unknown>> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) {
            throw new NotFoundError('Orchestration run not found')
        }

        if (run.status !== 'awaiting_approval') {
            throw new BadRequestError(`Run is not awaiting approval: ${run.status}`)
        }

        await this.logAudit('orchestration_approval', 'orchestration_run', runId, input.decision, {
            comment: input.comment
        }, ctx)

        if (input.decision === 'reject') {
            return (await this.repo.updateOrchestrationRun(runId, {
                status: 'rejected',
                completedAt: new Date()
            }))!
        }

        const newApprovalCount = (run.receivedApprovals as number) + 1
        const updates: Record<string, unknown> = { receivedApprovals: newApprovalCount }

        if (newApprovalCount >= (run.requiredApprovals as number)) {
            updates.status = 'approved'
        }

        return (await this.repo.updateOrchestrationRun(runId, updates))!
    }

    async waiveOrchestrationFindings(runId: string, reason: string, ctx: AuditContext): Promise<Record<string, unknown>> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) {
            throw new NotFoundError('Orchestration run not found')
        }

        if (!run.hasCriticalFindings) {
            throw new BadRequestError('Run has no critical findings to waive')
        }

        await this.logAudit('orchestration_waiver', 'orchestration_run', runId, 'waive', { reason }, ctx)

        return (await this.repo.updateOrchestrationRun(runId, {
            criticalFindingsWaived: true
        }))!
    }

    async deployOrchestrationRun(runId: string, ctx: AuditContext): Promise<Record<string, unknown>> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) {
            throw new NotFoundError('Orchestration run not found')
        }

        // Check gating rules
        if (!run.deployEnabled) {
            throw new BadRequestError('Deployment is disabled by feature flag NETOPS_DEPLOY_ENABLED')
        }

        if (run.status !== 'approved') {
            throw new BadRequestError(`Cannot deploy run in status: ${run.status}. Must be approved.`)
        }

        if (!run.hasVerifyPlan) {
            throw new BadRequestError('Cannot deploy without verification plan')
        }

        if (!run.hasRollbackPlan) {
            throw new BadRequestError('Cannot deploy without rollback plan')
        }

        if (run.hasCriticalFindings && !run.criticalFindingsWaived) {
            throw new BadRequestError('Cannot deploy with unwaived critical findings')
        }

        if ((run.receivedApprovals as number) < (run.requiredApprovals as number)) {
            throw new BadRequestError(`Insufficient approvals: ${run.receivedApprovals}/${run.requiredApprovals}`)
        }

        // Execute L7: Deploy
        await this.repo.updateOrchestrationRun(runId, { status: 'deploying' })

        const startTime = Date.now()
        const node = await this.repo.createOrchestrationNode({
            runId,
            nodeType: 'deploy',
            layer: 'L7_deploy',
            sequenceNum: 7,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { approvals: run.receivedApprovals },
            outputSummary: null,
            modelUsed: null,
            modelTier: null,
            promptTokens: null,
            completionTokens: null,
            llmLatencyMs: null,
            retryCount: 0,
            errorMessage: null,
            errorCode: null
        })

        // Simulate deployment
        await new Promise(resolve => setTimeout(resolve, 100))

        await this.repo.updateOrchestrationNode(node.id, {
            status: 'completed',
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
            outputSummary: { deployed: true }
        })

        await this.logAudit('orchestration_deployed', 'orchestration_run', runId, 'deploy', {}, ctx)

        return (await this.repo.updateOrchestrationRun(runId, {
            status: 'deployed',
            completedAt: new Date()
        }))!
    }

    async cancelOrchestrationRun(runId: string, reason: string | undefined, ctx: AuditContext): Promise<Record<string, unknown>> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) {
            throw new NotFoundError('Orchestration run not found')
        }

        const terminalStatuses = ['deployed', 'rolled_back', 'failed', 'cancelled']
        if (terminalStatuses.includes(run.status as string)) {
            throw new BadRequestError(`Cannot cancel run in status: ${run.status}`)
        }

        await this.logAudit('orchestration_cancelled', 'orchestration_run', runId, 'cancel', { reason }, ctx)

        return (await this.repo.updateOrchestrationRun(runId, {
            status: 'cancelled',
            completedAt: new Date(),
            errorMessage: reason || 'Cancelled by user'
        }))!
    }

    async getOrchestrationNodes(runId: string): Promise<Array<Record<string, unknown>>> {
        return this.repo.findOrchestrationNodesByRunId(runId)
    }

    async getOrchestrationContextPack(runId: string): Promise<Record<string, unknown> | null> {
        const run = await this.repo.findOrchestrationRunById(runId)
        if (!run) return null
        return run.contextPack as Record<string, unknown> | null
    }

    // ====================
    // AUDIT
    // ====================

    private async logAudit(
        eventType: string,
        resourceType: string,
        resourceId: string,
        action: string,
        details: Record<string, unknown>,
        ctx: AuditContext
    ): Promise<void> {
        try {
            await this.repo.logAuditEvent({
                correlationId: ctx.requestId,
                eventType,
                actorId: ctx.userId,
                actorRole: ctx.userRole,
                resourceType,
                resourceId,
                action,
                details: redactLogDetails(details),
                ipAddress: ctx.ip,
                userAgent: ctx.userAgent
            })
        } catch (error) {
            // Don't fail the main operation if audit logging fails
            console.error('Failed to log audit event:', error)
        }
    }
}
