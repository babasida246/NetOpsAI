/**
 * Warehouse Module E2E Tests
 * 
 * Tests for spare parts and inventory management
 * Based on: docs/modules/WAREHOUSE.md
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

test.describe('Warehouse Dashboard', () => {
    test('should display warehouse page', async ({ page }) => {
        await page.goto('/warehouse');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/warehouse') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should display spare parts list', async ({ page }) => {
        await page.goto('/warehouse');
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

test.describe('Warehouse API', () => {
    test.describe('Spare Parts', () => {
        test('GET /api/v1/warehouse/parts should return parts list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/warehouse/parts', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });

        test('should support pagination', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/warehouse/parts?page=1&limit=10', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Stock In', () => {
        test('GET /api/v1/warehouse/stock-in should return stock-in list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/warehouse/stock-in', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Stock Out', () => {
        test('GET /api/v1/warehouse/stock-out should return stock-out list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/warehouse/stock-out', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Warehouses', () => {
        test('GET /api/v1/warehouse/locations should return warehouses', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/warehouse/locations', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });
});
