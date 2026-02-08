import { test, expect } from '@playwright/test';

test.describe('Asset Catalogs - Comprehensive Simple Tests', () => {

    const timestamp = Date.now();
    const testData = {
        category: {
            name: `E2E_Category_${timestamp}`,
        },
        vendor: {
            name: `E2E_Vendor_${timestamp}`,
        },
        model: {
            name: `E2E_Model_${timestamp}`,
        },
    };

    test.describe.serial('Core Features', () => {
        test('1. Create category', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await expect(page.getByRole('heading', { name: 'Asset Catalogs' })).toBeVisible();

            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            // Find input field and add category
            const inputs = page.locator('input[type="text"]');
            await inputs.first().fill(testData.category.name);

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            // Verify added
            await expect(page.locator(`text=${testData.category.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('2. Verify category is listed', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            await expect(page.locator(`text=${testData.category.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('3. Create vendor', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Vendors' }).click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="text"]');
            const firstInput = inputs.first();
            await firstInput.fill(testData.vendor.name);

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            await expect(page.locator(`text=${testData.vendor.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('4. Create model', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Models' }).click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="text"]');
            const count = await inputs.count();

            if (count >= 2) {
                await inputs.nth(0).fill(testData.model.name);
                await inputs.nth(1).fill('TestBrand');
            }

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(2000);

            await expect(page.locator(`text=${testData.model.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('5. Cleanup - Delete model', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Models' }).click();
            await page.waitForTimeout(500);

            const modelRow = page.locator(`tr:has-text("${testData.model.name}")`);
            const deleteButton = modelRow.locator('button').last();
            await deleteButton.click();
            await page.waitForTimeout(500);

            // Confirm if dialog appears
            const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
                await page.waitForTimeout(1500);
            }
        });

        test('6. Cleanup - Delete vendor', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Vendors' }).click();
            await page.waitForTimeout(500);

            const vendorRow = page.locator(`tr:has-text("${testData.vendor.name}")`);
            const deleteButton = vendorRow.locator('button').last();
            await deleteButton.click();
            await page.waitForTimeout(500);

            const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
                await page.waitForTimeout(1500);
            }
        });

        test('7. Cleanup - Delete category', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            const categoryRow = page.locator(`tr:has-text("${testData.category.name}")`);
            const deleteButton = categoryRow.locator('button').last();
            await deleteButton.click();
            await page.waitForTimeout(500);

            const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
                await page.waitForTimeout(1500);
            }
        });
    });
});
