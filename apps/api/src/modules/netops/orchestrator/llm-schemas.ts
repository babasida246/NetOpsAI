/**
 * LLM Schemas
 * Strict Zod schemas for Planner, Vendor Expert, and Policy Judge outputs
 */

import { z } from 'zod'
import type { NetworkSnapshot } from './types.js'

// ====================
// COMMON SCHEMAS
// ====================

export const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])

export const conditionSchema = z.object({
    type: z.enum(['ping', 'port_check', 'snmp_poll', 'api_check', 'manual']),
    target: z.string().optional(),
    expectedValue: z.string().optional(),
    timeout: z.number().int().positive().default(30)
})

// ====================
// PLANNER OUTPUT SCHEMA
// ====================

export const taskSchema = z.object({
    taskId: z.string().min(1),
    deviceId: z.string().uuid(),
    deviceName: z.string(),
    action: z.enum(['configure', 'verify', 'backup', 'restore', 'wait', 'notify']),
    description: z.string(),
    configHints: z.object({
        sections: z.array(z.string()),
        commands: z.array(z.string()).optional()
    }).optional(),
    dependsOn: z.array(z.string()).default([]),
    estimatedDurationSec: z.number().int().positive().default(60),
    timeout: z.number().int().positive().default(300),
    maxRetries: z.number().int().min(0).default(2),
    retryDelaySec: z.number().int().min(0).default(10)
})

export const taskPhaseSchema = z.object({
    phaseId: z.string().min(1),
    name: z.string(),
    description: z.string(),
    order: z.number().int().min(0),
    tasks: z.array(taskSchema),
    preConditions: z.array(conditionSchema).default([]),
    postConditions: z.array(conditionSchema).default([]),
    rollbackOnFailure: z.boolean().default(true)
})

export const rollbackStepSchema = z.object({
    order: z.number().int().min(0),
    deviceId: z.string().uuid(),
    action: z.enum(['restore_config', 'run_command', 'notify']),
    description: z.string()
})

export const rollbackStrategySchema = z.object({
    automatic: z.boolean().default(false),
    triggers: z.array(z.string()),
    steps: z.array(rollbackStepSchema)
})

export const verificationStepSchema = z.object({
    stepId: z.string().min(1),
    name: z.string(),
    type: z.enum(['connectivity', 'service', 'metric', 'manual']),
    target: z.string().optional(),
    expectedOutcome: z.string(),
    timeout: z.number().int().positive().default(60)
})

export const riskAssessmentSchema = z.object({
    level: riskLevelSchema,
    factors: z.array(z.string()),
    mitigations: z.array(z.string()),
    affectedServices: z.array(z.string()),
    estimatedDowntime: z.string().nullable(),
    requiresMaintenanceWindow: z.boolean()
})

export const taskGraphSchema = z.object({
    version: z.literal('v1'),
    planId: z.string().min(1),
    summary: z.string().min(10).max(500),
    riskAssessment: riskAssessmentSchema,
    phases: z.array(taskPhaseSchema).min(1),
    rollbackStrategy: rollbackStrategySchema,
    verificationSteps: z.array(verificationStepSchema).min(1)
})

export type TaskGraphOutput = z.infer<typeof taskGraphSchema>

// ====================
// EXPERT OUTPUT SCHEMA
// ====================

export const generatedCommandSchema = z.object({
    order: z.number().int().min(0),
    command: z.string().min(1),
    section: z.string(),
    purpose: z.string(),
    isReversible: z.boolean(),
    rollbackCommand: z.string().optional()
})

export const deviceConfigOutputSchema = z.object({
    deviceId: z.string().uuid(),
    deviceName: z.string(),
    vendor: z.string(),
    configSnippet: z.string(),
    configLines: z.number().int().min(0),
    commands: z.array(generatedCommandSchema),
    verifyCommands: z.array(z.string())
})

