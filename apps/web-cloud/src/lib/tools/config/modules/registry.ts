import coreModule from './core'
import routingModule from './routing'
import firewallModule from './firewall'
import natModule from './nat'
import vpnModule from './vpn'
import qosModule from './qos'
import monitoringModule from './monitoring'
import type { CanonicalConfig, EnvironmentTier, RenderSection, Vendor } from '../types'
import type { ModuleDefinition } from './types'

export const moduleRegistry: ModuleDefinition[] = [
    coreModule,
    routingModule,
    firewallModule,
    natModule,
    vpnModule,
    qosModule,
    monitoringModule
]

export const renderModules = (config: CanonicalConfig, vendor: Vendor) => {
    const sections: RenderSection[] = []
    const verifyCommands: string[] = []
    const rollbackCommands: string[] = []
    moduleRegistry.forEach((module) => {
        const result = module.render(config, vendor)
        if (result.sections.length > 0) {
            sections.push(...result.sections)
        }
        verifyCommands.push(...result.verifyCommands)
        rollbackCommands.push(...result.rollbackCommands)
    })
    return { sections, verifyCommands, rollbackCommands }
}

export const validateModules = (config: CanonicalConfig) => {
    return moduleRegistry.flatMap((module) => module.validate(config))
}

export const riskModules = (config: CanonicalConfig, environment: EnvironmentTier) => {
    return moduleRegistry.flatMap((module) => module.risk(config, environment))
}
