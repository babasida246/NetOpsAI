/**
 * LLM Wrapper
 * Handles LLM calls with strict JSON schema validation and retry logic
 */

import { z } from 'zod'
import type { Pool } from 'pg'
import {
    taskGraphSchema,
    expertOutputSchema,
    judgeVerdictSchema,
    PLANNER_SYSTEM_PROMPT,
    EXPERT_SYSTEM_PROMPT,
    JUDGE_SYSTEM_PROMPT,
    buildPlannerPrompt,
    buildExpertPrompt,
    buildJudgePrompt,
    type TaskGraphOutput,
    type ExpertOutputResult,
    type JudgeVerdictResult
} from './llm-schemas.js'
import type { ModelTier, NetOpsContextPack, NetworkSnapshot, OrchestrationNode } from './types.js'

// ====================
// CONFIGURATION
// ====================

export interface LLMConfig {
    cheapModel: string
    strongModel: string
    maxRetries: number
    retryDelayMs: number
    timeoutMs: number
}

const DEFAULT_CONFIG: LLMConfig = {
    cheapModel: process.env.NETOPS_CHEAP_MODEL || 'gpt-4o-mini',
    strongModel: process.env.NETOPS_STRONG_MODEL || 'gpt-4o',
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 60000
}

// ====================
// LLM CLIENT INTERFACE
// ====================

export interface LLMRequest {
    model: string
    systemPrompt: string
    userPrompt: string
    temperature?: number
    maxTokens?: number
    responseFormat?: 'json'
}

export interface LLMResponse {
    content: string
    promptTokens: number
    completionTokens: number
    latencyMs: number
    model: string
}

export interface LLMClient {
    complete(request: LLMRequest): Promise<LLMResponse>
}

// ====================
// MOCK LLM CLIENT (for testing/development)
// ====================

