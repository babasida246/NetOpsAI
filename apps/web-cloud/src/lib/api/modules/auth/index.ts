/**
 * Auth Module
 * 
 * Handles authentication: login, logout, token refresh, and current user.
 */
import { API_BASE, apiJsonData, authJsonData, authorizedFetch, clearStoredSession, setStoredTokens, setStoredUser, unwrapApiData } from '../../core/http-client'

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
    id: string
    email: string
    name: string
    role: string
}

export interface AuthResponse {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: AuthUser
}

export interface LoginRequest {
    email: string
    password: string
}

// ============================================================================
// Auth API
// ============================================================================

export async function login(email: string, password: string): Promise<AuthResponse> {
    const result = await apiJsonData<AuthResponse>(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })

    setStoredTokens(result.accessToken, result.refreshToken)
    setStoredUser({
        email: result.user.email,
        role: result.user.role,
        name: result.user.name
    })
    // Store userId separately (required for asset management API calls)
    if (typeof window !== 'undefined') {
        localStorage.setItem('userId', result.user.id)
    }
    return result
}

export async function refresh(): Promise<AuthResponse> {
    const response = await authorizedFetch(`${API_BASE}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
    })

    if (!response.ok) {
        clearStoredSession()
        throw new Error('Unable to refresh token')
    }

    const payload = await response.json()
    const data = unwrapApiData<AuthResponse>(payload as AuthResponse | { data: AuthResponse })
    setStoredTokens(data.accessToken, data.refreshToken)
    return data
}

export async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    await authorizedFetch(`${API_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    })
    clearStoredSession()
}

export async function getCurrentUser(): Promise<AuthUser> {
    return authJsonData<AuthUser>(`${API_BASE}/v1/auth/me`)
}
