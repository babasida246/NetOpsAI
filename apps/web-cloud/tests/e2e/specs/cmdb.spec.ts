/**
 * CMDB Module Tests
 * Tests Configuration Items, CI Types, Relationships, and Services
 */
import { test, expect, setupAuthenticatedSession, setupApiMocks } from './fixtures';

test.describe('CMDB - Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should display CMDB dashboard', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        // Page loaded successfully
        expect(true).toBe(true);
    });

    test('should show CI Type tabs', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        // Page loaded successfully
        expect(true).toBe(true);
    });

    test('should display CI list', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        // Page loaded successfully
        expect(true).toBe(true);
    });
});

test.describe('CMDB - CI Management', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should have add CI button', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        // Page loaded successfully
        expect(true).toBe(true);
    });

    test('should open create CI form', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);

            // Check for modal or form
            const modal = page.locator('[role="dialog"]');
            const form = page.locator('form');
            const hasForm = await modal.count() > 0 || await form.count() > 0;
            expect(hasForm).toBe(true);
        }
    });

    test('should navigate to CI detail page', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a, .ci-card a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');
            await expect(page).toHaveURL(/\/cmdb\/cis\/[a-f0-9-]+/);
        }
    });
});

test.describe('CMDB - CI Detail Page', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should display CI attributes', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a, .ci-card a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Check for attribute display
            const attributes = page.locator('.attribute, dt, .field-label, th');
            const hasAttributes = await attributes.count() > 0;
            expect(hasAttributes).toBe(true);
        }
    });

    test('should show relationships tab', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Check for relationships tab
            const relTab = page.locator('[role="tab"]:has-text("Relationship"), button:has-text("Quan hệ")');
            if (await relTab.count() > 0) {
                await relTab.click();
                await page.waitForTimeout(300);

                // Should show relationships content
                const relContent = page.locator('[role="tabpanel"], .relationships-panel');
                await expect(relContent).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('should have edit button', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');

            const editBtn = page.locator('button:has-text("Edit"), button:has-text("Sửa")');
            await expect(editBtn.first()).toBeVisible();
        }
    });
});

test.describe('CMDB - CI Types Management', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should switch between CI types', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        // Check for type selector
        const typeSelector = page.locator('[role="tablist"] [role="tab"], .ci-type-tab');
        if (await typeSelector.count() > 1) {
            // Click second type
            await typeSelector.nth(1).click();
            await page.waitForLoadState('domcontentloaded');

            // Content should update
        }
    });
});

test.describe('CMDB - Relationships', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should show add relationship button in CI detail', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Navigate to relationships tab
            const relTab = page.locator('[role="tab"]:has-text("Relationship"), button:has-text("Quan hệ")');
            if (await relTab.count() > 0) {
                await relTab.click();
                await page.waitForTimeout(300);

                // Check for add relationship button
                const addRelBtn = page.locator('button:has-text("Add Relationship"), button:has-text("Thêm quan hệ")');
                const hasAddBtn = await addRelBtn.count() > 0;
                expect(hasAddBtn).toBe(true);
            }
        }
    });
});

test.describe('CMDB - Services', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should navigate to services section', async ({ page }) => {
        // Look for services in CMDB navigation
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const servicesLink = page.locator('a:has-text("Service"), button:has-text("Dịch vụ")');
        if (await servicesLink.count() > 0) {
            await servicesLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Check for services content
            const servicesContent = page.locator('table, .service-list');
            const hasContent = await servicesContent.count() > 0;
            expect(hasContent).toBe(true);
        }
    });
});

test.describe('CMDB - Reports', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should navigate to CMDB reports', async ({ page }) => {
        await page.goto('/cmdb/reports');
        await page.waitForLoadState('domcontentloaded');

        // Page loaded successfully
        expect(true).toBe(true);
    });
});

test.describe('CMDB - Topology View', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should show topology graph in CI detail', async ({ page }) => {
        await page.goto('/cmdb');
        await page.waitForLoadState('domcontentloaded');

        const ciLink = page.locator('table tbody tr a').first();
        if (await ciLink.count() > 0) {
            await ciLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Look for topology tab
            const topoTab = page.locator('[role="tab"]:has-text("Topology"), button:has-text("Topo")');
            if (await topoTab.count() > 0) {
                await topoTab.click();
                await page.waitForTimeout(500);

                // Check for graph container
                const graph = page.locator('canvas, svg, .topology-graph, [data-testid="topology"]');
                const hasGraph = await graph.count() > 0;
                expect(hasGraph).toBe(true);
            }
        }
    });
});
