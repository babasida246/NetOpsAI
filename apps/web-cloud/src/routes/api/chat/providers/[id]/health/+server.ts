import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const GET: RequestHandler = async ({ params, request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers/${params.id}/health`
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const body = await response.text()
            throw error(response.status, body || 'Failed to check provider health')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error('Proxy error (GET /api/chat/providers/:id/health):', err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
