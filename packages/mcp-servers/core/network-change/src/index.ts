import type { ToolRegistry } from '@tools/registry'
import {
    diffMikrotikRunningConfigTool,
    generateMikrotikFullConfigTool,
    generateMikrotikRollbackTool,
    generateFirewallMermaidTool,
    pushMikrotikConfigSshTool,
    validateMikrotikConfigTool
} from '@tools/registry'
import { generateVlanConfigTool } from './tools/generate-vlan-config.js'

export function registerNetworkTools(registry: ToolRegistry): void {
    registry.register(generateVlanConfigTool)
    registry.register(generateMikrotikFullConfigTool)
    registry.register(validateMikrotikConfigTool)
    registry.register(generateMikrotikRollbackTool)
    registry.register(diffMikrotikRunningConfigTool)
    registry.register(pushMikrotikConfigSshTool)
    registry.register(generateFirewallMermaidTool)
}

export { generateVlanConfigTool }
