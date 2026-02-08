import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json()
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers/openrouter/import-model`

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const text = await response.text()
            throw error(response.status, text || 'Failed to import model')
        }

        return json(await response.json(), { status: 201 })
    } catch (err: any) {
        console.error('Proxy error (POST /api/chat/providers/openrouter/import-model):', err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
