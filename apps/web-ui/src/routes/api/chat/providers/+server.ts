/**
 * SvelteKit Proxy Route: Forward /api/chat/providers to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch providers');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error('Proxy error (GET /api/chat/providers):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const backendUrl = `${BACKEND_BASE_URL}/chat/providers`;

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
            throw error(response.status, errorData.message || 'Failed to create provider');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error('Proxy error (POST /api/chat/providers):', err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
