import type { ToolRegistry } from '@tools/registry'
import { generateVlanConfigTool } from './tools/generate-vlan-config.js'

export function registerNetworkTools(registry: ToolRegistry): void {
    registry.register(generateVlanConfigTool)
}

export { generateVlanConfigTool }
