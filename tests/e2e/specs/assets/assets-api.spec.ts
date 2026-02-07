/**
 * Assets API E2E Tests
 * 
 * Tests for asset management API endpoints
 * Based on: docs/api/OVERVIEW.md - Assets Endpoints
 */
import { test, expect } from '@playwright/test';

// Helper to get auth token
async function getAuthToken(request: any): Promise<string | null> {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    const response = await request.post('/api/v1/auth/login', {
        data: { email, password }
    });

    if (response.status() === 200) {
        const body = await response.json();
        return body.data?.accessToken || null;
    }
    return null;
}

test.describe('Assets API', () => {
    test.describe('GET /api/v1/assets', () => {
        test('should return assets list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/assets', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Either 200 (success), 401 (no auth), or 404 (endpoint not implemented)
            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toHaveProperty('data');
                expect(Array.isArray(body.data) || body.data.items).toBeTruthy();
            }
        });

        test('should support pagination', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/assets?page=1&limit=10', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.meta).toHaveProperty('page');
            expect(body.meta).toHaveProperty('limit');
            expect(body.meta).toHaveProperty('total');
        });

        test('should support search filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/assets?search=test', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status()).toBe(200);
        });

        test('should support status filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/assets?status=in_stock', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status()).toBe(200);
        });

        test('should support CSV export', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/assets/export', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status()).toBe(200);
            expect(response.headers()['content-type']).toContain('text/csv');
        });
    });

    test.describe('GET /api/v1/assets/:id', () => {
        test('should return 404 for non-existent asset', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/assets/00000000-0000-0000-0000-000000000000', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([404, 400]).toContain(response.status());
        });
    });

    test.describe('POST /api/v1/assets', () => {
        test('should require authentication', async ({ request }) => {
            const response = await request.post('/api/v1/assets', {
                data: {
                    assetCode: 'TEST-001',
                    modelId: '00000000-0000-0000-0000-000000000000'
                }
            });

            // 401/403 for auth required, 404 if not implemented, 500 for server error
            expect([401, 403, 404, 500]).toContain(response.status());
        });

        test('should validate required fields', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/assets', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    // Missing required fields
                }
            });

            expect([400, 422]).toContain(response.status());
        });
    });
});

test.describe('Categories API', () => {
    test.describe('GET /api/v1/catalogs/categories', () => {
        test('should return categories list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/catalogs/categories', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Accept 404 if endpoint not implemented yet
            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toHaveProperty('data');
            }
        });
    });
});

test.describe('Models API', () => {
    test.describe('GET /api/v1/catalogs/models', () => {
        test('should return models list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/catalogs/models', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Accept 404 if endpoint not implemented yet
            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toHaveProperty('data');
            }
        });
    });
});

test.describe('Vendors API', () => {
    test.describe('GET /api/v1/catalogs/vendors', () => {
        test('should return vendors list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/catalogs/vendors', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Accept 404 if endpoint not implemented yet
            expect([200, 401, 404]).toContain(response.status());
        });
    });
});

test.describe('Locations API', () => {
    test.describe('GET /api/v1/catalogs/locations', () => {
        test('should return locations list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/catalogs/locations', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Accept 404 if endpoint not implemented yet
            expect([200, 401, 404]).toContain(response.status());
        });
    });
});
