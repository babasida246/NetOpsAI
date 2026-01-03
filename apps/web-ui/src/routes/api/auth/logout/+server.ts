import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json()
        const response = await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Logout failed' }))
            throw error(response.status, err.message || 'Logout failed')
        }

        return json(await response.json())
    } catch (err: any) {
        throw error(err.status || 500, err.message || 'Logout failed')
    }
}
