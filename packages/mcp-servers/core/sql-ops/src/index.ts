import type { ToolRegistry } from '@tools/registry'
import { analyzeQueryTool } from './tools/analyze-query.js'
import { explainPlanTool } from './tools/explain-plan.js'

export function registerSQLTools(registry: ToolRegistry): void {
    registry.register(analyzeQueryTool)
    registry.register(explainPlanTool)
}

export { analyzeQueryTool, explainPlanTool }
