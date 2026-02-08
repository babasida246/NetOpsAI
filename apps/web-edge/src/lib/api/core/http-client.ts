/**
 * Core HTTP Client
 * 
 * Provides base HTTP functionality for all API modules.
 */

// API base URL - includes /api prefix for versioned endpoints
export const API_BASE = import.meta.env?.VITE_API_BASE || import.meta.env?.BACKEND_BASE_URL || 'http://localhost:3000/api'

export type StoredUser = {
    email?: string | null
    role?: string | null
    name?: string | null
}

// ============================================================================
// Token Management
// ============================================================================

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
    if (typeof window === 'undefined') return { accessToken: null, refreshToken: null }
    return {
        accessToken: localStorage.getItem('authToken'),
        refreshToken: localStorage.getItem('refreshToken')
    }
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('authToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
}

export function setStoredUser(user: StoredUser): void {
    if (typeof window === 'undefined') return
    if (user.email) localStorage.setItem('userEmail', user.email)
    if (user.role) localStorage.setItem('userRole', user.role)
    if (user.name) localStorage.setItem('userName', user.name)
}

export function clearStoredSession(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
}

export function requireAccessToken(): string {
    const { accessToken } = getStoredTokens()
    if (!accessToken) {
        throw new Error('Authentication required')
    }
    return accessToken
}

// ============================================================================
// Token Refresh
// ============================================================================

let refreshingPromise: Promise<string | null> | null = null

export async function refreshAccessToken(fetchImpl: typeof fetch = fetch): Promise<string | null> {
    if (typeof window === 'undefined') return null
    const { refreshToken } = getStoredTokens()
    if (!refreshToken) return null

    if (!refreshingPromise) {
        refreshingPromise = (async () => {
            const response = await fetchImpl(`${API_BASE}/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            })

            if (!response.ok) {
                clearStoredSession()
                return null
            }

            const data = await response.json()
            // API returns {success: true, data: {accessToken, refreshToken}, meta: {...}}
            const tokens = data.data || data
            setStoredTokens(tokens.accessToken, tokens.refreshToken)
            return tokens.accessToken as string
        })()

        refreshingPromise.finally(() => {
            refreshingPromise = null
        })
    }

    return refreshingPromise
}

// ============================================================================
// Authorized Fetch
// ============================================================================

export async function authorizedFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {})
    const { accessToken } = getStoredTokens()
    const isRefreshCall = typeof input === 'string' && input.includes('/auth/refresh')

    if (accessToken && !headers.has('Authorization') && !init.credentials) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const doFetch = () => fetch(input, { ...init, headers })
    let response = await doFetch()

    if (response.status !== 401 || isRefreshCall) {
        return response
    }

    const newToken = await refreshAccessToken()
    if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`)
        response = await doFetch()
    }

    return response
}

// ============================================================================
// API JSON Helper
// ============================================================================

export async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await authorizedFetch(input, init)
    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `HTTP ${response.status}`)
    }
    const json = await response.json()
    return json as T
}

// ============================================================================
// Utility Functions
// ============================================================================

type ApiEnvelope<T> = {
    data: T
    meta?: unknown
    success?: boolean
}

export function unwrapApiData<T>(payload: ApiEnvelope<T> | T): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as ApiEnvelope<T>).data
    }
    return payload as T
}

export async function apiJsonData<T>(input: string, init?: RequestInit): Promise<T> {
    const payload = await apiJson<ApiEnvelope<T> | T>(input, init)
    return unwrapApiData(payload)
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
    if (entries.length === 0) return ''
    const query = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    return `?${query}`
}

export function getAssetHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || ''
    const role = localStorage.getItem('userRole') || 'viewer'
    if (!userId) {
        throw new Error('Authentication required')
    }
    return {
        'x-user-id': userId,
        'x-user-role': role
    }
}

/**
 * Authenticated JSON request helper
 */
export function authJson<T>(input: string, init?: RequestInit): Promise<T> {
    requireAccessToken()
    return apiJson<T>(input, init)
}

export function authJsonData<T>(input: string, init?: RequestInit): Promise<T> {
    requireAccessToken()
    return apiJsonData<T>(input, init)
}
