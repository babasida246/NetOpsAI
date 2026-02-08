import type { Handle } from '@sveltejs/kit';

// API base URL - use internal docker network URL in production
const API_BASE_URL = process.env.API_URL || process.env.BACKEND_BASE_URL || 'http://localhost:3000';

export const handle: Handle = async ({ event, resolve }) => {
    // Proxy API requests to the backend
    if (event.url.pathname.startsWith('/api/')) {
        // Remove /api prefix and forward to backend API
        const apiPath = event.url.pathname.replace(/^\/api/, '');
        const apiUrl = `${API_BASE_URL}${apiPath}${event.url.search}`;

        // Forward headers
        const headers = new Headers();
        event.request.headers.forEach((value, key) => {
            // Skip host and connection headers
            if (!['host', 'connection'].includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        });

        try {
            const response = await fetch(apiUrl, {
                method: event.request.method,
                headers,
                body: event.request.method !== 'GET' && event.request.method !== 'HEAD'
                    ? await event.request.text()
                    : undefined,
                // @ts-expect-error - duplex is required for Node.js fetch with body
                duplex: 'half'
            });

            // Forward response
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        } catch (error) {
            console.error('API proxy error:', error);
            return new Response(
                JSON.stringify({
                    error: 'API_UNREACHABLE',
                    message: 'Failed to connect to API server'
                }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    }

    return resolve(event);
};
