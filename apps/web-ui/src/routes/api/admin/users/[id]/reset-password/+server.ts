import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const POST: RequestHandler = async ({ params, request }) => {
    try {
        const body = await request.json()
        const response = await fetch(`${BACKEND_BASE_URL}/admin/users/${params.id}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }))
            throw error(response.status, errorData.message || 'Failed to reset password')
        }

        return json(await response.json())
    } catch (err: any) {
        console.error(`Proxy error (POST /api/admin/users/${params.id}/reset-password):`, err)
        throw error(err.status || 500, err.message || 'Proxy request failed')
    }
}
