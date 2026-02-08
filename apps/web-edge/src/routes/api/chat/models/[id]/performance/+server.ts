/**
 * SvelteKit Proxy Route: Forward /api/chat/models/:id/performance to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ params, url, request }) => {
    try {
        const queryParams = url.searchParams.toString();
        const backendUrl = `${BACKEND_BASE_URL}/chat/models/${params.id}/performance${queryParams ? '?' + queryParams : ''}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch model performance');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (GET /api/chat/models/${params.id}/performance):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
