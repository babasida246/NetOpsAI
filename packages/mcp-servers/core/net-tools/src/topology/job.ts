import type { ToolContext, ToolDefinition } from '@tools/registry'
import { executeDeviceCliCollect } from '../tools/device-cli-collect.js'
import { executeNmapScan } from '../tools/nmap-scan-safe.js'
import { executeSnmpWalk } from '../tools/snmp-walk.js'
import { normalizeCliDatasets, normalizeSnmpDatasets, type NormalizedTables } from './normalize.js'
import { buildTopologyGraph } from './correlate.js'
import { persistTopologyGraph } from './persist.js'
import { nowIso } from '../utils/time.js'
import type { NettoolsDependencies, TopologyPersistSummary } from '../types.js'
import { maskSecrets } from '../utils/secrets.js'
import { nettoolsConfig } from '../utils/config.js'
import { enforceRateLimit } from '../utils/rate-limit.js'
import inputSchema from '../schemas/topology-discover.input.json' with { type: 'json' }
import outputSchema from '../schemas/topology-discover.output.json' with { type: 'json' }

export type TopologyDiscoverInput = {
    seedDevices: string[]
    includeNmap?: boolean
    nmapTargets?: string[]
    snmpTargets?: string[]
    mode?: 'fast' | 'full'
    site?: string
    zone?: string
}

async function auditStep(
    deps: NettoolsDependencies,
    entry: { toolName: string; userId?: string; target?: string; args: Record<string, any>; durationMs: number; status: 'success' | 'error'; errorMessage?: string }
): Promise<void> {
    if (!deps.audit) return
    await deps.audit({
        toolName: entry.toolName,
        userId: entry.userId,
        target: entry.target,
        args: maskSecrets(entry.args),
        durationMs: entry.durationMs,
        status: entry.status,
        errorMessage: entry.errorMessage
    })
}

