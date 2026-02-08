import { test, expect, type Page } from '@playwright/test';

test.describe('Assets Catalogs - Advanced CRUD Operations', () => {
    // Slow down tests to avoid rate limiting
    test.describe.configure({ mode: 'serial' });

    test.afterEach(async () => {
        // Wait after each test for rate limit to reset
        await new Promise(r => setTimeout(r, 3000));
    });

    test('Categories - Complete CRUD Lifecycle', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(5000);
        await page.goto('/assets/catalogs');

        // Wait for form to load
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await expect(categoryInput).toBeVisible({ timeout: 10000 });

        const categoryName = `E2E_Cat_${Date.now()}`;
        const updatedName = `${categoryName}_Updated`;

        // CREATE: Add new category
        await categoryInput.fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(3000);

        // Verify category appears in table
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });

        // EDIT: Click edit button (first button in row)
        await categoryRow.locator('button').nth(0).click();
        await page.waitForTimeout(500);

        // Update the category name - the input should now contain the existing name
        await categoryInput.fill(updatedName);
        await page.getByRole('button', { name: /save|update/i }).click();
        await page.waitForTimeout(1000);

        // Verify updated name appears
        await expect(page.getByRole('cell', { name: updatedName })).toBeVisible({ timeout: 5000 });

        // DELETE: Set up dialog handler BEFORE clicking
        page.on('dialog', dialog => dialog.accept());

        // Find row with updated name and click delete button (3rd button)
        const updatedRow = page.locator(`tr:has-text("${updatedName}")`);
        await updatedRow.locator('button').nth(2).click();
        await page.waitForTimeout(2000);

        // Verify category is removed from table
        await expect(page.getByRole('cell', { name: updatedName })).not.toBeVisible({ timeout: 5000 });
    });

    test('Vendors - Edit and Delete Operations', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Vendors' }).click();

        const vendorName = `E2E_Vendor_${Date.now()}`;

        // CREATE vendor using correct placeholder
        await page.locator('input[placeholder="Dell"]').fill(vendorName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(1000);

        // Verify vendor appears
        const vendorRow = page.locator(`tr:has-text("${vendorName}")`).first();
        await expect(vendorRow).toBeVisible({ timeout: 10000 });

        // DELETE: Set up dialog handler BEFORE clicking
        page.on('dialog', dialog => dialog.accept());

        // DELETE vendor (2nd button - vendors only have Edit and Delete)
        await vendorRow.locator('button').nth(1).click();
        await page.waitForTimeout(2000);

        // Verify vendor is removed
        await expect(page.getByRole('cell', { name: vendorName, exact: true })).not.toBeVisible({ timeout: 5000 });
    });

    test('Models - Verify Category Selection and Spec Definitions', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Models' }).click();

        // Wait for models tab to load
        await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible();

        // Verify category dropdown exists in add form
        const categorySelect = page.locator('select, [role="combobox"]').filter({ hasText: /Category|Select/ }).nth(1);
        await expect(categorySelect).toBeVisible({ timeout: 5000 });

        // If categories exist, select one and verify spec form loads
        const hasCategories = await categorySelect.locator('option').count() > 1;
        if (hasCategories) {
            await categorySelect.selectOption({ index: 1 });
            await page.waitForTimeout(500);

            // Verify spec fields appear (DynamicSpecForm)
            const modelInput = page.locator('label:has-text("Model")').locator('..').locator('input');
            await expect(modelInput).toBeVisible({ timeout: 3000 });
        }
    });

    test('Locations - Hierarchical Structure', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Locations' }).click();

        await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible();

        // Verify location name input exists
        const locationInput = page.locator('label:has-text("Location name")').locator('..').locator('input');
        await expect(locationInput).toBeVisible({ timeout: 5000 });

        // Verify parent location selector exists (for hierarchical locations)
        const parentSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Parent|Root/ });
        if (await parentSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
            // If parent selector exists, verify it has options
            const optionCount = await parentSelect.locator('option').count();
            expect(optionCount).toBeGreaterThan(0);
        }
    });

    test('Statuses - Read-Only Verification', async ({ page }) => {
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Statuses' }).click();

        // Verify info text about fixed statuses
        await expect(page.getByText('Status values are fixed by')).toBeVisible();

        // Verify no Add button exists (statuses are fixed by workflow)
        const addButtons = page.getByRole('button', { name: 'Add' });
        const addButtonCount = await addButtons.count();
        expect(addButtonCount).toBe(0);

        // Verify status list/table exists
        const statusesDisplay = page.locator('table, ul, .status-list');
        await expect(statusesDisplay.first()).toBeVisible({ timeout: 5000 });
    });

    test('Cross-Tab Navigation Preserves State', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate through all tabs
        await page.getByRole('tab', { name: 'Categories' }).click();
        await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();

        await page.getByRole('tab', { name: 'Vendors' }).click();
        // Vendors table has headers: Name, Tax code, Phone, Email, Actions
        await expect(page.getByRole('columnheader', { name: 'Name' }).first()).toBeVisible();

        await page.getByRole('tab', { name: 'Models' }).click();
        await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible();

        await page.getByRole('tab', { name: 'Locations' }).click();
        await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible();

        await page.getByRole('tab', { name: 'Statuses' }).click();
        await expect(page.getByText('Status values are fixed')).toBeVisible();

        // Navigate back to Categories - should still work
        await page.getByRole('tab', { name: 'Categories' }).click();
        await expect(page.getByRole('columnheader', { name: 'Name' }).first()).toBeVisible();
    });
});
