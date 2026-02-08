import type { CanonicalConfig } from './types'
import { validateModules } from './modules/registry'
export type { ValidationFinding } from './types'

export function validateConfig(config: CanonicalConfig) {
    return validateModules(config)
}
