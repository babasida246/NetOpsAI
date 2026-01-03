import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json()
        const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Login failed' }))
            throw error(response.status, err.message || 'Login failed')
        }

        return json(await response.json())
    } catch (err: any) {
        throw error(err.status || 500, err.message || 'Login failed')
    }
}
