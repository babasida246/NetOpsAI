export type Baseline = {
    id: string
    deviceId: string
    name: string
    config: string
    createdAt: string
    createdBy: string
}

export type DriftEvent = {
    id: string
    deviceId: string
    baselineId: string
    detectedAt: string
    severity: 'info' | 'warn' | 'critical'
    diff: string
}

const baselines: Baseline[] = []
const drifts: DriftEvent[] = []

function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`
    }
    return `${prefix}_${Math.random().toString(36).slice(2)}`
}

function nowIso(): string {
    return new Date().toISOString()
}

function diffLines(before: string, after: string): string {
    if (!before && !after) return ''
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    const diff: string[] = []
    const max = Math.max(beforeLines.length, afterLines.length)
    for (let i = 0; i < max; i += 1) {
        const prev = beforeLines[i]
        const next = afterLines[i]
        if (prev === next) continue
        if (prev !== undefined) diff.push(`- ${prev}`)
        if (next !== undefined) diff.push(`+ ${next}`)
    }
    return diff.join('\n')
}

export function listBaselines(): Baseline[] {
    return [...baselines]
}

export function createBaseline(input: Omit<Baseline, 'id' | 'createdAt'>): Baseline {
    const baseline: Baseline = {
        ...input,
        id: createId('baseline'),
        createdAt: nowIso()
    }
    baselines.unshift(baseline)
    return baseline
}

export function findBaseline(deviceId: string): Baseline | undefined {
    return baselines.find((item) => item.deviceId === deviceId)
}

export function listDrifts(deviceId?: string): DriftEvent[] {
    if (!deviceId) return [...drifts]
    return drifts.filter((event) => event.deviceId === deviceId)
}

export function recordDrift(input: { deviceId: string; currentConfig: string }): DriftEvent | null {
    const baseline = findBaseline(input.deviceId)
    if (!baseline) return null
    const diff = diffLines(baseline.config, input.currentConfig)
    if (!diff) return null

    const drift: DriftEvent = {
        id: createId('drift'),
        deviceId: input.deviceId,
        baselineId: baseline.id,
        detectedAt: nowIso(),
        severity: 'warn',
        diff
    }
    drifts.unshift(drift)
    return drift
}