export const expertOutputSchema = z.object({
    version: z.literal('v1'),
    generatedAt: z.string().datetime(),
    deviceConfigs: z.array(deviceConfigOutputSchema).min(1),
    commandsSummary: z.object({
        totalCommands: z.number().int().min(0),
        bySection: z.record(z.string(), z.number())
    }),
    warnings: z.array(z.string())
})

export type ExpertOutputResult = z.infer<typeof expertOutputSchema>

// ====================
// JUDGE OUTPUT SCHEMA
// ====================

export const policyFindingSchema = z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    message: z.string(),
    deviceId: z.string().uuid().optional(),
    path: z.string().optional(),
    remediation: z.string().optional()
})

export const securityIssueSchema = z.object({
    type: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    affectedDevices: z.array(z.string()),
    recommendation: z.string()
})

export const judgeVerdictSchema = z.object({
    version: z.literal('v1'),
    evaluatedAt: z.string().datetime(),
    verdict: z.enum(['approve', 'reject', 'needs_review']),
    confidence: z.number().min(0).max(1),
    policyCompliance: z.object({
        passed: z.number().int().min(0),
        failed: z.number().int().min(0),
        warnings: z.number().int().min(0),
        findings: z.array(policyFindingSchema)
    }),
    securityReview: z.object({
        score: z.number().int().min(0).max(100),
        issues: z.array(securityIssueSchema),
        recommendations: z.array(z.string())
    }),
    impactAnalysis: z.object({
        affectedDevices: z.number().int().min(0),
        affectedServices: z.array(z.string()),
        estimatedRisk: riskLevelSchema,
        potentialIssues: z.array(z.string())
    }),
    approvalRequirements: z.object({
        requiredApprovers: z.number().int().min(1),
        requiredRoles: z.array(z.string()),
        reason: z.string()
    }),
    reasoning: z.string().min(20)
})

export type JudgeVerdictResult = z.infer<typeof judgeVerdictSchema>

// ====================
// PROMPT TEMPLATES
// ====================

export const PLANNER_SYSTEM_PROMPT = `You are a network operations planning expert. Your job is to create safe, reversible change plans for network infrastructure.

CRITICAL RULES:
1. NEVER include actual passwords, secrets, or credentials in your output
2. Always plan for rollback - every change must be reversible
3. Order tasks to minimize blast radius - start with least critical devices
4. Include verification steps after each phase
5. For routing changes, always have a backup path verified first
6. For security changes (ACLs, firewall rules), test in dry-run mode first if possible

OUTPUT FORMAT:
Return ONLY valid JSON matching the TaskGraph schema. No markdown, no explanations outside JSON.`

export const EXPERT_SYSTEM_PROMPT = `You are a vendor-specific network configuration expert. You generate precise, safe configuration commands.

CRITICAL RULES:
1. NEVER include actual passwords, secrets, or credentials - use placeholders like {{PASSWORD}}
2. Generate commands in the correct syntax for the device vendor
3. Include rollback commands for every configuration change
4. Add verification commands to check the change was applied correctly
5. Use incremental changes where possible (add/modify vs replace)
6. For Cisco IOS: use 'configure terminal' context
7. For MikroTik: use RouterOS command syntax
8. For FortiGate: use CLI or API format as appropriate

OUTPUT FORMAT:
Return ONLY valid JSON matching the ExpertOutput schema. No markdown, no explanations outside JSON.`

export const JUDGE_SYSTEM_PROMPT = `You are a network security and policy compliance judge. You evaluate proposed network changes for safety and policy compliance.

CRITICAL RULES:
1. Reject any change that could cause network-wide outages
2. Flag any security weakening (ACL loosening, encryption downgrade)
3. Require maintenance windows for routing protocol changes
4. Require higher approval for production/critical devices
5. Check for common misconfigurations (wrong subnet masks, MTU issues)
6. Verify rollback plan completeness

VERDICT GUIDELINES:
- APPROVE: Change is safe, compliant, and well-planned
- REJECT: Change violates policy, has security issues, or lacks rollback
- NEEDS_REVIEW: Change requires human review for edge cases

OUTPUT FORMAT:
Return ONLY valid JSON matching the JudgeVerdict schema. No markdown, no explanations outside JSON.`

