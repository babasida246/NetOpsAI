import type { ToolContext, ToolDefinition } from '../../ToolRegistry.js'
import type { MikroTikFullConfigIntent } from './types.js'
import { generateMikrotikFullConfig } from './generator.js'
import { validateRouterOsConfig } from './validation.js'
import { mikrotikDiffSchema, mikrotikFullConfigIntentSchema, mikrotikValidateConfigSchema } from './intent.schema.js'

type JSONSchema = Record<string, any>

export const generateMikrotikFullConfigTool: ToolDefinition = {
    name: 'generate_mikrotik_full_config',
    description: 'Generate a full MikroTik RouterOS 7 configuration script (apply + rollback) from an intent model.',
    inputSchema: mikrotikFullConfigIntentSchema,
    async execute(args: MikroTikFullConfigIntent) {
        return generateMikrotikFullConfig(args)
    },
    strategy: 'fail-fast',
    timeout: 15000,
    requiresAuth: true,
    requiredRole: 'admin'
}

export const validateMikrotikConfigTool: ToolDefinition = {
    name: 'validate_mikrotik_config',
    description: 'Validate a MikroTik RouterOS configuration script and return warnings/errors for common pitfalls.',
    inputSchema: mikrotikValidateConfigSchema,
    async execute(args: { config: string; routerOsVersion: string }) {
        return validateRouterOsConfig(args.config, args.routerOsVersion)
    },
    strategy: 'fail-fast',
    timeout: 5000,
    requiresAuth: true,
    requiredRole: 'admin'
}

const mikrotikRollbackSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['intent'],
    properties: {
        intent: mikrotikFullConfigIntentSchema
    }
}

export const generateMikrotikRollbackTool: ToolDefinition = {
    name: 'generate_mikrotik_rollback',
    description: 'Generate a rollback RouterOS script for a given MikroTik intent.',
    inputSchema: mikrotikRollbackSchema,
    async execute(args: { intent: MikroTikFullConfigIntent }) {
        const output = generateMikrotikFullConfig(args.intent)
        return { rollback: output.rollback }
    },
    strategy: 'fail-fast',
    timeout: 15000,
    requiresAuth: true,
    requiredRole: 'admin'
}

function normalizeConfigLines(config: string): string[] {
    return config
        .split(/\r?\n/g)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim() !== '')
}

type DiffLine = { kind: 'same' | 'add' | 'remove'; line: string }

function buildDiff(runningConfig: string, desiredConfig: string): {
    summary: { added: number; removed: number; unchanged: number }
    lines: DiffLine[]
    safeApplyNotes: string[]
} {
    const runningLines = normalizeConfigLines(runningConfig).filter((l) => !l.trimStart().startsWith('#'))
    const desiredLines = normalizeConfigLines(desiredConfig).filter((l) => !l.trimStart().startsWith('#'))

    const runningSet = new Set(runningLines)
    const desiredSet = new Set(desiredLines)

    const added = desiredLines.filter((l) => !runningSet.has(l))
    const removed = runningLines.filter((l) => !desiredSet.has(l))

    const unchanged = desiredLines.length - added.length

    const lines: DiffLine[] = []

    for (const line of desiredLines) {
        lines.push({ kind: runningSet.has(line) ? 'same' : 'add', line })
    }
    for (const line of removed) {
        lines.push({ kind: 'remove', line })
    }

    const safeApplyNotes: string[] = []
    const desiredText = desiredLines.join('\n').toLowerCase()
    if (desiredText.includes('vlan-filtering=yes')) {
        safeApplyNotes.push('Bridge VLAN filtering changes can cause loss of connectivity. Apply during a maintenance window and keep an out-of-band path.')
    }
    if (desiredText.includes('/ip firewall filter')) {
        safeApplyNotes.push('Firewall changes can lock you out. Ensure management allow rules are in place before applying drop rules.')
    }
    if (desiredText.includes('/system identity set')) {
        safeApplyNotes.push('Identity changes are safe but can affect monitoring. Update CMDB/monitoring labels after apply.')
    }

    return {
        summary: { added: added.length, removed: removed.length, unchanged },
        lines,
        safeApplyNotes
    }
}

export const diffMikrotikRunningConfigTool: ToolDefinition = {
    name: 'diff_mikrotik_running_config',
    description: 'Diff a desired RouterOS config against a running config (simple line-based diff).',
    inputSchema: mikrotikDiffSchema,
    async execute(args: { runningConfig: string; desiredConfig: string }) {
        return buildDiff(args.runningConfig, args.desiredConfig)
    },
    strategy: 'fail-fast',
    timeout: 5000,
    requiresAuth: true,
    requiredRole: 'admin'
}

const mikrotikPushSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['target', 'auth', 'config'],
    properties: {
        target: {
            type: 'object',
            additionalProperties: false,
            required: ['host', 'user'],
            properties: {
                host: { type: 'string', minLength: 1 },
                port: { type: 'number', minimum: 1, maximum: 65535, default: 22 },
                user: { type: 'string', minLength: 1 }
            }
        },
        auth: {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: {
                type: { type: 'string', enum: ['password', 'key'] },
                password: { type: 'string' },
                privateKey: { type: 'string' },
                privateKeyPath: { type: 'string' },
                passphrase: { type: 'string' }
            }
        },
        config: { type: 'string', minLength: 1 },
        dryRun: { type: 'boolean', default: true },
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'], default: 'dev' },
        ticketId: { type: 'string' },
        timeoutMs: { type: 'number', minimum: 1000, maximum: 300000, default: 60000 },
        riskLevel: { type: 'string', enum: ['R0_READ', 'R1_SAFE_WRITE', 'R2_CHANGE', 'R3_DANGEROUS'], default: 'R0_READ' },
        reason: { type: 'string' },
        changeRequestId: { type: 'string' },
        rollbackPlan: { type: 'string' },
        precheck: { type: 'array', items: { type: 'string' } },
        postcheck: { type: 'array', items: { type: 'string' } },
        maintenanceWindowId: { type: 'string' },
        breakGlass: { type: 'boolean', default: false }
    }
}

type PushLogEvent = { timestamp: string; level: 'info' | 'warn' | 'error'; message: string }

function nowIso(): string {
    return new Date().toISOString()
}

function detectDangerousConfig(config: string): string[] {
    const lower = config.toLowerCase()
    const patterns = [
        'reset-configuration',
        'format',
        'write erase',
        '/system reset-configuration',
        '/disk format',
        '/interface set [find',
        'remove [find'
    ]
    return patterns.filter((p) => lower.includes(p))
}

export const pushMikrotikConfigSshTool: ToolDefinition = {
    name: 'push_mikrotik_config_ssh',
    description: 'Push a RouterOS script via SSH (guardrailed). Default is dry-run; production pushes require approval.',
    inputSchema: mikrotikPushSchema,
    async execute(
        args: {
            target: { host: string; port?: number; user: string }
            auth: { type: 'password' | 'key'; password?: string; privateKey?: string; privateKeyPath?: string; passphrase?: string }
            config: string
            dryRun?: boolean
            environment?: 'dev' | 'staging' | 'prod'
            ticketId?: string
            timeoutMs?: number
        },
        context: ToolContext
    ) {
        const logs: PushLogEvent[] = []
        const env = args.environment ?? 'dev'
        const dryRun = args.dryRun !== false

        logs.push({ timestamp: nowIso(), level: 'info', message: `Preparing SSH push (env=${env}, dryRun=${dryRun}).` })

        const dangerous = detectDangerousConfig(args.config)
        if (dangerous.length > 0) {
            logs.push({
                timestamp: nowIso(),
                level: env === 'prod' ? 'error' : 'warn',
                message: `Dangerous patterns detected: ${dangerous.join(', ')}`
            })
            if (env === 'prod') {
                return {
                    status: 'blocked',
                    dryRun,
                    logs,
                    rollbackSuggestion: 'Review the generated rollback script and perform a staged apply.'
                }
            }
        }

        if (env === 'prod') {
            // Safe-by-default: require an explicit approval workflow in a later phase.
            logs.push({ timestamp: nowIso(), level: 'error', message: 'Production pushes require approval (not implemented in this tool yet).' })
            return {
                status: 'blocked',
                dryRun,
                logs,
                rollbackSuggestion: 'Request approval, then push via approved workflow.'
            }
        }

        if (dryRun) {
            logs.push({ timestamp: nowIso(), level: 'info', message: 'Dry-run only. No SSH connection opened.' })
            return {
                status: 'dry_run',
                dryRun: true,
                logs,
                rollbackSuggestion: 'If apply fails, run the generated rollback script.'
            }
        }

        // NOTE: We intentionally do not open a real SSH connection in this repository yet.
        // The platform currently ships with an HTTP-based SSH proxy mock under apps/cloud-api/src/modules/netops/ssh.store.ts.
        // A future phase should replace this stub with a real SSH executor (ssh2) and WebSocket streaming.
        logs.push({
            timestamp: nowIso(),
            level: 'error',
            message: 'Real SSH push is not implemented. Enable dryRun or use the SSH Terminal proxy.'
        })
        return {
            status: 'not_implemented',
            dryRun: false,
            logs,
            rollbackSuggestion: 'Use the SSH Terminal tool to apply commands manually, with policy/audit enforced.'
        }
    },
    strategy: 'fail-fast',
    timeout: 60000,
    requiresAuth: true,
    requiredRole: 'admin'
}

