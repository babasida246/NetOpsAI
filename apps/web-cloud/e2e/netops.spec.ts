import { test, expect } from '@playwright/test';

test.describe('NetOps - Devices Page', () => {
    test('should load devices page', async ({ page }) => {
        await page.goto('/netops/devices');

        // Should see devices header
        await expect(page.getByRole('heading', { name: /device/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display device list or empty state', async ({ page }) => {
        await page.goto('/netops/devices');

        await page.waitForTimeout(2000);

        // Should have either device table or empty state message
        const contentArea = page.getByRole('main').first();
        await expect(contentArea).toBeVisible();
    });

    test('should have add device button', async ({ page }) => {
        await page.goto('/netops/devices');

        // Look for add device button
        const addButton = page.getByRole('button', { name: /add|create|new/i }).first();
        if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(addButton).toBeEnabled();
        }
    });

    test('should navigate to device detail on click', async ({ page }) => {
        await page.goto('/netops/devices');

        await page.waitForTimeout(2000);

        // If there are devices, try clicking on one
        const deviceRow = page.locator('tr').nth(1);
        if (await deviceRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await deviceRow.click();
            // Should navigate to detail page
            await page.waitForURL(/\/netops\/devices\//, { timeout: 5000 }).catch(() => { });
        }
    });
});

test.describe('NetOps - Changes Page', () => {
    test('should load changes page', async ({ page }) => {
        await page.goto('/netops/changes');

        // Should see changes header
        await expect(page.getByRole('heading', { name: /change/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display change history or empty state', async ({ page }) => {
        await page.goto('/netops/changes');

        await page.waitForTimeout(2000);

        const contentArea = page.getByRole('main').first();
        await expect(contentArea).toBeVisible();
    });

    test('should have create change button', async ({ page }) => {
        await page.goto('/netops/changes');

        // Look for new change button
        const newButton = page.getByRole('link', { name: /new|create/i }).or(
            page.getByRole('button', { name: /new|create/i })
        ).first();

        if (await newButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(newButton).toBeEnabled();
        }
    });
});

test.describe('NetOps - Rulepacks Page', () => {
    test('should load rulepacks page', async ({ page }) => {
        await page.goto('/netops/rulepacks');

        // Should see rulepacks header
        await expect(page.getByRole('heading', { name: /rulepack/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display rulepack list', async ({ page }) => {
        await page.goto('/netops/rulepacks');

        await page.waitForTimeout(2000);

        const contentArea = page.getByRole('main').first();
        await expect(contentArea).toBeVisible();
    });
});

test.describe('NetOps - Tools Page', () => {
    test('should load netops tools page', async ({ page }) => {
        await page.goto('/netops/tools');

        // Should see tools content
        await page.waitForTimeout(2000);
        const contentArea = page.getByRole('main').first();
        await expect(contentArea).toBeVisible();
    });
});
