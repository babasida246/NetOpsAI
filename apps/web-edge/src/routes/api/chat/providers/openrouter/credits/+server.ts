import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const GET: RequestHandler = async ({ request }) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/chat/providers/openrouter/credits`, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const text = await response.text()
            throw error(response.status, text || 'Failed to fetch credits')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error('Proxy error (GET /api/chat/providers/openrouter/credits):', err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
