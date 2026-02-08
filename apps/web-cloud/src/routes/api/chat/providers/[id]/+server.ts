import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const PATCH: RequestHandler = async ({ params, request }) => {
    try {
        const body = await request.json()
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers/${params.id}`

        const response = await fetch(backendUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }))
            throw error(response.status, errorData.message || 'Failed to update provider')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error(`Proxy error (PATCH /api/chat/providers/${params.id}):`, err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}

export const DELETE: RequestHandler = async ({ params, request }) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/chat/providers/${params.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }))
            throw error(response.status, errorData.message || 'Failed to delete provider')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error(`Proxy error (DELETE /api/chat/providers/${params.id}):`, err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