export class MockLLMClient implements LLMClient {
    async complete(request: LLMRequest): Promise<LLMResponse> {
        const startTime = Date.now()

        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 100))

        // Generate mock response based on system prompt
        let content: string

        if (request.systemPrompt.includes('planning expert')) {
            content = JSON.stringify(this.mockTaskGraph())
        } else if (request.systemPrompt.includes('configuration expert')) {
            content = JSON.stringify(this.mockExpertOutput())
        } else if (request.systemPrompt.includes('policy compliance judge')) {
            content = JSON.stringify(this.mockJudgeVerdict())
        } else {
            content = '{"error": "Unknown prompt type"}'
        }

        return {
            content,
            promptTokens: Math.ceil(request.userPrompt.length / 4),
            completionTokens: Math.ceil(content.length / 4),
            latencyMs: Date.now() - startTime,
            model: request.model
        }
    }

    private mockTaskGraph(): TaskGraphOutput {
        return {
            version: 'v1',
            planId: `plan-${Date.now()}`,
            summary: 'Mock task graph for testing purposes',
            riskAssessment: {
                level: 'medium',
                factors: ['Multiple devices affected', 'Configuration changes'],
                mitigations: ['Staged rollout', 'Pre-change backups'],
                affectedServices: ['Network connectivity'],
                estimatedDowntime: null,
                requiresMaintenanceWindow: false
            },
            phases: [{
                phaseId: 'phase-1',
                name: 'Pre-flight checks',
                description: 'Verify device connectivity and backup configs',
                order: 0,
                tasks: [{
                    taskId: 'task-1',
                    deviceId: '00000000-0000-0000-0000-000000000001',
                    deviceName: 'mock-device-1',
                    action: 'backup',
                    description: 'Backup current configuration',
                    dependsOn: [],
                    estimatedDurationSec: 30,
                    timeout: 60,
                    maxRetries: 2,
                    retryDelaySec: 5
                }],
                preConditions: [{
                    type: 'ping',
                    target: 'mock-device-1',
                    timeout: 10
                }],
                postConditions: [],
                rollbackOnFailure: true
            }],
            rollbackStrategy: {
                automatic: false,
                triggers: ['connectivity_loss', 'error_threshold_exceeded'],
                steps: [{
                    order: 0,
                    deviceId: '00000000-0000-0000-0000-000000000001',
                    action: 'restore_config',
                    description: 'Restore from backup'
                }]
            },
            verificationSteps: [{
                stepId: 'verify-1',
                name: 'Connectivity check',
                type: 'connectivity',
                target: 'mock-device-1',
                expectedOutcome: 'Device responds to ping',
                timeout: 30
            }]
        }
    }

    private mockExpertOutput(): ExpertOutputResult {
        return {
            version: 'v1',
            generatedAt: new Date().toISOString(),
            deviceConfigs: [{
                deviceId: '00000000-0000-0000-0000-000000000001',
                deviceName: 'mock-device-1',
                vendor: 'cisco',
                configSnippet: 'interface GigabitEthernet0/0\n description Updated by NetOps',
                configLines: 2,
                commands: [{
                    order: 0,
                    command: 'interface GigabitEthernet0/0',
                    section: 'interface',
                    purpose: 'Enter interface configuration mode',
                    isReversible: true
                }, {
                    order: 1,
                    command: 'description Updated by NetOps',
                    section: 'interface',
                    purpose: 'Set interface description',
                    isReversible: true,
                    rollbackCommand: 'no description'
                }],
                verifyCommands: ['show interface GigabitEthernet0/0']
            }],
            commandsSummary: {
                totalCommands: 2,
                bySection: { interface: 2 }
            },
            warnings: []
        }
    }

    private mockJudgeVerdict(): JudgeVerdictResult {
        return {
            version: 'v1',
            evaluatedAt: new Date().toISOString(),
            verdict: 'approve',
            confidence: 0.9,
            policyCompliance: {
                passed: 10,
                failed: 0,
                warnings: 1,
                findings: []
            },
            securityReview: {
                score: 85,
                issues: [],
                recommendations: ['Consider adding logging for changes']
            },
            impactAnalysis: {
                affectedDevices: 1,
                affectedServices: [],
                estimatedRisk: 'low',
                potentialIssues: []
            },
            approvalRequirements: {
                requiredApprovers: 1,
                requiredRoles: ['network_admin'],
                reason: 'Standard change with low risk'
            },
            reasoning: 'This is a low-risk configuration change affecting a single device. The change includes proper rollback steps and verification commands. No security concerns identified.'
        }
    }
}

// ====================
// LLM WRAPPER
// ====================

export class NetOpsLLMWrapper {
    private client: LLMClient
    private config: LLMConfig

