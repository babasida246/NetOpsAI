import { goto } from '$app/navigation'
import type { ClientInit, HandleClientError, HandleFetch } from '@sveltejs/kit'
import { clearStoredSession, getStoredTokens, refreshAccessToken } from '$lib/api/httpClient'

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
    const isApiRequest =
        request.url.startsWith(event.url.origin + '/api') ||
        request.url.startsWith('/api')

    if (!isApiRequest) {
        return fetch(request)
    }

    // Attach token if missing
    const headers = new Headers(request.headers)
    if (!headers.has('authorization')) {
        const { accessToken } = getStoredTokens()
        if (accessToken) {
            headers.set('authorization', `Bearer ${accessToken}`)
        }
    }

    const doFetch = (req: Request) => fetch(req)
    let response = await doFetch(new Request(request, { headers }))

    if (response.status !== 401 || request.url.includes('/auth/refresh')) {
        return response
    }

    const refreshed = await refreshAccessToken(fetch)
    if (refreshed) {
        headers.set('authorization', `Bearer ${refreshed}`)
        response = await doFetch(new Request(request, { headers }))
    }

    if (response.status === 401 && typeof window !== 'undefined' && !event.url.pathname.startsWith('/login')) {
        clearStoredSession()
        const redirectTo = encodeURIComponent(event.url.pathname + event.url.search)
        goto(`/login?redirect=${redirectTo}`)
    }

    return response
}

export const handleError: HandleClientError = ({ error }) => {
    console.error('Client error', error)
}

export const init: ClientInit = () => {}
