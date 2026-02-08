import type { ToolDefinition, ToolContext } from '@tools/registry'
import inputSchema from '../schemas/device-cli-collect.input.json' with { type: 'json' }
import outputSchema from '../schemas/device-cli-collect.output.json' with { type: 'json' }
import { nettoolsConfig } from '../utils/config.js'
import { enforceRateLimit } from '../utils/rate-limit.js'
import { runNettoolsCommand } from '../utils/runner.js'
import { loadFixtureText } from '../utils/fixtures.js'
import { parseRouterOsDetailOutput } from '../utils/routeros.js'
import { resolveDeviceCredential } from '../utils/device-credentials.js'
import { ensureTimeoutMs } from '../utils/validation.js'

export type CliPreset = 'BRIDGE_HOST' | 'IP_NEIGHBOR' | 'LLDP_NEIGHBORS' | 'IP_ARP' | 'INTERFACE_DETAIL'

export type DeviceCliCollectInput = {
    deviceId: string
    commands: CliPreset[]
    timeoutSec?: number
}

const COMMAND_MAP: Record<CliPreset, string> = {
    BRIDGE_HOST: '/interface bridge host print detail without-paging',
    IP_NEIGHBOR: '/ip neighbor print detail without-paging',
    LLDP_NEIGHBORS: '/interface lldp neighbors print detail without-paging',
    IP_ARP: '/ip arp print detail without-paging',
    INTERFACE_DETAIL: '/interface print detail without-paging'
}

async function runRouterOsCommand(deviceId: string, preset: CliPreset, command: string, timeoutSec: number): Promise<string> {
    if (nettoolsConfig.execMode === 'mock') {
        const map: Record<string, string> = {
            BRIDGE_HOST: 'mikrotik_bridge_host.txt',
            IP_NEIGHBOR: 'mikrotik_ip_neighbor.txt',
            LLDP_NEIGHBORS: 'mikrotik_lldp_neighbors.txt',
            IP_ARP: 'mikrotik_ip_arp.txt',
            INTERFACE_DETAIL: 'mikrotik_interface_detail.txt'
        }
        const fixture = map[preset] || 'mikrotik_bridge_host.txt'
        return await loadFixtureText(fixture)
    }

    const creds = resolveDeviceCredential(deviceId)
    const timeoutMs = ensureTimeoutMs(timeoutSec)
    const sshArgs: string[] = ['ssh', '-o', 'StrictHostKeyChecking=no', '-p', String(creds.port ?? 22)]

    if (creds.authType === 'password') {
        throw new Error('Password auth over SSH is not supported without a wrapper')
    }

    if (creds.privateKey) {
        sshArgs.push('-i', creds.privateKey)
    }

    sshArgs.push(`${creds.user}@${creds.host}`, command)

    const result = await runNettoolsCommand(sshArgs, timeoutMs)
    return result.stdout
}

export async function executeDeviceCliCollect(args: DeviceCliCollectInput): Promise<Array<{ deviceId: string; datasetType: CliPreset; items: Array<Record<string, string>>; meta: { durationMs: number } }>> {
    const results: Array<{ deviceId: string; datasetType: CliPreset; items: Array<Record<string, string>>; meta: { durationMs: number } }> = []
    for (const preset of args.commands) {
        const command = COMMAND_MAP[preset]
        const start = Date.now()
        const raw = await runRouterOsCommand(args.deviceId, preset, command, args.timeoutSec ?? 10)
        const items = parseRouterOsDetailOutput(raw)
        results.push({
            deviceId: args.deviceId,
            datasetType: preset,
            items,
            meta: { durationMs: Date.now() - start }
        })
    }
    return results
}

export function createDeviceCliCollectTool(): ToolDefinition {
    return {
        name: 'device_cli_collect',
        description: 'Collect MikroTik RouterOS data via SSH presets.',
        inputSchema: inputSchema as Record<string, any>,
        outputSchema: outputSchema as Record<string, any>,
        async execute(args: DeviceCliCollectInput, context: ToolContext) {
            const key = `${context.userId || 'anon'}:${args.deviceId}`
            enforceRateLimit(`cli:${key}`, nettoolsConfig.rateLimitPerMinute)
            if (args.commands.length !== 1) {
                throw new Error('device_cli_collect accepts exactly one command per invocation')
            }
            const result = await executeDeviceCliCollect(args)
            return result[0]
        },
        strategy: 'fail-fast',
        timeout: 30000,
        requiresAuth: true,
        requiredRole: 'netops'
    }
}
