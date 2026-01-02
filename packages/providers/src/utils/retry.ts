export interface RetryOptions {
    maxAttempts?: number
    baseDelay?: number
    maxDelay?: number
    shouldRetry?: (error: Error) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    shouldRetry: () => true,
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastError: Error

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (error: any) {
            lastError = error

            if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
                throw lastError
            }

            const delay = Math.min(opts.baseDelay * Math.pow(2, attempt - 1), opts.maxDelay)
            const jitter = delay * 0.1 * Math.random()

            console.log(`Retry ${attempt}/${opts.maxAttempts} after ${Math.round(delay + jitter)}ms`)
            await sleep(delay + jitter)
        }
    }

    throw lastError!
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function isRetryableError(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return true
    }

    // Retry on 5xx errors
    if (error.response && error.response.status >= 500) {
        return true
    }

    // Retry on 429 (rate limit)
    if (error.response && error.response.status === 429) {
        return true
    }

    return false
}
