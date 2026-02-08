/**
 * SvelteKit Proxy Route: Forward /api/chat/stats/conversation/:id to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ params, request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/stats/conversation/${params.id}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch conversation stats');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (GET /api/chat/stats/conversation/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
