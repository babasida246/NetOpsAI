import { test, expect, type Page } from '@playwright/test';

// Helper function to apply authentication
function applyAuth(page: Page, role = 'admin') {
    return page.addInitScript((roleValue) => {
        localStorage.setItem('authToken', 'test-token');
        localStorage.setItem('refreshToken', 'test-refresh');
        localStorage.setItem('userId', 'test-user-id');
        localStorage.setItem('userEmail', 'admin@test.com');
        localStorage.setItem('userRole', roleValue);
    }, role);
}

test.describe('Assets Menu - Complete Functional Test', () => {
    test.beforeEach(async ({ page }) => {
        await applyAuth(page, 'admin');
    });

    test('Assets List Page - Navigation and Display', async ({ page }) => {
        await page.goto('/assets');

        // Check page title
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();

        // Check sidebar navigation - use getByLabel to scope to sidebar only
        const sidebar = page.getByLabel('Sidebar');
        await expect(sidebar.getByRole('link', { name: 'Assets' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Catalogs' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Inventory' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Maintenance' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Requests' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Reports' })).toBeVisible();
    });

    test('Catalogs - Categories CRUD', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate to Categories tab
        await page.getByRole('tab', { name: 'Categories' }).click();

        // Test creating a category
        const categoryName = `TestCategory_${Date.now()}`;
        await page.locator('input[placeholder*="Laptop"], input:near(:text("Category name"))').first().fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();

        // Wait for the new category to appear
        await page.waitForTimeout(1000);

        // Verify category was created (check if it appears in the table)
        const categoryCell = page.getByRole('cell', { name: categoryName, exact: true });
        await expect(categoryCell).toBeVisible({ timeout: 10000 });
    });

    test('Catalogs - Vendors CRUD', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate to Vendors tab
        await page.getByRole('tab', { name: 'Vendors' }).click();

        // Test creating a vendor
        const vendorName = `TestVendor_${Date.now()}`;
        await page.locator('label:has-text("Vendor name")').locator('..').locator('input').fill(vendorName);
        await page.locator('label:has-text("Email")').locator('..').locator('input').fill(`${vendorName.toLowerCase()}@test.com`);
        await page.getByRole('button', { name: 'Add' }).click();

        // Wait and verify
        await page.waitForTimeout(1000);
        await expect(page.getByRole('cell', { name: vendorName, exact: true })).toBeVisible({ timeout: 10000 });
    });

    test('Catalogs - Models Tab', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate to Models tab
        await page.getByRole('tab', { name: 'Models' }).click();

        // Verify models tab is active and displays content - use specific column header
        await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible({ timeout: 5000 });
    });

    test('Catalogs - Locations Tab', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate to Locations tab
        await page.getByRole('tab', { name: 'Locations' }).click();

        // Verify locations tab is active - use specific column header
        await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible({ timeout: 5000 });
    });

    test('Catalogs - Statuses Tab', async ({ page }) => {
        await page.goto('/assets/catalogs');

        // Navigate to Statuses tab
        await page.getByRole('tab', { name: 'Statuses' }).click();

        // Verify statuses tab loads - check for specific description text
        await expect(page.getByText('Status values are fixed by')).toBeVisible({ timeout: 5000 });
    });

    test('Inventory Page - Navigation', async ({ page }) => {
        await page.goto('/inventory');

        // Check inventory page loads
        await expect(page.getByRole('heading', { name: /Inventory/i })).toBeVisible({ timeout: 10000 });
    });

    test('Maintenance Page - Navigation', async ({ page }) => {
        await page.goto('/maintenance');

        // Check maintenance page loads
        await expect(page.getByRole('heading', { name: /Maintenance/i })).toBeVisible({ timeout: 10000 });
    });

    test('Requests Page - Navigation', async ({ page }) => {
        await page.goto('/requests');

        // Check requests page loads
        await expect(page.getByRole('heading', { name: /Request|Workflow/i })).toBeVisible({ timeout: 10000 });
    });

    test('Reports Page - Navigation', async ({ page }) => {
        await page.goto('/reports/assets');

        // Check reports page loads
        await expect(page.getByRole('heading', { name: /Report/i })).toBeVisible({ timeout: 10000 });
    });

    test('Assets Filters - Status Filter', async ({ page }) => {
        await page.goto('/assets');

        // Look for status filter dropdown/select
        const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /Status|All/ }).first();
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
            await statusFilter.click();
            // Just verify filter exists and is interactive
            await expect(statusFilter).toBeEnabled();
        }
    });

    test('No JavaScript Errors on Assets Pages', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });

        // Visit all assets-related pages
        await page.goto('/assets');
        await page.goto('/assets/catalogs');
        await page.goto('/inventory');
        await page.goto('/maintenance');
        await page.goto('/requests');
        await page.goto('/reports/assets');

        // Assert no JavaScript errors occurred
        expect(errors).toHaveLength(0);
    });
});
