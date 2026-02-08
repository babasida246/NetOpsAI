import type { ToolDefinition, ToolContext } from '@tools/registry'
import inputSchema from '../schemas/snmp-walk.input.json' with { type: 'json' }
import outputSchema from '../schemas/snmp-walk.output.json' with { type: 'json' }
import { nettoolsConfig } from '../utils/config.js'
import { enforceRateLimit } from '../utils/rate-limit.js'
import { assertTargetAllowed } from '../utils/validate.js'
import { runNettoolsCommand } from '../utils/runner.js'
import { loadFixtureText } from '../utils/fixtures.js'
import { OID_GROUPS, type OidGroup } from '../utils/constants.js'
import { parseSnmpOutput } from '../utils/snmp-output.js'
import { resolveSnmpCredential } from '../utils/snmp.js'
import { ensureTimeoutMs } from '../utils/validation.js'

export type SnmpWalkInput = {
    target: string
    version: '2c' | '3'
    credentialRef: string
    oidGroup: OidGroup
    timeoutSec?: number
    retries?: number
    maxRows?: number
}

export async function executeSnmpWalk(args: SnmpWalkInput): Promise<{ rows: { oid: string; value: string }[]; meta: any }> {
    const start = Date.now()
    await assertTargetAllowed(args.target, nettoolsConfig)

    const timeoutSec = args.timeoutSec ?? nettoolsConfig.snmpTimeoutSec
    const retries = args.retries ?? nettoolsConfig.snmpRetries
    const maxRows = args.maxRows ?? 5000

    const oidPrefix = OID_GROUPS[args.oidGroup]
    if (!oidPrefix) throw new Error('Unsupported OID group')

    const credential = resolveSnmpCredential(args.credentialRef)

    const commandArgs: string[] = ['snmpwalk', '-On', '-OQ', '-t', String(timeoutSec), '-r', String(retries)]

    if (args.version === '2c') {
        if (!credential.community) throw new Error('Missing SNMP community')
        commandArgs.push('-v2c', '-c', credential.community)
    } else {
        if (!credential.username || !credential.authProtocol || !credential.authPassword || !credential.privProtocol || !credential.privPassword) {
            throw new Error('Missing SNMPv3 credential fields')
        }
        commandArgs.push(
            '-v3',
            '-l', 'authPriv',
            '-u', credential.username,
            '-a', credential.authProtocol,
            '-A', credential.authPassword,
            '-x', credential.privProtocol,
            '-X', credential.privPassword
        )
    }

    commandArgs.push(args.target, oidPrefix)

    let stdout: string
    if (nettoolsConfig.execMode === 'mock') {
        const fixture = `snmp_${args.oidGroup.toLowerCase()}.txt`
        stdout = await loadFixtureText(fixture)
    } else {
        const result = await runNettoolsCommand(commandArgs, ensureTimeoutMs(timeoutSec))
        stdout = result.stdout
    }

    const rows = parseSnmpOutput(stdout).slice(0, maxRows)
    const durationMs = Date.now() - start

    return {
        rows,
        meta: {
            oidGroup: args.oidGroup,
            durationMs,
            rowCount: rows.length
        }
    }
}

export function createSnmpWalkTool(): ToolDefinition {
    return {
        name: 'snmp_walk',
        description: 'Guardrailed SNMP walk (OID allowlist, v2c/v3).',
        inputSchema: inputSchema as Record<string, any>,
        outputSchema: outputSchema as Record<string, any>,
        async execute(args: SnmpWalkInput, context: ToolContext) {
            const key = `${context.userId || 'anon'}:${args.target}`
            enforceRateLimit(`snmp:${key}`, nettoolsConfig.rateLimitPerMinute)
            return await executeSnmpWalk(args)
        },
        strategy: 'fail-fast',
        timeout: nettoolsConfig.snmpTimeoutSec * 1000,
        requiresAuth: true,
        requiredRole: 'netops'
    }
}
