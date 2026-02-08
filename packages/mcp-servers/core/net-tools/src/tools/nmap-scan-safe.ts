import type { ToolDefinition, ToolContext } from '@tools/registry'
import { nettoolsConfig } from '../utils/config.js'
import { enforceRateLimit } from '../utils/rate-limit.js'
import { assertTargetAllowed } from '../utils/validate.js'
import { enforceMaxPorts } from '../utils/limits.js'
import { parseNmapGrepable } from '../utils/nmap.js'
import { runNettoolsCommand } from '../utils/runner.js'
import { loadFixtureText } from '../utils/fixtures.js'
import { ensureTimeoutMs } from '../utils/validation.js'
import inputSchema from '../schemas/nmap-scan-safe.input.json' with { type: 'json' }
import outputSchema from '../schemas/nmap-scan-safe.output.json' with { type: 'json' }

export type NmapScanInput = {
    target: string
    profile: 'top_ports' | 'ports_list'
    topPorts?: number
    ports?: string
    maxHosts?: number
    resolveDns?: boolean
    timing?: 'T2' | 'T3'
}

export async function executeNmapScan(args: NmapScanInput): Promise<{ hosts: any[]; meta: any }> {
    const start = Date.now()
    await assertTargetAllowed(args.target, nettoolsConfig)

    const maxHosts = Math.min(args.maxHosts ?? nettoolsConfig.maxHosts, nettoolsConfig.maxHosts)
    if (args.profile === 'ports_list' && args.ports) {
        enforceMaxPorts(args.ports, nettoolsConfig.maxPorts)
    }

    const timeoutMs = ensureTimeoutMs(nettoolsConfig.nmapTimeoutSec)
    const timing = args.timing ?? 'T3'

    const baseArgs = ['nmap', '-sT', '--open', '--host-timeout', `${nettoolsConfig.nmapTimeoutSec}s`, '--max-retries', '1', '-oG', '-']

    if (args.profile === 'top_ports') {
        baseArgs.push('--top-ports', String(args.topPorts ?? 50))
    } else if (args.ports) {
        baseArgs.push('-p', args.ports)
    }

    if (args.resolveDns === false) {
        baseArgs.push('-n')
    }

    baseArgs.push(`-${timing}`)
    baseArgs.push(args.target)

    let stdout: string

    if (nettoolsConfig.execMode === 'mock') {
        stdout = await loadFixtureText('nmap_sample.grep.txt')
    } else {
        const result = await runNettoolsCommand(baseArgs, timeoutMs)
        stdout = result.stdout
    }

    const hosts = parseNmapGrepable(stdout)
    const durationMs = Date.now() - start

    return {
        hosts,
        meta: {
            durationMs,
            profile: args.profile,
            ports: args.profile === 'ports_list' ? args.ports : undefined,
            topPorts: args.profile === 'top_ports' ? args.topPorts ?? 50 : undefined,
            maxHosts
        }
    }
}

export function createNmapScanSafeTool(): ToolDefinition {
    return {
        name: 'nmap_scan_safe',
        description: 'Safe TCP connect scan with allowlist and guardrails.',
        inputSchema: inputSchema as Record<string, any>,
        outputSchema: outputSchema as Record<string, any>,
        async execute(args: NmapScanInput, context: ToolContext) {
            const key = `${context.userId || 'anon'}:${args.target}`
            enforceRateLimit(`nmap:${key}`, nettoolsConfig.rateLimitPerMinute)
            return await executeNmapScan(args)
        },
        strategy: 'fail-fast',
        timeout: nettoolsConfig.nmapTimeoutSec * 1000,
        requiresAuth: true,
        requiredRole: 'netops'
    }
}
