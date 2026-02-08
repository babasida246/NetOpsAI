/**
 * SvelteKit Proxy Route: Forward /api/chat/stats/daily to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/stats/daily`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch daily stats');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error('Proxy error (GET /api/chat/stats/daily):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
