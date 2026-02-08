/**
 * SvelteKit Proxy Route: Forward /api/chat/completions to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const backendUrl = `${BACKEND_BASE_URL}/chat/completions`;

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to create completion');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error('Proxy error (POST /api/chat/completions):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
