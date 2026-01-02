import type { ToolRegistry } from '@tools/registry'
import { getLogsTool } from './tools/get-logs.js'
import { summarizeLogsTool } from './tools/summarize-logs.js'

export function registerLogTools(registry: ToolRegistry): void {
    registry.register(getLogsTool)
    registry.register(summarizeLogsTool)
}

export { getLogsTool, summarizeLogsTool }
export * from './connectors/index.js'
