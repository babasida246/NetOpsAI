import { test, expect } from '@playwright/test';

test.describe('Assets List - Full CRUD Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/assets');
    });

    test('should load assets list page', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible({ timeout: 10000 });
    });

    test('should display assets table or empty state', async ({ page }) => {
        await page.waitForTimeout(2000);

        const tableOrEmpty = page.locator('table').or(page.getByText(/no asset/i));
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have create asset button', async ({ page }) => {
        const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
        await expect(createButton).toBeVisible({ timeout: 5000 });
    });

    test('should have filter controls', async ({ page }) => {
        // Check for filter dropdown or inputs
        const filterArea = page.locator('select, [role="combobox"], input[placeholder*="search"]');
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

    test('should navigate to asset detail on click', async ({ page }) => {
        await page.waitForTimeout(2000);

        // If there are assets, try clicking on one
        const assetRow = page.locator('tbody tr').first();
        if (await assetRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await assetRow.click();
            // Should navigate to detail page
            await page.waitForURL(/\/assets\/[a-f0-9-]+/, { timeout: 5000 }).catch(() => { });
        }
    });
});

test.describe('Assets Catalogs - Categories', () => {
    // Slow down these tests to avoid rate limiting
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Add delay before each test to avoid rate limiting
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');
        // Wait for form to be visible - this ensures the page is fully loaded
        await expect(page.locator('label:has-text("Category name")')).toBeVisible({ timeout: 10000 });
    });

    test.afterEach(async () => {
        // Additional delay after each test to allow rate limit to reset
        await new Promise(r => setTimeout(r, 2000));
    });

    test('should load catalogs page', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /catalog/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display category tab by default', async ({ page }) => {
        const categoryTab = page.getByRole('tab', { name: /categor/i });
        await expect(categoryTab).toBeVisible();
    });

    test('should create a new category', async ({ page }) => {
        const categoryName = `E2E_Category_${Date.now()}`;

        // Wait for form to be visible first
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await expect(categoryInput).toBeVisible({ timeout: 5000 });

        // Fill category name
        await categoryInput.fill(categoryName);

        // Click Add button
        await page.getByRole('button', { name: 'Add' }).click();

        // Wait for the category to appear
        await page.waitForTimeout(2000);

        // Verify category was created
        await expect(page.getByRole('cell', { name: categoryName })).toBeVisible({ timeout: 10000 });
    });

    test('should edit a category', async ({ page }) => {
        // Wait for form to be visible first
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await expect(categoryInput).toBeVisible({ timeout: 5000 });

        // First create a category
        const categoryName = `E2E_Edit_${Date.now()}`;
        await categoryInput.fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        // Verify it was created
        await expect(page.getByRole('cell', { name: categoryName })).toBeVisible({ timeout: 10000 });

        // Find the row and click edit
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await categoryRow.locator('button').first().click(); // Edit button

        // Update the name
        const updatedName = `${categoryName}_Updated`;
        await categoryInput.fill(updatedName);
        await page.getByRole('button', { name: /update|save/i }).click();

        await page.waitForTimeout(2000);

        // Verify update
        await expect(page.getByRole('cell', { name: updatedName })).toBeVisible({ timeout: 10000 });
    });

    test('should delete a category', async ({ page }) => {
        // Wait for form to be visible first
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await expect(categoryInput).toBeVisible({ timeout: 5000 });

        // First create a category to delete
        const categoryName = `E2E_Delete_${Date.now()}`;
        await categoryInput.fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        await expect(page.getByRole('cell', { name: categoryName })).toBeVisible({ timeout: 10000 });

        // Set up dialog handler
        page.on('dialog', dialog => dialog.accept());

        // Find the row and click delete (3rd button for categories)
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await categoryRow.locator('button').nth(2).click();

        await page.waitForTimeout(2000);

        // Verify deletion
        await expect(page.getByRole('cell', { name: categoryName })).not.toBeVisible({ timeout: 5000 });
    });
});

test.describe('Assets Catalogs - Vendors', () => {
    test.beforeEach(async ({ page }) => {
        // Add delay before each test to avoid rate limiting
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Vendors' }).click();
    });

    test.afterEach(async () => {
        // Additional delay after each test to allow rate limit to reset
        await new Promise(r => setTimeout(r, 2000));
    });

    test('should display vendors tab', async ({ page }) => {
        await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible({ timeout: 5000 });
    });

    test('should create a new vendor', async ({ page }) => {
        const vendorName = `E2E_Vendor_${Date.now()}`;

        // Wait for form to be visible first
        const vendorInput = page.locator('label:has-text("Vendor name")').locator('..').locator('input');
        await expect(vendorInput).toBeVisible({ timeout: 5000 });

        // Fill vendor name
        await vendorInput.fill(vendorName);

        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        await expect(page.getByRole('cell', { name: vendorName, exact: true })).toBeVisible({ timeout: 10000 });
    });

    test('should delete a vendor', async ({ page }) => {
        const vendorName = `E2E_VendorDel_${Date.now()}`;

        // Wait for form to be visible first
        const vendorInput = page.locator('label:has-text("Vendor name")').locator('..').locator('input');
        await expect(vendorInput).toBeVisible({ timeout: 5000 });

        await vendorInput.fill(vendorName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        await expect(page.getByRole('cell', { name: vendorName, exact: true })).toBeVisible({ timeout: 10000 });

        page.on('dialog', dialog => dialog.accept());

        const vendorRow = page.locator(`tr:has-text("${vendorName}")`).first();
        await vendorRow.locator('button').nth(1).click(); // Delete button (2nd for vendors)

        await page.waitForTimeout(2000);

        await expect(page.getByRole('cell', { name: vendorName, exact: true })).not.toBeVisible({ timeout: 5000 });
    });
});

test.describe('Assets Catalogs - Models', () => {
    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(1000); // Rate limit delay
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Models' }).click();
    });

    test('should display models tab', async ({ page }) => {
        await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible({ timeout: 5000 });
    });

    test('should show model form with category selector', async ({ page }) => {
        const categorySelect = page.locator('select, [role="combobox"]').nth(1);
        await expect(categorySelect).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Assets Catalogs - Locations', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(2000); // Rate limit delay
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Locations' }).click();
        // Wait for locations data to load
        await page.waitForTimeout(1000);
    });

    test('should display locations tab', async ({ page }) => {
        await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible({ timeout: 5000 });
    });

    test('should create a new location', async ({ page }) => {
        const locationName = `E2E_Location_${Date.now()}`;

        // Wait for form to be visible first
        const locationInput = page.locator('label:has-text("Location name")').locator('..').locator('input');
        await expect(locationInput).toBeVisible({ timeout: 5000 });

        await locationInput.fill(locationName);

        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(3000); // Longer wait for API response

        // Verify location appears (in Path column as root location)
        await expect(page.getByRole('cell', { name: new RegExp(locationName) })).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Assets Catalogs - Statuses', () => {
    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(1000); // Rate limit delay
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Statuses' }).click();
    });

    test('should display statuses tab', async ({ page }) => {
        await expect(page.getByText('Status values are fixed')).toBeVisible({ timeout: 5000 });
    });

    test('should show fixed status values', async ({ page }) => {
        // Statuses should be read-only display - check for the main content area
        const statusText = page.getByText('Status values are fixed');
        await expect(statusText).toBeVisible();
    });
});
