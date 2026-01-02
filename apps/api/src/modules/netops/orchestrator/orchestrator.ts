/**
 * NetOps Orchestrator
 * Multi-layer orchestration engine for network operations
 */

import type { Pool } from 'pg'
import { createHash } from 'crypto'
import type {
    OrchestrationRun,
    OrchestrationNode,
    OrchestrationScope,
    OrchestrationStatus,
    OrchestrationLayer,
    NodeStatus,
    NetOpsContextPack,
    TaskGraph,
    ExpertOutput,
    JudgeVerdict,
    RiskLevel,
    CreateOrchestrationRunInput,
    RunStepResult,
    LAYER_CONFIG
} from './types.js'
import {
    resolveScope,
    buildContextPack,
    getCachedContextPack,
    setCachedContextPack,
    generateCacheKey
} from './context-builder.js'
import {
    OrchestrationStateMachine,
    canProceedToNextLayer,
    getNextLayer,
    calculateRequiredApprovals,
    assessRiskLevel
} from './state-machine.js'
import {
    getNetOpsLLMWrapper,
    type LLMClient,
    type LLMConfig
} from './llm-wrapper.js'
import type { TaskGraphOutput, ExpertOutputResult, JudgeVerdictResult } from './llm-schemas.js'

// ====================
// REPOSITORY INTERFACE
// ====================

export interface OrchestrationRepository {
    // Runs
    createRun(run: Omit<OrchestrationRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrchestrationRun>
    updateRun(id: string, updates: Partial<OrchestrationRun>): Promise<OrchestrationRun | null>
    findRunById(id: string): Promise<OrchestrationRun | null>
    findRuns(filters: { status?: OrchestrationStatus; createdBy?: string; limit?: number; offset?: number }): Promise<OrchestrationRun[]>

    // Nodes
    createNode(node: Omit<OrchestrationNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrchestrationNode>
    updateNode(id: string, updates: Partial<OrchestrationNode>): Promise<OrchestrationNode | null>
    findNodesByRunId(runId: string): Promise<OrchestrationNode[]>

    // Audit
    logAuditEvent(event: {
        eventType: string
        entityType: string
        entityId: string
        actorId: string
        details: Record<string, unknown>
    }): Promise<void>
}

// ====================
// CONFIGURATION
// ====================

export interface OrchestratorConfig {
    deployEnabled: boolean
    highRiskApprovalsRequired: number
    enableContextCache: boolean
    llmConfig?: Partial<LLMConfig>
}

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
    deployEnabled: process.env.NETOPS_DEPLOY_ENABLED === 'true',
    highRiskApprovalsRequired: parseInt(process.env.NETOPS_HIGH_RISK_APPROVALS_REQUIRED || '2', 10),
    enableContextCache: true
}

// ====================
// ORCHESTRATOR
// ====================

export class NetOpsOrchestrator {
    private db: Pool
    private repo: OrchestrationRepository
    private config: OrchestratorConfig
    private llmWrapper: ReturnType<typeof getNetOpsLLMWrapper>

    constructor(
        db: Pool,
        repo: OrchestrationRepository,
        config?: Partial<OrchestratorConfig>,
        llmClient?: LLMClient
    ) {
        this.db = db
        this.repo = repo
        this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config }
        this.llmWrapper = getNetOpsLLMWrapper(llmClient, this.config.llmConfig)
    }

    // ====================
    // RUN LIFECYCLE
    // ====================

    /**
     * Create a new orchestration run
     */
    async createRun(
        input: CreateOrchestrationRunInput,
        userId: string
    ): Promise<OrchestrationRun> {
        // Resolve scope
        const scope = await resolveScope(this.db, {
            intent: input.intent,
            intentParams: input.intentParams,
            explicitScope: input.scope
        })

        // Create run record
        const run = await this.repo.createRun({
            changeRequestId: input.changeRequestId || null,
            intent: input.intent,
            intentParams: input.intentParams || {},
            scope,
            contextPack: null,
            contextPackHash: null,
            contextPackTokens: null,
            status: 'pending',
            currentLayer: 'L0_intake',
            riskLevel: null,
            requiredApprovals: 1,
            receivedApprovals: 0,
            hasVerifyPlan: false,
            hasRollbackPlan: false,
            hasCriticalFindings: false,
            criticalFindingsWaived: false,
            deployEnabled: this.config.deployEnabled,
            plannerOutput: null,
            expertOutput: null,
            judgeOutput: null,
            startedAt: null,
            completedAt: null,
            createdBy: userId,
            errorMessage: null,
            errorDetails: null
        })

        // Audit
        await this.repo.logAuditEvent({
            eventType: 'orchestration_run_created',
            entityType: 'orchestration_run',
            entityId: run.id,
            actorId: userId,
            details: {
                intent: input.intent,
                scopeDeviceCount: scope.deviceIds.length
            }
        })

        return run
    }

