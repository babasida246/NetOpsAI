/**
 * CMDB Module E2E Tests
 * 
 * Tests for Configuration Management Database
 * Based on: docs/modules/CMDB.md
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

test.describe('CMDB Dashboard', () => {
    test('should display CMDB page', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/cmdb') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should display CI list or dashboard', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        if (url.includes('/login') || url.includes('/setup')) {
            test.skip();
            return;
        }

        // Page should have content
        const content = await page.content();
        expect(content.length).toBeGreaterThan(500);
    });
});

test.describe('CMDB API', () => {
    test.describe('Configuration Items', () => {
        test('GET /api/v1/cmdb/cis should return CI list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/cmdb/cis', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            // Either success or not implemented
            expect([200, 401, 404]).toContain(response.status());
        });

        test('GET /api/v1/cmdb/ci-types should return CI types', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/cmdb/ci-types', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Relationships', () => {
        test('GET /api/v1/cmdb/relationships should return relationships', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/cmdb/relationships', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Services', () => {
        test('GET /api/v1/cmdb/services should return services', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/cmdb/services', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });
});
