export type NettoolsLogger = {
    info?: (...args: any[]) => void
    warn?: (...args: any[]) => void
    error?: (...args: any[]) => void
}

export const noopLogger: NettoolsLogger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
}