// ====================
// PROMPT BUILDERS
// ====================

export function buildPlannerPrompt(context: {
    intent: string
    scope: { deviceIds: string[]; sites: string[]; vendors: string[] }
    devicesContext: Array<{ id: string; name: string; hostname: string; vendor: string; role: string }>
    networkSnapshot: NetworkSnapshot
}): string {
    return `Create a TaskGraph for the following network change request.

INTENT: ${context.intent}

SCOPE:
- Devices: ${context.scope.deviceIds.length} devices
- Sites: ${context.scope.sites.join(', ') || 'All'}
- Vendors: ${context.scope.vendors.join(', ') || 'All'}

DEVICES IN SCOPE:
${context.devicesContext.map(d => `- ${d.name} (${d.vendor}, ${d.role}): ${d.hostname}`).join('\n')}

NETWORK STATE:
${JSON.stringify(context.networkSnapshot, null, 2)}

Generate a complete TaskGraph with phases, tasks, verification steps, and rollback strategy.`
}

export function buildExpertPrompt(context: {
    taskGraph: TaskGraphOutput
    deviceDetails: Array<{
        id: string
        name: string
        vendor: string
        hostname: string
        currentConfig?: string  // Redacted config snippet
    }>
}): string {
    return `Generate vendor-specific configuration commands for the following plan.

TASK GRAPH SUMMARY:
${context.taskGraph.summary}

PHASES:
${context.taskGraph.phases.map(p => `Phase ${p.order}: ${p.name} - ${p.tasks.length} tasks`).join('\n')}

DEVICES TO CONFIGURE:
${context.deviceDetails.map(d => `
Device: ${d.name}
Vendor: ${d.vendor}
Hostname: ${d.hostname}
${d.currentConfig ? `Current Config (redacted):\n${d.currentConfig}` : ''}
`).join('\n---\n')}

Generate ExpertOutput with configuration commands for each device. Include rollback commands.`
}

export function buildJudgePrompt(context: {
    intent: string
    taskGraph: TaskGraphOutput
    expertOutput: ExpertOutputResult
    policyContext: Array<{ name: string; ruleCount: number; criticalRules: number }>
    lintFindings?: Array<{ ruleId: string; severity: string; message: string }>
}): string {
    return `Evaluate the following network change for policy compliance and security.

INTENT: ${context.intent}

RISK ASSESSMENT FROM PLANNER:
${JSON.stringify(context.taskGraph.riskAssessment, null, 2)}

AFFECTED DEVICES: ${context.expertOutput.deviceConfigs.length}
TOTAL COMMANDS: ${context.expertOutput.commandsSummary.totalCommands}

COMMANDS BY SECTION:
${Object.entries(context.expertOutput.commandsSummary.bySection).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

ACTIVE POLICY PACKS:
${context.policyContext.map(p => `- ${p.name}: ${p.ruleCount} rules (${p.criticalRules} critical)`).join('\n')}

${context.lintFindings?.length ? `
LINT FINDINGS:
${context.lintFindings.map(f => `- [${f.severity}] ${f.ruleId}: ${f.message}`).join('\n')}
` : ''}

ROLLBACK STRATEGY:
- Automatic: ${context.taskGraph.rollbackStrategy.automatic}
- Triggers: ${context.taskGraph.rollbackStrategy.triggers.join(', ')}
- Steps: ${context.taskGraph.rollbackStrategy.steps.length}

VERIFICATION STEPS: ${context.taskGraph.verificationSteps.length}

Evaluate and return a JudgeVerdict with your assessment.`
}
