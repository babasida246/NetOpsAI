/**
 * SvelteKit Proxy Route: Forward /api/conversations/:id to backend
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://gateway-api:3000';

export const GET: RequestHandler = async ({ params, request }) => {
    try {
        const { id } = params;
        const backendUrl = `${BACKEND_BASE_URL}/conversations/${id}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to fetch conversation');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (GET /api/conversations/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const PATCH: RequestHandler = async ({ params, request }) => {
    try {
        const { id } = params;
        const body = await request.json();
        const backendUrl = `${BACKEND_BASE_URL}/conversations/${id}`;

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
            throw error(response.status, errorData.message || 'Failed to update conversation');
        }

        return json(await response.json());
    } catch (err: any) {
        console.error(`Proxy error (PATCH /api/conversations/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};

export const DELETE: RequestHandler = async ({ params, request }) => {
    try {
        const { id } = params;
        const backendUrl = `${BACKEND_BASE_URL}/conversations/${id}`;

        const response = await fetch(backendUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Backend error' }));
            throw error(response.status, errorData.message || 'Failed to delete conversation');
        }

        return json({ message: 'Conversation deleted' });
    } catch (err: any) {
        console.error(`Proxy error (DELETE /api/conversations/${params.id}):`, err);
        throw error(err.status || 500, err.message || 'Proxy request failed');
    }
};