    constructor(client?: LLMClient, config?: Partial<LLMConfig>) {
        this.client = client || new MockLLMClient()
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Get model for tier
     */
    getModelForTier(tier: ModelTier): string {
        return tier === 'cheap' ? this.config.cheapModel : this.config.strongModel
    }

    /**
     * Call Planner LLM with strict schema validation
     */
    async callPlanner(context: {
        intent: string
        scope: { deviceIds: string[]; sites: string[]; vendors: string[] }
        devicesContext: Array<{ id: string; name: string; hostname: string; vendor: string; role: string }>
        networkSnapshot: NetworkSnapshot
    }): Promise<{
        output: TaskGraphOutput
        metrics: { promptTokens: number; completionTokens: number; latencyMs: number; retries: number }
    }> {
        const userPrompt = buildPlannerPrompt(context)

        const { result, metrics } = await this.callWithRetry<TaskGraphOutput>(
            {
                model: this.getModelForTier('cheap'),
                systemPrompt: PLANNER_SYSTEM_PROMPT,
                userPrompt,
                temperature: 0.2,
                responseFormat: 'json'
            },
            taskGraphSchema
        )

        return { output: result, metrics }
    }

    /**
     * Call Expert LLM with strict schema validation
     */
    async callExpert(context: {
        taskGraph: TaskGraphOutput
        deviceDetails: Array<{
            id: string
            name: string
            vendor: string
            hostname: string
            currentConfig?: string
        }>
    }): Promise<{
        output: ExpertOutputResult
        metrics: { promptTokens: number; completionTokens: number; latencyMs: number; retries: number }
    }> {
        const userPrompt = buildExpertPrompt(context)

        const { result, metrics } = await this.callWithRetry<ExpertOutputResult>(
            {
                model: this.getModelForTier('strong'),
                systemPrompt: EXPERT_SYSTEM_PROMPT,
                userPrompt,
                temperature: 0.1,
                responseFormat: 'json'
            },
            expertOutputSchema
        )

        return { output: result, metrics }
    }

    /**
     * Call Judge LLM with strict schema validation
     */
    async callJudge(context: {
        intent: string
        taskGraph: TaskGraphOutput
        expertOutput: ExpertOutputResult
        policyContext: Array<{ name: string; ruleCount: number; criticalRules: number }>
        lintFindings?: Array<{ ruleId: string; severity: string; message: string }>
    }): Promise<{
        output: JudgeVerdictResult
        metrics: { promptTokens: number; completionTokens: number; latencyMs: number; retries: number }
    }> {
        const userPrompt = buildJudgePrompt(context)

        const { result, metrics } = await this.callWithRetry<JudgeVerdictResult>(
            {
                model: this.getModelForTier('strong'),
                systemPrompt: JUDGE_SYSTEM_PROMPT,
                userPrompt,
                temperature: 0.1,
                responseFormat: 'json'
            },
            judgeVerdictSchema
        )

        return { output: result, metrics }
    }

    /**
     * Call LLM with retry and schema validation
     */
    private async callWithRetry<T>(
        request: LLMRequest,
        schema: z.ZodType<T, z.ZodTypeDef, unknown>
    ): Promise<{
        result: T
        metrics: { promptTokens: number; completionTokens: number; latencyMs: number; retries: number }
    }> {
        let lastError: Error | null = null
        const totalTokens = { prompt: 0, completion: 0 }
        let totalLatency = 0

        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const response = await this.client.complete(request)

                totalTokens.prompt += response.promptTokens
                totalTokens.completion += response.completionTokens
                totalLatency += response.latencyMs

                // Parse JSON
                let parsed: unknown
                try {
                    // Clean response - remove markdown code blocks if present
                    let content = response.content.trim()
                    if (content.startsWith('```json')) {
                        content = content.slice(7)
                    } else if (content.startsWith('```')) {
                        content = content.slice(3)
                    }
                    if (content.endsWith('```')) {
                        content = content.slice(0, -3)
                    }
                    content = content.trim()

                    parsed = JSON.parse(content)
                } catch (e) {
                    throw new Error(`Invalid JSON response: ${e instanceof Error ? e.message : 'Parse error'}`)
                }

                // Validate against schema
                const validated = schema.parse(parsed)

                return {
                    result: validated,
                    metrics: {
                        promptTokens: totalTokens.prompt,
                        completionTokens: totalTokens.completion,
                        latencyMs: totalLatency,
                        retries: attempt
                    }
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))

                // Don't retry on schema validation errors that indicate fundamentally wrong output
                if (error instanceof z.ZodError) {
                    const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
                    lastError = new Error(`Schema validation failed: ${issues}`)
                }

                // Wait before retry
                if (attempt < this.config.maxRetries - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, this.config.retryDelayMs * Math.pow(2, attempt))
                    )
                }
            }
        }

        throw lastError || new Error('Max retries exceeded')
    }
}

// ====================
// FACTORY
// ====================

let defaultWrapper: NetOpsLLMWrapper | null = null

export function getNetOpsLLMWrapper(client?: LLMClient, config?: Partial<LLMConfig>): NetOpsLLMWrapper {
    if (client || config) {
        return new NetOpsLLMWrapper(client, config)
    }

    if (!defaultWrapper) {
        defaultWrapper = new NetOpsLLMWrapper()
    }

    return defaultWrapper
}

export function resetNetOpsLLMWrapper(): void {
    defaultWrapper = null
}
