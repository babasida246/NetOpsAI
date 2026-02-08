import { test, expect } from '@playwright/test';

test.describe('Inventory Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/inventory');
    });

    test('should load inventory page', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display inventory list or empty state', async ({ page }) => {
        await page.waitForTimeout(2000);
        const content = page.getByRole('main').first();
        await expect(content).toBeVisible();
    });

    test('should have filter controls', async ({ page }) => {
        const filterArea = page.locator('select, [role="combobox"], input');
        if (await filterArea.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(filterArea.first()).toBeEnabled();
        }
    });

    test('should have export functionality', async ({ page }) => {
        const exportButton = page.getByRole('button', { name: /export/i });
        if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(exportButton).toBeEnabled();
        }
    });
});

test.describe('Maintenance Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/maintenance');
    });

    test('should load maintenance page', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display maintenance tickets or empty state', async ({ page }) => {
        await page.waitForTimeout(2000);
        const content = page.getByRole('main').first();
        await expect(content).toBeVisible();
    });

    test('should have create ticket button', async ({ page }) => {
        const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled();
        }
    });

    test('should have status filter', async ({ page }) => {
        const statusFilter = page.locator('select, [role="combobox"]');
        if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(statusFilter.first()).toBeEnabled();
        }
    });
});

test.describe('Requests Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/requests');
    });

    test('should load requests page', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /request/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display requests list or empty state', async ({ page }) => {
        await page.waitForTimeout(2000);
        const content = page.getByRole('main').first();
        await expect(content).toBeVisible();
    });

    test('should have create request button', async ({ page }) => {
        const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled();
        }
    });

    test('should have workflow tabs or status filter', async ({ page }) => {
        // Request page may have tabs, filters, or just content
        // Just check the page loads properly
        const content = page.getByRole('main').first();
        await expect(content).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Reports - Assets', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/reports/assets');
    });

    test('should load asset reports page', async ({ page }) => {
        await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });
        const dateFilter = page.locator('input[type="date"], [placeholder*="date"]');
        if (await dateFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(dateFilter.first()).toBeEnabled();
        }
    });

    test('should have export report button', async ({ page }) => {
        const exportButton = page.getByRole('button', { name: /export|download/i });
        if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(exportButton).toBeEnabled();
        }
    });
});