    /**
     * Execute the full orchestration pipeline
     */
    async executeRun(runId: string, userId: string): Promise<OrchestrationRun> {
        let run = await this.repo.findRunById(runId)
        if (!run) {
            throw new Error(`Orchestration run not found: ${runId}`)
        }

        // Start the run
        run = await this.repo.updateRun(runId, {
            status: 'running',
            startedAt: new Date()
        }) as OrchestrationRun

        // Execute layers in sequence
        try {
            // L0: Intake & Guardrails
            run = await this.runIntake(run, userId)

            // L1: Context Builder
            run = await this.runContextBuilder(run, userId)

            // L2: Deterministic Engine
            run = await this.runDeterministic(run, userId)

            // L3: Planner (LLM)
            run = await this.runPlanner(run, userId)

            // L4: Expert (LLM)
            run = await this.runExpert(run, userId)

            // L5: Verification Builder
            run = await this.runVerification(run, userId)

            // L6: Judge (LLM)
            run = await this.runJudge(run, userId)

            // Update status to awaiting_approval
            run = await this.repo.updateRun(runId, {
                status: 'awaiting_approval',
                currentLayer: 'L7_deploy'
            }) as OrchestrationRun

            return run
        } catch (error) {
            // Handle failure
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            run = await this.repo.updateRun(runId, {
                status: 'failed',
                errorMessage,
                completedAt: new Date()
            }) as OrchestrationRun

            await this.repo.logAuditEvent({
                eventType: 'orchestration_run_failed',
                entityType: 'orchestration_run',
                entityId: runId,
                actorId: userId,
                details: { error: errorMessage, layer: run.currentLayer }
            })

            throw error
        }
    }

    // ====================
    // LAYER EXECUTORS
    // ====================

