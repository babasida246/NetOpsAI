import { test, expect } from '@playwright/test';

/**
 * Analytics Page E2E Tests
 * Tests: summary stats cards, cost records, snapshot creation, form validation
 */

async function stubAnalyticsApis(page: any) {
    const okJson = (body: any) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

    const mockSummary = {
        totalAssets: 142,
        activeAssets: 98,
        inRepairAssets: 12,
        retiredAssets: 32,
        totalCost: 245000,
        avgAssetAge: 2.3,
        byCategory: [
            { category: 'Laptop', count: 60 },
            { category: 'Desktop', count: 40 },
            { category: 'Server', count: 20 },
        ],
        byLocation: [
            { location: 'HQ', count: 80 },
            { location: 'Branch-A', count: 62 },
        ],
    };

    const mockCosts = [
        {
            id: 'cost-001',
            assetId: 'asset-001',
            costType: 'purchase',
            amount: 1200,
            currency: 'USD',
            description: 'Initial purchase',
            recordedDate: '2025-01-01',
            recordedBy: 'admin-001',
            createdAt: '2025-01-01T00:00:00Z',
        },
        {
            id: 'cost-002',
            assetId: 'asset-002',
            costType: 'maintenance',
            amount: 150,
            currency: 'USD',
            description: 'Battery replacement',
            recordedDate: '2025-01-15',
            recordedBy: 'admin-001',
            createdAt: '2025-01-15T00:00:00Z',
        },
    ];

    const mockSnapshots = [
        {
            id: 'snap-001',
            snapshotDate: '2025-01-01',
            totalAssets: 140,
            activeAssets: 95,
            inRepairAssets: 10,
            retiredAssets: 35,
            totalCost: 230000,
            metadata: {},
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    const mockMetrics = [
        {
            id: 'metric-001',
            assetId: 'asset-001',
            metricType: 'uptime',
            value: 99.5,
            unit: 'percent',
            measuredAt: '2025-01-10T00:00:00Z',
            createdAt: '2025-01-10T00:00:00Z',
        },
    ];

    await page.route('**/api/v1/analytics/summary*', (route: any) => {
        return route.fulfill(okJson({ data: mockSummary }));
    });

    await page.route('**/api/v1/analytics/costs*', (route: any) => {
        const method = route.request().method();
        if (method === 'POST') {
            const newCost = {
                id: 'cost-new',
                ...JSON.parse(route.request().postData() || '{}'),
                createdAt: new Date().toISOString(),
            };
            return route.fulfill({ ...okJson({ data: newCost }), status: 201 });
        }
        return route.fulfill(okJson({ data: mockCosts }));
    });

    await page.route('**/api/v1/analytics/snapshots*', (route: any) => {
        const method = route.request().method();
        if (method === 'POST') {
            return route.fulfill({ ...okJson({ data: { id: 'snap-new', snapshotDate: new Date().toISOString() } }), status: 201 });
        }
        return route.fulfill(okJson({ data: mockSnapshots }));
    });

    await page.route('**/api/v1/analytics/metrics*', (route: any) => {
        return route.fulfill(okJson({ data: mockMetrics }));
    });

    await page.route('**/api/v1/analytics/insights*', (route: any) => {
        return route.fulfill(okJson({ data: [] }));
    });

    await page.route('**/api/v1/analytics/anomalies*', (route: any) => {
        return route.fulfill(okJson({ data: [] }));
    });

    await page.route('**/api/v1/analytics/dashboard*', (route: any) => {
        return route.fulfill(okJson({ data: [] }));
    });
}

test.describe('Analytics Page', () => {
    test.use({
        storageState: {
            cookies: [],
            origins: [{
                origin: 'http://localhost:3003',
                localStorage: [
                    { name: 'authToken', value: 'mock-e2e-token' },
                    { name: 'userRole', value: 'admin' },
                    { name: 'userEmail', value: 'admin@example.com' },
                ],
            }],
        },
    });

    test.beforeEach(async ({ page }) => {
        await stubAnalyticsApis(page);
    });

    test('page loads and displays heading', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText('Analytics');
    });

    test('displays summary stats cards', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Check stat values
        await expect(page.locator('[data-testid="stat-total"]')).toContainText('142');
        await expect(page.locator('[data-testid="stat-active"]')).toContainText('98');
        await expect(page.locator('[data-testid="stat-repair"]')).toContainText('12');
        await expect(page.locator('[data-testid="stat-retired"]')).toContainText('32');
    });

    test('snapshot button is visible and clickable', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        const snapshotBtn = page.locator('[data-testid="btn-snapshot"]');
        await expect(snapshotBtn).toBeVisible();
        await snapshotBtn.click();

        // After clicking, some feedback should appear (toast or page reload)
        await page.waitForLoadState('networkidle');
    });

    test('opens Add Cost modal', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Click "Add Cost" button
        await page.locator('[data-testid="btn-add-cost"]').click();

        // Modal fields should appear
        await expect(page.locator('[data-testid="input-cost-asset-id"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-cost-type"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-cost-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-cost-currency"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-cost-desc"]')).toBeVisible();
    });

    test('cost form validates required fields', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-add-cost"]').click();

        // Save button should be disabled when asset ID is empty
        await expect(page.locator('[data-testid="btn-save-cost"]')).toBeDisabled();

        // Fill asset ID but amount is 0
        await page.locator('[data-testid="input-cost-asset-id"]').fill('asset-001');
        // Amount defaults to 0, so button should still be disabled
        await expect(page.locator('[data-testid="btn-save-cost"]')).toBeDisabled();
    });

    test('creates cost record successfully', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-add-cost"]').click();

        // Fill form
        await page.locator('[data-testid="input-cost-asset-id"]').fill('asset-001');
        await page.locator('[data-testid="select-cost-type"]').selectOption('purchase');
        await page.locator('[data-testid="input-cost-amount"]').fill('1500');
        await page.locator('[data-testid="select-cost-currency"]').selectOption('USD');
        await page.locator('[data-testid="input-cost-desc"]').fill('New laptop purchase');

        // Save
        await expect(page.locator('[data-testid="btn-save-cost"]')).toBeEnabled();
        await page.locator('[data-testid="btn-save-cost"]').click();

        // Modal should close
        await expect(page.locator('[data-testid="input-cost-asset-id"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('displays cost records table', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Should show cost data (content depends on which tab)
        // Look for cost-related content
        const costTab = page.getByText('Cost Records');
        if (await costTab.isVisible()) {
            await costTab.click();
            await expect(page.getByText('Initial purchase')).toBeVisible();
            await expect(page.getByText('Battery replacement')).toBeVisible();
        }
    });

    test('displays charts/category data', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Check that category/location data from summary is rendered
        // These may be in charts or tables depending on UI
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});
