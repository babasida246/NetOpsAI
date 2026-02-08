import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Test Suite for Asset Catalogs
 * Simplified version focusing on core CRUD operations
 */

test.describe('Asset Catalogs - Comprehensive Test Suite', () => {

    const timestamp = Date.now();
    const testData = {
        category: {
            name: `E2E_Category_${timestamp}`,
        },
        vendor: {
            name: `E2E_Vendor_${timestamp}`,
            taxCode: '1234567890',
            phone: '+1-800-555-0100',
        },
        model: {
            name: `E2E_Model_${timestamp}`,
            brand: 'TestBrand'
        },
        location: {
            parent: `E2E_Building_${timestamp}`,
            child: `E2E_Floor_1_${timestamp}`
        },
        status: {
            name: `E2E_Status_${timestamp}`
        }
    };

    test.describe.serial('Categories - Full Lifecycle', () => {
        test('1. Create category', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await expect(page.getByRole('heading', { name: 'Asset Catalogs' })).toBeVisible();

            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="text"]');
            await inputs.first().fill(testData.category.name);

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            await expect(page.locator(`text=${testData.category.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('2. Verify category exists', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            await expect(page.locator(`text=${testData.category.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('3. Edit category name', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            const categoryRow = page.locator(`tr:has-text("${testData.category.name}")`);
            const editButton = categoryRow.locator('button').first();
            await editButton.click();
            await page.waitForTimeout(500);

            const input = page.locator('input[type="text"]').first();
            const currentValue = await input.inputValue();
            await input.clear();
            await input.fill(`${currentValue}_Updated`);

            const updateButton = page.locator('button').filter({ hasText: /update|save/i }).first();
            await updateButton.click();
            await page.waitForTimeout(1500);

            testData.category.name = `${currentValue}_Updated`;
        });
    });

    test.describe.serial('Vendors - Full CRUD', () => {
        test('1. Create vendor', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Vendors' }).click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="text"]');
            const count = await inputs.count();

            if (count >= 1) {
                await inputs.nth(0).fill(testData.vendor.name);
            }
            if (count >= 2) {
                await inputs.nth(1).fill(testData.vendor.taxCode);
            }
            if (count >= 3) {
                await inputs.nth(2).fill(testData.vendor.phone);
            }

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            await expect(page.locator(`text=${testData.vendor.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('2. Edit vendor', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Vendors' }).click();
            await page.waitForTimeout(500);

            const vendorRow = page.locator(`tr:has-text("${testData.vendor.name}")`);
            const editButton = vendorRow.locator('button').nth(0);
            await editButton.click();
            await page.waitForTimeout(500);

            const phoneInput = page.locator('input[type="tel"], input[type="text"]').filter({ hasText: /\+/ }).or(page.locator('input').nth(2));
            if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await phoneInput.clear();
                await phoneInput.fill('+1-800-555-9999');
            }

            const updateButton = page.locator('button').filter({ hasText: /update|save/i }).first();
            await updateButton.click();
            await page.waitForTimeout(1500);
        });
    });

    test.describe.serial('Models - Full CRUD', () => {
        test('1. Create model', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Models' }).click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="text"]');
            const count = await inputs.count();

            if (count >= 1) {
                await inputs.nth(0).fill(testData.model.name);
            }
            if (count >= 2) {
                await inputs.nth(1).fill(testData.model.brand);
            }

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(2000);

            await expect(page.locator(`text=${testData.model.name}`).first()).toBeVisible({ timeout: 5000 });
        });

        test('2. Edit model', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Models' }).click();
            await page.waitForTimeout(500);

            const modelRow = page.locator(`tr:has-text("${testData.model.name}")`);
            const editButton = modelRow.locator('button').nth(0);
            await editButton.click();
            await page.waitForTimeout(500);

            const input = page.locator('input[type="text"]').nth(1);
            await input.clear();
            await input.fill('UpdatedBrand');

            const updateButton = page.locator('button').filter({ hasText: /update|save/i }).first();
            await updateButton.click();
            await page.waitForTimeout(1500);
        });
    });

    test.describe('Locations - Hierarchical CRUD', () => {
        test('1. Create parent location', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Locations' }).click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);

            const inputs = page.locator('input[type="text"]');
            await expect(inputs.first()).toBeVisible({ timeout: 5000 });
            await inputs.first().fill(testData.location.parent);

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            await expect(page.getByRole('cell', { name: testData.location.parent, exact: true })).toBeVisible({ timeout: 5000 });
        });

        test('2. Create child location', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Locations' }).click();
            await page.waitForTimeout(800);

            const inputs = page.locator('input[type="text"]');
            await expect(inputs.first()).toBeVisible({ timeout: 5000 });
            await inputs.first().fill(testData.location.child);

            const select = page.locator('select').first();
            const count = await select.count();
            if (count > 0) {
                await select.selectOption({ label: testData.location.parent });
            }

            const addButton = page.locator('button').filter({ hasText: /add/i }).first();
            await addButton.click();
            await page.waitForTimeout(1500);

            await expect(page.getByRole('cell', { name: testData.location.child, exact: true })).toBeVisible({ timeout: 5000 });
        });

        test('3. Edit location', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Locations' }).click();
            await page.waitForTimeout(800);

            const locationRow = page.locator(`tr:has-text("${testData.location.child}")`);
            const editButton = locationRow.locator('button').first();
            await editButton.click();
            await page.waitForTimeout(500);

            const input = page.locator('input[type="text"]').first();
            await input.clear();
            await input.fill(`${testData.location.child}_Updated`);

            const updateButton = page.locator('button').filter({ hasText: /update|save/i }).first();
            await updateButton.click();
            await page.waitForTimeout(1500);

            testData.location.child = `${testData.location.child}_Updated`;
        });
    });

    test.describe('Statuses - Read-only', () => {
        test('1. Status values are fixed', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Statuses' }).click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);

            await expect(page.getByText('Status values are fixed')).toBeVisible({ timeout: 5000 });
            await expect(page.getByRole('cell', { name: 'in_stock' })).toBeVisible({ timeout: 5000 });
            await expect(page.getByRole('cell', { name: 'in_use' })).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe.serial('Cleanup', () => {
        test('Delete locations', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Locations' }).click();
            await page.waitForTimeout(500);

            // Delete child first
            const childRow = page.locator(`tr:has-text("${testData.location.child}")`);
            if (await childRow.isVisible({ timeout: 2000 }).catch(() => false)) {
                const deleteButton = childRow.locator('button').last();
                await deleteButton.click();
                await page.waitForTimeout(500);

                const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
                if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(1500);
                }
            }

            // Delete parent
            const parentRow = page.locator(`tr:has-text("${testData.location.parent}")`);
            if (await parentRow.isVisible({ timeout: 2000 }).catch(() => false)) {
                const deleteButton = parentRow.locator('button').last();
                await deleteButton.click();
                await page.waitForTimeout(500);

                const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
                if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(1500);
                }
            }
        });

        test('Delete model', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Models' }).click();
            await page.waitForTimeout(500);

            const modelRow = page.locator(`tr:has-text("${testData.model.name}")`);
            if (await modelRow.isVisible({ timeout: 2000 }).catch(() => false)) {
                const deleteButton = modelRow.locator('button').last();
                await deleteButton.click();
                await page.waitForTimeout(500);

                const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
                if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(1500);
                }
            }
        });

        test('Delete vendor', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Vendors' }).click();
            await page.waitForTimeout(500);

            const vendorRow = page.locator(`tr:has-text("${testData.vendor.name}")`);
            if (await vendorRow.isVisible({ timeout: 2000 }).catch(() => false)) {
                const deleteButton = vendorRow.locator('button').last();
                await deleteButton.click();
                await page.waitForTimeout(500);

                const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
                if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(1500);
                }
            }
        });

        test('Delete category', async ({ page }) => {
            await page.goto('/assets/catalogs');
            await page.getByRole('tab', { name: 'Categories' }).click();
            await page.waitForTimeout(500);

            const categoryRow = page.locator(`tr:has-text("${testData.category.name}")`);
            if (await categoryRow.isVisible({ timeout: 2000 }).catch(() => false)) {
                const deleteButton = categoryRow.locator('button').last();
                await deleteButton.click();
                await page.waitForTimeout(500);

                const confirmButton = page.locator('button').filter({ hasText: /yes|confirm|delete/i }).first();
                if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(1500);
                }
            }
        });
    });
});
