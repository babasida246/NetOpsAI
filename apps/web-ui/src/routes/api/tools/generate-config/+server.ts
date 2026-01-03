import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json()
        const backendUrl = `${BACKEND_BASE_URL}/tools/generate-config`

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
            throw error(response.status, text || 'Failed to generate config')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error('Proxy error (POST /api/tools/generate-config):', err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
