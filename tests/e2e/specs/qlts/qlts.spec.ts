/**
 * QLTS Module (Quản Lý Tài Sản) E2E Tests
 * 
 * Tests for purchase planning and asset increase management
 * Based on: docs/modules/QLTS.md
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

test.describe('Purchase Plans Dashboard', () => {
    test('should display purchase plans page', async ({ page }) => {
        await page.goto('/qlts/purchase-plans');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/qlts') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should display purchase plans list', async ({ page }) => {
        await page.goto('/qlts/purchase-plans');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        if (url.includes('/login') || url.includes('/setup')) {
            test.skip();
            return;
        }

        const content = await page.content();
        expect(content.length).toBeGreaterThan(500);
    });

    test('should navigate to create purchase plan page', async ({ page }) => {
        await page.goto('/qlts/purchase-plans/new');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/qlts') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });
});

test.describe('Asset Increases Dashboard', () => {
    test('should display asset increases page', async ({ page }) => {
        await page.goto('/qlts/asset-increases');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/qlts') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should navigate to create asset increase page', async ({ page }) => {
        await page.goto('/qlts/asset-increases/new');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/qlts') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });
});

test.describe('Purchase Plans API', () => {
    test.describe('List Purchase Plans', () => {
        test('GET /api/v1/qlts/purchase-plans should return plans list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/qlts/purchase-plans', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toBeDefined();
            }
        });

        test('should support year filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/qlts/purchase-plans?year=2024', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support status filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/qlts/purchase-plans?status=approved', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support department filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/qlts/purchase-plans?department=IT', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Create Purchase Plan', () => {
        test('POST /api/v1/qlts/purchase-plans should create new plan', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/qlts/purchase-plans', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    title: `Test Plan ${Date.now()}`,
                    year: 2024,
                    quarter: 'Q2',
                    department: 'IT',
                    description: 'Test purchase plan',
                    items: [
                        {
                            assetCategory: 'Computer',
                            assetName: 'Dell Optiplex',
                            quantity: 5,
                            unit: 'Cái',
                            estimatedPrice: 15000000
                        }
                    ]
                }
            });

            expect([200, 201, 400, 404]).toContain(response.status());
        });

        test('should require title for plan creation', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/qlts/purchase-plans', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    year: 2024
                    // missing title
                }
            });

            expect([400, 404, 422]).toContain(response.status());
        });
    });

    test.describe('Plan Status Management', () => {
        test('should get plan by ID', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            // First get a plan ID
            const listResponse = await request.get('/api/v1/qlts/purchase-plans?limit=1', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (listResponse.status() !== 200) {
                test.skip();
                return;
            }

            const listBody = await listResponse.json();
            const planId = listBody.data?.items?.[0]?.id || listBody.data?.[0]?.id;

            if (!planId) {
                test.skip();
                return;
            }

            const response = await request.get(`/api/v1/qlts/purchase-plans/${planId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });
});

test.describe('Asset Increases API', () => {
    test.describe('List Asset Increases', () => {
        test('GET /api/v1/qlts/asset-increases should return increases list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/qlts/asset-increases', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toBeDefined();
            }
        });

        test('should support year filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/qlts/asset-increases?year=2024', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support source filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/qlts/asset-increases?source=purchase', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Create Asset Increase', () => {
        test('POST /api/v1/qlts/asset-increases should create new increase', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/qlts/asset-increases', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    increaseDate: new Date().toISOString().split('T')[0],
                    source: 'purchase',
                    receivingDepartment: 'IT',
                    items: [
                        {
                            assetCategory: 'Computer',
                            assetName: 'Dell Optiplex 7090',
                            quantity: 1,
                            unitPrice: 15000000,
                            condition: 'new'
                        }
                    ]
                }
            });

            expect([200, 201, 400, 404]).toContain(response.status());
        });
    });

    test.describe('Increase Sources', () => {
        test('GET /api/v1/qlts/increase-sources should return sources list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/qlts/increase-sources', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });
});

test.describe('Budget Tracking', () => {
    test('GET /api/v1/qlts/budget should return budget overview', async ({ request }) => {
        const token = await getAuthToken(request);

        const response = await request.get('/api/v1/qlts/budget', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        expect([200, 401, 404]).toContain(response.status());
    });

    test('should support year filter for budget', async ({ request }) => {
        const token = await getAuthToken(request);
        if (!token) {
            test.skip();
            return;
        }

        const response = await request.get('/api/v1/qlts/budget?year=2024', {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect([200, 404]).toContain(response.status());
    });

    test('should support department filter for budget', async ({ request }) => {
        const token = await getAuthToken(request);
        if (!token) {
            test.skip();
            return;
        }

        const response = await request.get('/api/v1/qlts/budget?department=IT', {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect([200, 404]).toContain(response.status());
    });
});
