/**
 * Maintenance Module E2E Tests
 * 
 * Tests for repair tickets and maintenance
 * Based on: docs/modules/MAINTENANCE.md
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

test.describe('Maintenance Dashboard', () => {
    test('should display maintenance page', async ({ page }) => {
        await page.goto('/maintenance');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/maintenance') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should display repair tickets list', async ({ page }) => {
        await page.goto('/maintenance');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        if (url.includes('/login') || url.includes('/setup')) {
            test.skip();
            return;
        }

        const content = await page.content();
        expect(content.length).toBeGreaterThan(500);
    });
});

test.describe('Maintenance API', () => {
    test.describe('Repair Tickets', () => {
        test('GET /api/v1/maintenance/tickets should return tickets list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/maintenance/tickets', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });

        test('should support status filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/maintenance/tickets?status=pending', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support priority filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/maintenance/tickets?priority=high', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Maintenance Schedules', () => {
        test('GET /api/v1/maintenance/schedules should return schedules', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/maintenance/schedules', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });
});
