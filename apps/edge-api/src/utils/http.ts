export async function httpJson<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options)
    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Request failed: ${response.status} ${text}`)
    }
    return response.json() as Promise<T>
}

export async function httpEmpty(url: string, options: RequestInit): Promise<void> {
    const response = await fetch(url, options)
    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Request failed: ${response.status} ${text}`)
    }
}
