import { vi } from 'vitest';

// Mock localStorage
const store = new Map<string, string>()

const localStorageMock = {
    getItem(key: string): string | null {
        return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string): void {
        store.set(key, String(value))
    },
    removeItem(key: string): void {
        store.delete(key)
    },
    clear(): void {
        store.clear()
    },
    get length(): number {
        return store.size
    },
    key(index: number): string | null {
        return Array.from(store.keys())[index] || null
    }
}

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
})

// Mock sessionStorage
Object.defineProperty(globalThis, 'sessionStorage', {
    value: localStorageMock,
    writable: true
})

// Mock matchMedia
if (!globalThis.matchMedia) {
    Object.defineProperty(globalThis, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('dark') ? false : true,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(() => false)
        })
    })
}

// Mock ResizeObserver
if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
    }
}

// Mock IntersectionObserver
if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class IntersectionObserver {
        constructor() { }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
        root = null
        rootMargin = ''
        thresholds = []
        takeRecords = () => []
    } as unknown as typeof IntersectionObserver
}

// Mock fetch for API calls
globalThis.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        status: 200,
        headers: new Headers()
    })
) as unknown as typeof fetch

// Mock window.scrollTo
Object.defineProperty(globalThis, 'scrollTo', {
    value: vi.fn(),
    writable: true
})

// Clean up after each test
import { afterEach } from 'vitest'

afterEach(() => {
    store.clear()
    vi.clearAllMocks()
})
