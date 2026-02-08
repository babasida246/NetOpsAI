import { test, expect } from '@playwright/test';

test.describe('Assets Catalogs - DELETE Bug Verification', () => {
    // Slow down tests to avoid rate limiting
    test.describe.configure({ mode: 'serial' });

    test('Category DELETE - Verify deletion works or fails', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');

        const categoryName = `BUG_TEST_${Date.now()}`;

        // Wait for form to be visible
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await expect(categoryInput).toBeVisible({ timeout: 5000 });

        // CREATE category
        await categoryInput.fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        // Verify it was created
        await expect(page.getByRole('cell', { name: categoryName })).toBeVisible({ timeout: 10000 });

        // Count initial rows
        const initialRows = await page.locator('tbody tr').count();
        console.log(`Initial row count: ${initialRows}`);

        // Set up dialog handler and click simultaneously
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);

        // Accept any dialog that appears
        page.on('dialog', async dialog => {
            console.log(`Dialog message: "${dialog.message()}"`);
            await dialog.accept();
        });

        // Click DELETE button (3rd button in the category row)
        await categoryRow.locator('button').nth(2).click();

        // Wait for network request to complete
        await page.waitForTimeout(2000);

        // Check if category still exists
        const finalRows = await page.locator('tbody tr').count();
        console.log(`Final row count: ${finalRows}`);

        const categoryStillExists = await page.getByRole('cell', { name: categoryName }).isVisible({ timeout: 1000 }).catch(() => false);

        if (categoryStillExists) {
            console.error('BUG CONFIRMED: Category was NOT deleted!');
            throw new Error(`DELETE BUG: Category "${categoryName}" still exists after delete operation`);
        } else {
            console.log('SUCCESS: Category was deleted');
        }
    });

    test('Vendor DELETE - Verify deletion works or fails', async ({ page }) => {
        // Wait before starting to avoid rate limit
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Vendors' }).click();

        const vendorName = `BUG_VENDOR_${Date.now()}`;

        // Wait for form to be visible
        const vendorInput = page.locator('label:has-text("Vendor name")').locator('..').locator('input');
        await expect(vendorInput).toBeVisible({ timeout: 5000 });

        // CREATE vendor
        await vendorInput.fill(vendorName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        // Verify it was created
        await expect(page.getByRole('cell', { name: vendorName, exact: true })).toBeVisible({ timeout: 10000 });

        // Accept any dialog that appears
        page.on('dialog', async dialog => {
            console.log(`Dialog: "${dialog.message()}"`);
            await dialog.accept();
        });

        // Click DELETE button (2nd button for vendors)
        const vendorRow = page.locator(`tr:has-text("${vendorName}")`).first();
        await vendorRow.locator('button').nth(1).click();

        await page.waitForTimeout(2000);

        // Check if vendor still exists
        const vendorStillExists = await page.getByRole('cell', { name: vendorName, exact: true }).isVisible({ timeout: 1000 }).catch(() => false);

        if (vendorStillExists) {
            console.error('BUG CONFIRMED: Vendor was NOT deleted!');
            throw new Error(`DELETE BUG: Vendor "${vendorName}" still exists after delete operation`);
        } else {
            console.log('SUCCESS: Vendor was deleted');
        }
    });
});
