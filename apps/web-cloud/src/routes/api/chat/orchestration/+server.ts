/**
 * SvelteKit Proxy Route: Forward /api/chat/orchestration to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ url, request }) => {
    try {
        const queryParams = url.searchParams.toString();
        const backendUrl = `${BACKEND_BASE_URL}/chat/orchestration${queryParams ? '?' + queryParams : ''}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch orchestration rules');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error('Proxy error (GET /api/chat/orchestration):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const backendUrl = `${BACKEND_BASE_URL}/chat/orchestration`;

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
            throw error(response.status, errorData.message || 'Failed to create orchestration rule');
        }

        return json(await response.json(), { status: 201 });
    } catch (err: any) {
        console.error('Proxy error (POST /api/chat/orchestration):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
