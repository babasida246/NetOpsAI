import type { CanonicalConfig, EnvironmentTier, RiskItem, RiskLevel } from './types'
import { riskModules } from './modules/registry'
export type { RiskItem, RiskLevel } from './types'

const levelWeight: Record<RiskLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
}

const pickLevel = (items: RiskItem[]): RiskLevel => {
    if (items.length === 0) return 'LOW'
    const max = items.reduce((acc, item) => Math.max(acc, levelWeight[item.level]), 1)
    return max === 3 ? 'HIGH' : max === 2 ? 'MEDIUM' : 'LOW'
}

export function evaluateRisk(config: CanonicalConfig, environment: EnvironmentTier): {
    level: RiskLevel
    items: RiskItem[]
} {
    const items = riskModules(config, environment)

    return {
        level: pickLevel(items),
        items
    }
}
