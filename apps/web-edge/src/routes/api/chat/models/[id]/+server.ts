/**
 * SvelteKit Proxy Route: Forward /api/chat/models/:id to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ params, request }) => {
    try {
        const backendUrl = `${BACKEND_BASE_URL}/chat/models/${params.id}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch model');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (GET /api/chat/models/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const PATCH: RequestHandler = async ({ params, request }) => {
    try {
        const body = await request.json();
        const backendUrl = `${BACKEND_BASE_URL}/chat/models/${params.id}`;

        const response = await fetch(backendUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to update model');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (PATCH /api/chat/models/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const DELETE: RequestHandler = async ({ params, request }) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/chat/models/${params.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to delete model');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (DELETE /api/chat/models/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
