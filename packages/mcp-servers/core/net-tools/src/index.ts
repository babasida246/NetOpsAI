import type { ToolRegistry } from '@tools/registry'
import { createNmapScanSafeTool } from './tools/nmap-scan-safe.js'
import { createSnmpWalkTool } from './tools/snmp-walk.js'
import { createDeviceCliCollectTool } from './tools/device-cli-collect.js'
import { createTopologyDiscoverTool } from './topology/job.js'
import type { NettoolsDependencies } from './types.js'

export function registerNetTools(registry: ToolRegistry, deps: NettoolsDependencies): void {
    registry.register(createNmapScanSafeTool())
    registry.register(createSnmpWalkTool())
    registry.register(createDeviceCliCollectTool())
    registry.register(createTopologyDiscoverTool(deps))
}

export { createNmapScanSafeTool } from './tools/nmap-scan-safe.js'
export { createSnmpWalkTool } from './tools/snmp-walk.js'
export { createDeviceCliCollectTool } from './tools/device-cli-collect.js'
export { runTopologyDiscovery, createTopologyDiscoverTool } from './topology/job.js'
export { buildTopologyGraph } from './topology/correlate.js'
export { normalizeCliDatasets, normalizeSnmpDatasets } from './topology/normalize.js'
export type {
    TopologyGraphDraft,
    TopologyNodeDraft,
    TopologyPortDraft,
    TopologyEdgeDraft,
    TopologyStore,
    TopologyPersistSummary,
    NettoolsDependencies,
    DeviceInfo
} from './types.js'