    /**
     * L0: Intake & Guardrails
     */
    async runIntake(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        // Create node
        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'intake',
            layer: 'L0_intake',
            sequenceNum: 0,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { intent: run.intent, scopeDeviceCount: run.scope.deviceIds.length },
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

        // Validate input
        const stateMachine = new OrchestrationStateMachine(run)
        const guard = stateMachine.canProceed()

        if (!guard.allowed) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: guard.reason
            })
            throw new Error(guard.reason)
        }

        // Update node success
        await this.repo.updateNode(node.id, {
            status: 'completed',
            completedAt: new Date(),
            durationMs: Date.now() - nodeStart,
            outputSummary: { validated: true }
        })

        // Audit
        await this.repo.logAuditEvent({
            eventType: 'orchestration_layer_completed',
            entityType: 'orchestration_run',
            entityId: run.id,
            actorId: userId,
            details: { layer: 'L0_intake', durationMs: Date.now() - nodeStart }
        })

        return await this.repo.updateRun(run.id, {
            currentLayer: 'L1_context'
        }) as OrchestrationRun
    }

    /**
     * L1: Context Builder
     */
    async runContextBuilder(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'context',
            layer: 'L1_context',
            sequenceNum: 1,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { scope: run.scope },
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

        try {
            // Check cache
            const cacheKey = generateCacheKey(run.scope)
            let contextPack = this.config.enableContextCache
                ? getCachedContextPack(cacheKey)
                : null

            if (!contextPack) {
                // Build fresh context pack
                contextPack = await buildContextPack(this.db, {
                    scope: run.scope,
                    intent: run.intent,
                    includePromptHistory: true
                })

                // Cache it
                if (this.config.enableContextCache) {
                    setCachedContextPack(cacheKey, contextPack)
                }
            }

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                outputSummary: {
                    tokenEstimates: contextPack.tokenEstimates,
                    deviceCount: contextPack.devicesContext.length,
                    policyCount: contextPack.policyContext.length
                }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L1_context',
                    durationMs: Date.now() - nodeStart,
                    tokenEstimate: contextPack.tokenEstimates.total
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L2_deterministic',
                contextPack,
                contextPackHash: contextPack.hash,
                contextPackTokens: contextPack.tokenEstimates.total
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Context build failed'
            })
            throw error
        }
    }

    /**
     * L2: Deterministic Engine
     */
    async runDeterministic(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'deterministic',
            layer: 'L2_deterministic',
            sequenceNum: 2,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { contextPackHash: run.contextPackHash },
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

        try {
            // Assess risk based on scope
            const contextPack = run.contextPack!
            const riskLevel = assessRiskLevel({
                deviceCount: contextPack.devicesContext.length,
                hasRoutingChanges: run.intent.toLowerCase().includes('routing') || run.intent.toLowerCase().includes('bgp') || run.intent.toLowerCase().includes('ospf'),
                hasSecurityChanges: run.intent.toLowerCase().includes('acl') || run.intent.toLowerCase().includes('firewall') || run.intent.toLowerCase().includes('security'),
                hasVlanChanges: run.intent.toLowerCase().includes('vlan'),
                affectedSites: new Set(contextPack.devicesContext.map(d => d.site)).size,
                isProduction: contextPack.devicesContext.some(d => d.status === 'active')
            })

            // Calculate required approvals
            const requiredApprovals = calculateRequiredApprovals(
                riskLevel,
                this.config.highRiskApprovalsRequired
            )

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                outputSummary: { riskLevel, requiredApprovals }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L2_deterministic',
                    riskLevel,
                    requiredApprovals
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L3_planner',
                riskLevel,
                requiredApprovals
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Deterministic checks failed'
            })
            throw error
        }
    }

    /**
     * L3: Planner (LLM)
     */
    async runPlanner(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'planner',
            layer: 'L3_planner',
            sequenceNum: 3,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { intent: run.intent, deviceCount: run.contextPack?.devicesContext.length },
            outputSummary: null,
            modelUsed: null,
            modelTier: 'cheap',
            promptTokens: null,
            completionTokens: null,
            llmLatencyMs: null,
            retryCount: 0,
            errorMessage: null,
            errorCode: null
        })

        try {
            const contextPack = run.contextPack!

            // Call planner LLM
            const { output, metrics } = await this.llmWrapper.callPlanner({
                intent: run.intent,
                scope: {
                    deviceIds: run.scope.deviceIds,
                    sites: run.scope.sites,
                    vendors: run.scope.vendors
                },
                devicesContext: contextPack.devicesContext.map(d => ({
                    id: d.id,
                    name: d.name,
                    hostname: d.hostname,
                    vendor: d.vendor,
                    role: d.role
                })),
                networkSnapshot: contextPack.networkSnapshot
            })

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                modelUsed: this.llmWrapper.getModelForTier('cheap'),
                promptTokens: metrics.promptTokens,
                completionTokens: metrics.completionTokens,
                llmLatencyMs: metrics.latencyMs,
                retryCount: metrics.retries,
                outputSummary: {
                    planId: output.planId,
                    phaseCount: output.phases.length,
                    taskCount: output.phases.reduce((acc, p) => acc + p.tasks.length, 0),
                    riskLevel: output.riskAssessment.level
                }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L3_planner',
                    planId: output.planId,
                    tokens: metrics.promptTokens + metrics.completionTokens,
                    latencyMs: metrics.latencyMs
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L4_expert',
                plannerOutput: output as unknown as TaskGraph
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Planner failed'
            })
            throw error
        }
    }

    /**
     * L4: Vendor Expert (LLM)
     */
    async runExpert(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'expert',
            layer: 'L4_expert',
            sequenceNum: 4,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { planId: (run.plannerOutput as TaskGraphOutput)?.planId },
            outputSummary: null,
            modelUsed: null,
            modelTier: 'strong',
            promptTokens: null,
            completionTokens: null,
            llmLatencyMs: null,
            retryCount: 0,
            errorMessage: null,
            errorCode: null
        })

        try {
            const contextPack = run.contextPack!
            const taskGraph = run.plannerOutput as unknown as TaskGraphOutput

            // Call expert LLM
            const { output, metrics } = await this.llmWrapper.callExpert({
                taskGraph,
                deviceDetails: contextPack.devicesContext.map(d => ({
                    id: d.id,
                    name: d.name,
                    vendor: d.vendor,
                    hostname: d.hostname
                    // Note: currentConfig would be fetched and redacted here
                }))
            })

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                modelUsed: this.llmWrapper.getModelForTier('strong'),
                promptTokens: metrics.promptTokens,
                completionTokens: metrics.completionTokens,
                llmLatencyMs: metrics.latencyMs,
                retryCount: metrics.retries,
                outputSummary: {
                    deviceConfigCount: output.deviceConfigs.length,
                    totalCommands: output.commandsSummary.totalCommands,
                    warnings: output.warnings.length
                }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L4_expert',
                    totalCommands: output.commandsSummary.totalCommands,
                    tokens: metrics.promptTokens + metrics.completionTokens
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L5_verification',
                expertOutput: output as unknown as ExpertOutput
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Expert failed'
            })
            throw error
        }
    }

    /**
     * L5: Verification Builder
     */
    async runVerification(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'verification',
            layer: 'L5_verification',
            sequenceNum: 5,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { expertOutputCommands: (run.expertOutput as ExpertOutputResult)?.commandsSummary?.totalCommands },
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

        try {
            const taskGraph = run.plannerOutput as unknown as TaskGraphOutput
            const expertOutput = run.expertOutput as unknown as ExpertOutputResult

            // Build verification plan from taskGraph + expertOutput
            const hasVerifyPlan = taskGraph.verificationSteps.length > 0 &&
                expertOutput.deviceConfigs.every(dc => dc.verifyCommands.length > 0)

            // Build rollback plan
            const hasRollbackPlan = taskGraph.rollbackStrategy.steps.length > 0 &&
                expertOutput.deviceConfigs.every(dc =>
                    dc.commands.some(cmd => cmd.isReversible && cmd.rollbackCommand)
                )

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                outputSummary: { hasVerifyPlan, hasRollbackPlan }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L5_verification',
                    hasVerifyPlan,
                    hasRollbackPlan
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L6_judge',
                hasVerifyPlan,
                hasRollbackPlan
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Verification build failed'
            })
            throw error
        }
    }

    /**
     * L6: Policy Judge (LLM)
     */
    async runJudge(run: OrchestrationRun, userId: string): Promise<OrchestrationRun> {
        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'judge',
            layer: 'L6_judge',
            sequenceNum: 6,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { hasVerifyPlan: run.hasVerifyPlan, hasRollbackPlan: run.hasRollbackPlan },
            outputSummary: null,
            modelUsed: null,
            modelTier: 'strong',
            promptTokens: null,
            completionTokens: null,
            llmLatencyMs: null,
            retryCount: 0,
            errorMessage: null,
            errorCode: null
        })

        try {
            const contextPack = run.contextPack!
            const taskGraph = run.plannerOutput as unknown as TaskGraphOutput
            const expertOutput = run.expertOutput as unknown as ExpertOutputResult

            // Call judge LLM
            const { output, metrics } = await this.llmWrapper.callJudge({
                intent: run.intent,
                taskGraph,
                expertOutput,
                policyContext: contextPack.policyContext.map(p => ({
                    name: p.name,
                    ruleCount: p.ruleCount,
                    criticalRules: p.criticalRules
                }))
            })

            // Check for critical findings
            const hasCriticalFindings = output.policyCompliance.findings.some(
                f => f.severity === 'critical'
            ) || output.securityReview.issues.some(
                i => i.severity === 'critical'
            )

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                modelUsed: this.llmWrapper.getModelForTier('strong'),
                promptTokens: metrics.promptTokens,
                completionTokens: metrics.completionTokens,
                llmLatencyMs: metrics.latencyMs,
                retryCount: metrics.retries,
                outputSummary: {
                    verdict: output.verdict,
                    confidence: output.confidence,
                    policyPassed: output.policyCompliance.passed,
                    policyFailed: output.policyCompliance.failed,
                    securityScore: output.securityReview.score
                }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_layer_completed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L6_judge',
                    verdict: output.verdict,
                    confidence: output.confidence,
                    hasCriticalFindings,
                    tokens: metrics.promptTokens + metrics.completionTokens
                }
            })

            return await this.repo.updateRun(run.id, {
                currentLayer: 'L7_deploy',
                judgeOutput: output as unknown as JudgeVerdict,
                hasCriticalFindings,
                requiredApprovals: output.approvalRequirements.requiredApprovers
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Judge failed'
            })
            throw error
        }
    }

    /**
     * L7: Deploy (requires approval)
     */
    async runDeploy(runId: string, userId: string): Promise<OrchestrationRun> {
        let run = await this.repo.findRunById(runId)
        if (!run) {
            throw new Error(`Orchestration run not found: ${runId}`)
        }

        // Check guards
        const stateMachine = new OrchestrationStateMachine(run)
        const guard = canProceedToNextLayer(run)

        if (!guard.allowed) {
            throw new Error(guard.reason || 'Deploy not allowed')
        }

        const nodeStart = Date.now()

        const node = await this.repo.createNode({
            runId: run.id,
            nodeType: 'deploy',
            layer: 'L7_deploy',
            sequenceNum: 7,
            dependsOn: [],
            status: 'running',
            startedAt: new Date(),
            completedAt: null,
            durationMs: null,
            inputSummary: { receivedApprovals: run.receivedApprovals, requiredApprovals: run.requiredApprovals },
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

        try {
            // Update status to deploying
            run = await this.repo.updateRun(runId, {
                status: 'deploying'
            }) as OrchestrationRun

            // TODO: Actual deployment logic would go here
            // For now, we simulate success

            // Update node
            await this.repo.updateNode(node.id, {
                status: 'completed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                outputSummary: { deployed: true }
            })

            // Audit
            await this.repo.logAuditEvent({
                eventType: 'orchestration_deployed',
                entityType: 'orchestration_run',
                entityId: run.id,
                actorId: userId,
                details: {
                    layer: 'L7_deploy',
                    durationMs: Date.now() - nodeStart
                }
            })

            return await this.repo.updateRun(runId, {
                status: 'deployed',
                completedAt: new Date()
            }) as OrchestrationRun
        } catch (error) {
            await this.repo.updateNode(node.id, {
                status: 'failed',
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
                errorMessage: error instanceof Error ? error.message : 'Deploy failed'
            })

            // Update run status
            await this.repo.updateRun(runId, {
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Deploy failed',
                completedAt: new Date()
            })

            throw error
        }
    }

    // ====================
    // APPROVAL MANAGEMENT
    // ====================

    /**
     * Record an approval for a run
     */
    async recordApproval(
        runId: string,
        approverId: string,
        decision: 'approve' | 'reject',
        comment?: string
    ): Promise<OrchestrationRun> {
        const run = await this.repo.findRunById(runId)
        if (!run) {
            throw new Error(`Orchestration run not found: ${runId}`)
        }

        if (run.status !== 'awaiting_approval') {
            throw new Error(`Run is not awaiting approval: ${run.status}`)
        }

        // Audit
        await this.repo.logAuditEvent({
            eventType: 'orchestration_approval_recorded',
            entityType: 'orchestration_run',
            entityId: runId,
            actorId: approverId,
            details: { decision, comment }
        })

        if (decision === 'reject') {
            return await this.repo.updateRun(runId, {
                status: 'rejected',
                completedAt: new Date()
            }) as OrchestrationRun
        }

        // Increment approval count
        const newApprovalCount = run.receivedApprovals + 1
        const updates: Partial<OrchestrationRun> = {
            receivedApprovals: newApprovalCount
        }

        // Check if we have enough approvals
        if (newApprovalCount >= run.requiredApprovals) {
            updates.status = 'approved'
        }

        return await this.repo.updateRun(runId, updates) as OrchestrationRun
    }

    /**
     * Waive critical findings
     */
    async waiveCriticalFindings(
        runId: string,
        waiverId: string,
        reason: string
    ): Promise<OrchestrationRun> {
        const run = await this.repo.findRunById(runId)
        if (!run) {
            throw new Error(`Orchestration run not found: ${runId}`)
        }

        if (!run.hasCriticalFindings) {
            throw new Error('Run has no critical findings to waive')
        }

        // Audit
        await this.repo.logAuditEvent({
            eventType: 'orchestration_findings_waived',
            entityType: 'orchestration_run',
            entityId: runId,
            actorId: waiverId,
            details: { reason }
        })

        return await this.repo.updateRun(runId, {
            criticalFindingsWaived: true
        }) as OrchestrationRun
    }

    /**
     * Cancel a run
     */
    async cancelRun(runId: string, userId: string, reason?: string): Promise<OrchestrationRun> {
        const run = await this.repo.findRunById(runId)
        if (!run) {
            throw new Error(`Orchestration run not found: ${runId}`)
        }

        if (['deployed', 'rolled_back', 'failed', 'cancelled'].includes(run.status)) {
            throw new Error(`Cannot cancel run in status: ${run.status}`)
        }

        // Audit
        await this.repo.logAuditEvent({
            eventType: 'orchestration_cancelled',
            entityType: 'orchestration_run',
            entityId: runId,
            actorId: userId,
            details: { reason }
        })

        return await this.repo.updateRun(runId, {
            status: 'cancelled',
            completedAt: new Date(),
            errorMessage: reason || 'Cancelled by user'
        }) as OrchestrationRun
    }
}
