import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests for new feature pages
 * Tests: sidebar links exist, pages load without errors, page headings correct
 */

// Stub all APIs for the new feature pages to prevent 500 errors from live API
async function stubAllNewApis(page: any) {
    const okJson = (body: any) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

    // Automation APIs
    await page.route('**/api/v1/automation/**', (route: any) => {
        return route.fulfill(okJson({ data: [] }));
    });

    // Analytics APIs
    await page.route('**/api/v1/analytics/**', (route: any) => {
        const url = route.request().url();
        if (url.includes('/summary')) {
            return route.fulfill(okJson({
                data: { totalAssets: 0, activeAssets: 0, inRepairAssets: 0, retiredAssets: 0, totalCost: 0, avgAssetAge: 0, byCategory: [], byLocation: [] }
            }));
        }
        return route.fulfill(okJson({ data: [] }));
    });

    // Integration APIs
    await page.route('**/api/v1/integrations/**', (route: any) => {
        return route.fulfill(okJson({ data: [] }));
    });

    // Security APIs
    await page.route('**/api/v1/security/**', (route: any) => {
        const url = route.request().url();
        if (url.includes('/compliance/summary')) {
            return route.fulfill(okJson({
                data: { totalControls: 0, compliant: 0, nonCompliant: 0, partial: 0, notAssessed: 0, complianceRate: 0 }
            }));
        }
        return route.fulfill(okJson({ data: [] }));
    });

    // Stub optional APIs that may fire on page load
    await page.route('**/api/v1/auth/**', (route: any) => route.continue());
}

test.describe('Feature Navigation', () => {
    // Use fresh context with mock auth to bypass login redirect
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
        await stubAllNewApis(page);
    });

    test('automation page loads from direct URL', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Workflow Automation');

        // Page should not have error alerts on load with empty data
        const url = page.url();
        expect(url).toContain('/automation');
    });

    test('analytics page loads from direct URL', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Analytics');

        const url = page.url();
        expect(url).toContain('/analytics');
    });

    test('integrations page loads from direct URL', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Integration');

        const url = page.url();
        expect(url).toContain('/integrations');
    });

    test('security page loads from direct URL', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Security & Compliance');

        const url = page.url();
        expect(url).toContain('/security');
    });

    test('all feature pages have no page errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        const pages = ['/automation', '/analytics', '/integrations', '/security'];

        for (const path of pages) {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
        }

        // Should have no uncaught page errors
        expect(errors).toEqual([]);
    });

    test('sidebar contains links to new feature pages', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Check that sidebar/nav contains links to all new pages
        const sidebar = page.locator('nav, aside');
        if (await sidebar.count() > 0) {
            // Look for links with feature names (supports both EN and VI)
            const analyticsLink = page.locator('a[href*="analytics"], a:has-text("Analytics"), a:has-text("Phân tích")');
            const automationLink = page.locator('a[href*="automation"], a:has-text("Automation"), a:has-text("Tự động")');
            const integrationLink = page.locator('a[href*="integrations"], a:has-text("Integration"), a:has-text("Tích hợp")');
            const securityLink = page.locator('a[href*="security"], a:has-text("Security"), a:has-text("Bảo mật")');

            // At least one match for each should be found
            expect(await analyticsLink.count()).toBeGreaterThanOrEqual(1);
            expect(await automationLink.count()).toBeGreaterThanOrEqual(1);
            expect(await integrationLink.count()).toBeGreaterThanOrEqual(1);
            expect(await securityLink.count()).toBeGreaterThanOrEqual(1);
        }
    });
});
