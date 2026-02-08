import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const GET: RequestHandler = async ({ request }) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Failed to fetch user' }))
            throw error(response.status, err.message || 'Failed to fetch user')
        }

        return json(await response.json())
    } catch (err: any) {
        throw error(err.status || 500, err.message || 'Failed to fetch user')
    }
}
