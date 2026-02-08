import type { EnvironmentTier, Vendor } from './types'

export type GuardrailLevel = 'warn' | 'block'

export type GuardrailIssue = {
    id: string
    level: GuardrailLevel
    message: string
    command: string
    pattern: string
}

export type GuardrailResult = {
    blocked: boolean
    issues: GuardrailIssue[]
}

const defaultPatterns = ['erase', 'format', 'reset', 'delete all', 'write erase', 'reload']

export function evaluateGuardrails(
    commands: string[],
    vendor: Vendor,
    environment: EnvironmentTier,
    role?: string
): GuardrailResult {
    const issues: GuardrailIssue[] = []
    const patterns = defaultPatterns
    const isProd = environment === 'prod'
    const isPrivileged = role === 'super_admin' || role === 'admin'

    commands.forEach((command) => {
        const lower = command.toLowerCase()
        patterns.forEach((pattern) => {
            if (lower.includes(pattern)) {
                issues.push({
                    id: `guardrail.${pattern}.${command}`,
                    level: isProd && !isPrivileged ? 'block' : 'warn',
                    message: `${pattern} command detected`,
                    command,
                    pattern
                })
            }
        })
    })

    const blocked = issues.some((issue) => issue.level === 'block')

    return { blocked, issues }
}
