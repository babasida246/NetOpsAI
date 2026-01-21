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
    }
}

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
})

if (!globalThis.matchMedia) {
    Object.defineProperty(globalThis, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false
        })
    })
}
