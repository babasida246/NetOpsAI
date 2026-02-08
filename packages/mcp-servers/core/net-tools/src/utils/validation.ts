export function ensureTimeoutMs(seconds: number): number {
    return Math.max(1, Math.min(seconds, 300)) * 1000
}