export async function runTopologyDiscovery(
    input: TopologyDiscoverInput,
    deps: NettoolsDependencies,
    context?: ToolContext
): Promise<{ summary: TopologyPersistSummary; warnings: string[] }> {
    const mode = input.mode ?? 'fast'
    const now = nowIso()
    const warnings: string[] = []
    const tablesByDevice = new Map<string, NormalizedTables>()
    const deviceMap = new Map<string, any>()
    const nmapHosts: Array<{ ip: string; openTcpPorts: number[]; hostname?: string }> = []

    const snmpTargetsSet = new Set(input.snmpTargets ?? (mode === 'full' ? input.seedDevices : []))

    for (const deviceId of input.seedDevices) {
        const device = await deps.deviceLookup(deviceId)
        if (!device) {
            warnings.push(`Device not found: ${deviceId}`)
            continue
        }
        deviceMap.set(deviceId, device)

        const cliStart = Date.now()
        try {
            if (context?.userId) {
                enforceRateLimit(`cli:${context.userId}:${deviceId}`, nettoolsConfig.rateLimitPerMinute)
            }
            const cliResults = await executeDeviceCliCollect({
                deviceId,
                commands: mode === 'fast'
                    ? ['BRIDGE_HOST', 'IP_NEIGHBOR', 'LLDP_NEIGHBORS', 'IP_ARP', 'INTERFACE_DETAIL']
                    : ['BRIDGE_HOST', 'IP_NEIGHBOR', 'LLDP_NEIGHBORS', 'IP_ARP', 'INTERFACE_DETAIL'],
                timeoutSec: 10
            })

            await auditStep(deps, {
                toolName: 'device_cli_collect',
                userId: context?.userId,
                target: deviceId,
                args: { deviceId, commands: cliResults.map(r => r.datasetType) },
                durationMs: Date.now() - cliStart,
                status: 'success'
            })

            const normalized = normalizeCliDatasets(cliResults.map(result => ({
                deviceId: result.deviceId,
                datasetType: result.datasetType,
                items: result.items
            })), now)

            tablesByDevice.set(deviceId, normalized)
        } catch (error: any) {
            await auditStep(deps, {
                toolName: 'device_cli_collect',
                userId: context?.userId,
                target: deviceId,
                args: { deviceId, commands: ['BRIDGE_HOST', 'IP_NEIGHBOR', 'LLDP_NEIGHBORS', 'IP_ARP', 'INTERFACE_DETAIL'] },
                durationMs: Date.now() - cliStart,
                status: 'error',
                errorMessage: error?.message
            })
            warnings.push(`CLI collect failed for ${deviceId}: ${error?.message || 'unknown error'}`)
        }

        const shouldSnmp = mode === 'full' && (snmpTargetsSet.has(deviceId) || (device.mgmtIp && snmpTargetsSet.has(device.mgmtIp)))
        if (shouldSnmp) {
            const snmpStart = Date.now()
            try {
                if (context?.userId) {
                    enforceRateLimit(`snmp:${context.userId}:${device.mgmtIp || deviceId}`, nettoolsConfig.rateLimitPerMinute)
                }
                const credentialRef = device.snmpCredentialRef || nettoolsConfig.defaultSnmpCredentialRef
                if (!device.mgmtIp) throw new Error('Missing management IP for SNMP')
                const snmpDatasets = await Promise.all([
                    executeSnmpWalk({ target: device.mgmtIp, version: '2c', credentialRef, oidGroup: 'IF_MIB' }),
                    executeSnmpWalk({ target: device.mgmtIp, version: '2c', credentialRef, oidGroup: 'BRIDGE_MIB' }),
                    executeSnmpWalk({ target: device.mgmtIp, version: '2c', credentialRef, oidGroup: 'LLDP_MIB' }),
                    executeSnmpWalk({ target: device.mgmtIp, version: '2c', credentialRef, oidGroup: 'IP_MIB_ARP' })
                ])

                await auditStep(deps, {
                    toolName: 'snmp_walk',
                    userId: context?.userId,
                    target: device.mgmtIp || deviceId,
                    args: { target: device.mgmtIp || deviceId, oidGroups: snmpDatasets.map(d => d.meta?.oidGroup) },
                    durationMs: Date.now() - snmpStart,
                    status: 'success'
                })

                const normalizedSnmp = normalizeSnmpDatasets(snmpDatasets.map((dataset) => ({
                    target: device.mgmtIp || deviceId,
                    oidGroup: dataset.meta.oidGroup,
                    rows: dataset.rows
                })), deviceId, now)

                const existing = tablesByDevice.get(deviceId)
                if (existing) {
                    tablesByDevice.set(deviceId, {
                        macLearnTable: [...existing.macLearnTable, ...normalizedSnmp.macLearnTable],
                        neighborsTable: [...existing.neighborsTable, ...normalizedSnmp.neighborsTable],
                        arpTable: [...existing.arpTable, ...normalizedSnmp.arpTable],
                        interfacesTable: [...existing.interfacesTable, ...normalizedSnmp.interfacesTable]
                    })
                } else {
                    tablesByDevice.set(deviceId, normalizedSnmp)
                }
            } catch (error: any) {
                await auditStep(deps, {
                    toolName: 'snmp_walk',
                    userId: context?.userId,
                    target: device.mgmtIp || deviceId,
                    args: { target: device.mgmtIp || deviceId },
                    durationMs: Date.now() - snmpStart,
                    status: 'error',
                    errorMessage: error?.message
                })
                warnings.push(`SNMP failed for ${deviceId}: ${error?.message || 'unknown error'}`)
            }
        }
    }

    if (input.includeNmap && input.nmapTargets?.length) {
        for (const target of input.nmapTargets) {
            const scanStart = Date.now()
            try {
                if (context?.userId) {
                    enforceRateLimit(`nmap:${context.userId}:${target}`, nettoolsConfig.rateLimitPerMinute)
                }
                const nmapResult = await executeNmapScan({
                    target,
                    profile: 'top_ports',
                    topPorts: 50,
                    resolveDns: false,
                    timing: 'T3'
                })
                await auditStep(deps, {
                    toolName: 'nmap_scan_safe',
                    userId: context?.userId,
                    target,
                    args: { target, profile: 'top_ports', topPorts: 50 },
                    durationMs: Date.now() - scanStart,
                    status: 'success'
                })
                nmapHosts.push(...nmapResult.hosts)
            } catch (error: any) {
                await auditStep(deps, {
                    toolName: 'nmap_scan_safe',
                    userId: context?.userId,
                    target,
                    args: { target, profile: 'top_ports', topPorts: 50 },
                    durationMs: Date.now() - scanStart,
                    status: 'error',
                    errorMessage: error?.message
                })
                warnings.push(`Nmap failed for ${target}: ${error?.message || 'unknown error'}`)
            }
        }
    }

    const graph = buildTopologyGraph(tablesByDevice, deviceMap, nmapHosts)
    const summary = await persistTopologyGraph(deps.topologyStore, graph)

    return { summary, warnings }
}

export function createTopologyDiscoverTool(deps: NettoolsDependencies): ToolDefinition {
    return {
        name: 'topology_discover',
        description: 'Discover network topology and persist nodes, ports, edges.',
        inputSchema: inputSchema as Record<string, any>,
        outputSchema: outputSchema as Record<string, any>,
        async execute(args: TopologyDiscoverInput, context: ToolContext) {
            return await runTopologyDiscovery(args, deps, context)
        },
        strategy: 'fail-fast',
        timeout: 60000,
        requiresAuth: true,
        requiredRole: 'netops'
    }
}
