import type { SchemaNode } from '../schema'
import type {
    CanonicalConfig,
    EnvironmentTier,
    RenderSection,
    RiskItem,
    ValidationFinding,
    Vendor
} from '../types'

export type ModuleRenderResult = {
    sections: RenderSection[]
    verifyCommands: string[]
    rollbackCommands: string[]
}

export type ModuleDefinition = {
    key: string
    title: string
    inputSchema: SchemaNode
    validate: (config: CanonicalConfig) => ValidationFinding[]
    risk: (config: CanonicalConfig, environment: EnvironmentTier) => RiskItem[]
    render: (config: CanonicalConfig, vendor: Vendor) => ModuleRenderResult
}

export const emptyRenderResult = (): ModuleRenderResult => ({
    sections: [],
    verifyCommands: [],
    rollbackCommands: []
})

