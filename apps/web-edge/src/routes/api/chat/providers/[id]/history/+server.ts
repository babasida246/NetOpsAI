import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const GET: RequestHandler = async ({ params, url, request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers/${params.id}/history${url.search ? url.search : ''}`
        const response = await fetch(backendUrl, {
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }))
            throw error(response.status, errorData.message || 'Failed to fetch provider history')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error(`Proxy error (GET /api/chat/providers/${params.id}/history):`, err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
