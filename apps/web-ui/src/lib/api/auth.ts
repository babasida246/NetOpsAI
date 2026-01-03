import { API_BASE, apiJson, authorizedFetch, clearStoredSession, setStoredTokens, setStoredUser } from './httpClient'

export interface AuthResponse {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: {
        id: string
        email: string
        name: string
        role: string
    }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const result = await apiJson<AuthResponse>(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })

    setStoredTokens(result.accessToken, result.refreshToken)
    setStoredUser({ email: result.user.email, role: result.user.role, name: result.user.name })
    return result
}

export async function refresh(): Promise<AuthResponse> {
    const response = await authorizedFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
    })

    if (!response.ok) {
        clearStoredSession()
        throw new Error('Unable to refresh token')
    }

    const data = await response.json()
    setStoredTokens(data.accessToken, data.refreshToken)
    return data
}

export async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    await authorizedFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    })
    clearStoredSession()
}

export async function getCurrentUser() {
    return apiJson<{ id: string; email: string; name: string; role: string }>(`${API_BASE}/auth/me`, {
        method: 'GET'
    })
}
