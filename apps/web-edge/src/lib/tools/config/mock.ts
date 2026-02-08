import type { CanonicalConfig, RenderResult, Vendor } from './types'
import { renderModules } from './modules/registry'

export function renderConfig(config: CanonicalConfig, vendor: Vendor): RenderResult {
    const { sections, verifyCommands, rollbackCommands } = renderModules(config, vendor)
    const commands = sections.flatMap((section) => section.commands)
    return {
        commands,
        sections,
        verifyCommands,
        rollbackCommands
    }
}
