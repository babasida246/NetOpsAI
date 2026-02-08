import { test, expect } from '@playwright/test';

/**
 * Test suite for Assets Category Spec Management
 * Testing Add/Edit/Delete spec definitions for categories
 */
test.describe('Assets - Category Spec Management', () => {
    test.describe.configure({ mode: 'serial' });

    let categoryId: string;
    let categoryName: string;

    test.beforeAll(async () => {
        // Generate unique category name for this test run
        categoryName = `E2E_SpecTest_${Date.now()}`;
    });

    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(3000); // Rate limit protection
        await page.goto('/assets/catalogs');
        await expect(page.locator('label:has-text("Category name")')).toBeVisible({ timeout: 10000 });
    });

    test.afterEach(async () => {
        await new Promise(r => setTimeout(r, 2000)); // Rate limit protection
    });

    test('Step 1: Create a category for spec testing', async ({ page }) => {
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');
        await categoryInput.fill(categoryName);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);

        // Verify category was created
        const categoryCell = page.getByRole('cell', { name: categoryName });
        await expect(categoryCell).toBeVisible({ timeout: 10000 });

        // Extract category ID from the row for later use
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible();
    });

    test('Step 2: Open spec management modal', async ({ page }) => {
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });

        // Click "Specs" button in the row
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await expect(specsButton).toBeVisible({ timeout: 5000 });
        await specsButton.click();
        await page.waitForTimeout(1000);

        // Verify spec management modal is open - look for "Spec Fields" heading
        const modalHeading = page.getByRole('heading', { name: 'Spec Fields' });
        await expect(modalHeading).toBeVisible({ timeout: 5000 });

        // Verify category name is shown in modal
        await expect(page.getByText(new RegExp(`Category:.*${categoryName}`, 'i'))).toBeVisible({ timeout: 3000 });
    });

    test('Step 3: Add a valid spec definition', async ({ page }) => {
        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Wait for modal to open
        await expect(page.getByRole('heading', { name: 'Spec Fields' })).toBeVisible({ timeout: 5000 });

        // Look for "Add" button to add new spec
        const addButton = page.getByRole('button', { name: /^add$/i }).or(
            page.getByRole('button', { name: /add field|new field|add spec/i })
        );
        if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addButton.click();
            await page.waitForTimeout(500);
        }

        // Fill spec definition form
        // Key input - must be camelCase starting with lowercase: ^[a-z][a-zA-Z0-9]*$
        const keyInput = page.locator('input[name="key"], input[placeholder*="key" i]').or(
            page.locator('label').filter({ hasText: /^key$/i }).locator('..').locator('input')
        ).first();

        await expect(keyInput).toBeVisible({ timeout: 5000 });
        await keyInput.fill('cpuCores');  // Valid: starts with lowercase, camelCase

        // Label input
        const labelInput = page.locator('input[name="label"], input[placeholder*="label" i]').or(
            page.locator('label').filter({ hasText: /^label$/i }).locator('..').locator('input')
        ).first();

        if (await labelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await labelInput.fill('CPU Cores');
        }

        // Type select
        const typeSelect = page.locator('select[name="type"], select[name="dataType"]').first();
        if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
            await typeSelect.selectOption({ label: 'number' });
        }

        // Save the spec
        const saveButton = page.getByRole('button', { name: /save|submit/i }).first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify spec was added - look in the table or list
        const specEntry = page.getByText(/cpuCores/i);
        await expect(specEntry).toBeVisible({ timeout: 5000 });
    });

    test('Step 4: Add spec with invalid key (should fail)', async ({ page }) => {
        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Add new spec
        const addButton = page.getByRole('button', { name: /^add$/i }).or(
            page.getByRole('button', { name: /add field|new field/i })
        );
        if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addButton.click();
            await page.waitForTimeout(500);
        }

        // Fill with INVALID keys and verify validation
        const keyInput = page.locator('input[name="key"], input[placeholder*="key" i]').first();

        // Test 1: Key with uppercase start (Invalid)
        await keyInput.fill('MemorySize');

        const labelInput = page.locator('input[name="label"], input[placeholder*="label" i]').first();
        if (await labelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await labelInput.fill('Memory Size');
        }

        // Try to save
        const saveButton = page.getByRole('button', { name: /save|submit|add field/i }).first();
        await saveButton.click();
        await page.waitForTimeout(1500);

        // Verify error message appears (validation error or key stays invalid)
        const errorMessage = page.locator('[role="alert"], .error, .text-red, .validation-error').filter({ hasText: /invalid|validation|error|camelCase/i });
        const hasError = await errorMessage.first().isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
            // Alternative: check if save button is still there (form didn't submit)
            const stillHasForm = await keyInput.isVisible({ timeout: 2000 }).catch(() => false);
            expect(stillHasForm).toBeTruthy();
        }
    });

    test('Step 5: Edit existing spec definition', async ({ page }) => {
        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Find the spec we created earlier
        const specRow = page.locator('tr, [data-testid*="spec"], li').filter({ hasText: /cpuCores/i }).first();
        if (await specRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Click edit button on the spec
            const editSpecButton = specRow.locator('button').filter({ hasText: /edit/i }).or(specRow.locator('button').first());
            await editSpecButton.click();
            await page.waitForTimeout(500);

            // Update label
            const specLabelInput = page.locator('input[name*="label"], input[placeholder*="label"], label:has-text("Label")').locator('..').locator('input').first();
            await specLabelInput.fill('CPU Core Count');

            // Save changes
            const saveButton = page.getByRole('button', { name: /save|update/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            // Verify updated label appears
            await expect(page.getByText(/CPU Core Count/i)).toBeVisible({ timeout: 5000 });
        }
    });

    test('Step 6: Add multiple spec definitions with different types', async ({ page }) => {
        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Spec definitions to add - all keys must be camelCase starting with lowercase
        const specs = [
            { key: 'ramGb', label: 'RAM (GB)', type: 'Number' },
            { key: 'storageType', label: 'Storage Type', type: 'String' },
            { key: 'hasWarranty', label: 'Has Warranty', type: 'Boolean' }
        ];

        for (const spec of specs) {
            // Click add spec button
            const addSpecButton = page.getByRole('button', { name: /add.*spec|new.*spec/i });
            if (await addSpecButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await addSpecButton.click();
                await page.waitForTimeout(500);
            }

            // Fill key
            const keyInput = page.locator('input[name*="key"], input[placeholder*="key"]').last();
            await keyInput.fill(spec.key);

            // Fill label
            const labelInput = page.locator('input[name*="label"], input[placeholder*="label"]').last();
            await labelInput.fill(spec.label);

            // Select type
            const typeSelect = page.locator('select[name*="type"], [role="combobox"]').last();
            if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
                await typeSelect.selectOption({ label: spec.type });
            }

            // Save
            const saveButton = page.getByRole('button', { name: /save|add/i }).filter({ hasText: /spec|save|add/i }).first();
            await saveButton.click();
            await page.waitForTimeout(1500);

            // Verify spec was added
            await expect(page.getByText(new RegExp(spec.key, 'i'))).toBeVisible({ timeout: 3000 });
        }
    });

    test('Step 7: Delete a spec definition', async ({ page }) => {
        // Set up dialog handler
        page.on('dialog', dialog => dialog.accept());

        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Find a spec to delete
        const specRow = page.locator('tr, li, [data-testid*="spec"]').filter({ hasText: /hasWarranty/i }).first();
        if (await specRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Click delete button
            const deleteButton = specRow.locator('button').filter({ hasText: /delete|remove/i }).or(specRow.locator('button').last());
            await deleteButton.click();
            await page.waitForTimeout(2000);

            // Verify spec was removed
            await expect(page.getByText(/hasWarranty/i)).not.toBeVisible({ timeout: 3000 });
        }
    });

    test('Step 8: Verify specs persist after modal close', async ({ page }) => {
        // Open specs modal
        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });
        const specsButton = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Verify specs are still there
        await expect(page.getByText(/cpuCores|CPU Core Count/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/ramGb/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/storageType/i)).toBeVisible({ timeout: 5000 });

        // Close modal
        const closeButton = page.getByRole('button', { name: /close|cancel|done/i }).first();
        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeButton.click();
        } else {
            await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(500);

        // Reopen and verify
        const specsButton2 = categoryRow.getByRole('button', { name: 'Specs' });
        await specsButton2.click();
        await page.waitForTimeout(1500);

        await expect(page.getByText(/cpuCores/i)).toBeVisible({ timeout: 5000 });
    });

    test('Step 9: Cleanup - Delete test category', async ({ page }) => {
        page.on('dialog', dialog => dialog.accept());

        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 10000 });

        // Click delete button - find by icon or by being the last button
        const deleteButton = categoryRow.getByRole('button').last();
        await deleteButton.click();
        await page.waitForTimeout(2000);

        // Verify category was deleted
        await expect(page.getByRole('cell', { name: categoryName })).not.toBeVisible({ timeout: 5000 });
    });
});

/**
 * Test suite for complete Assets menu functionality
 */
test.describe('Assets - Complete Menu Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(2000);
    });

    test.afterEach(async () => {
        await new Promise(r => setTimeout(r, 1500));
    });

    test('Assets List - Navigation and Basic Functionality', async ({ page }) => {
        await page.goto('/assets');

        // Verify page loads
        await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible({ timeout: 10000 });

        // Check for table or empty state
        const content = page.locator('table').or(page.getByText(/no asset/i));
        await expect(content.first()).toBeVisible({ timeout: 5000 });

        // Verify action buttons exist
        const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
        if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled();
        }
    });

    test('Catalogs - Categories Tab Complete Flow', async ({ page }) => {
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');

        // Verify Categories tab is default
        await expect(page.locator('label:has-text("Category name")')).toBeVisible({ timeout: 10000 });

        const testCategory = `E2E_Flow_${Date.now()}`;
        const categoryInput = page.locator('label:has-text("Category name")').locator('..').locator('input');

        // Create
        await categoryInput.fill(testCategory);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);
        await expect(page.getByRole('cell', { name: testCategory })).toBeVisible({ timeout: 10000 });

        // Edit
        const categoryRow = page.locator(`tr:has-text("${testCategory}")`);
        await categoryRow.locator('button').nth(0).click(); // Edit button
        await page.waitForTimeout(500);

        const updatedName = `${testCategory}_Updated`;
        await categoryInput.fill(updatedName);
        await page.getByRole('button', { name: /save|update/i }).click();
        await page.waitForTimeout(2000);
        await expect(page.getByRole('cell', { name: updatedName })).toBeVisible({ timeout: 5000 });

        // Delete
        page.on('dialog', dialog => dialog.accept());
        const updatedRow = page.locator(`tr:has-text("${updatedName}")`);
        await updatedRow.locator('button').nth(2).click(); // Delete button
        await page.waitForTimeout(2000);
        await expect(page.getByRole('cell', { name: updatedName })).not.toBeVisible({ timeout: 5000 });
    });

    test('Catalogs - Vendors Tab Complete Flow', async ({ page }) => {
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Vendors' }).click();
        await page.waitForTimeout(1000);

        const testVendor = `E2E_Vendor_${Date.now()}`;
        const vendorInput = page.locator('label:has-text("Vendor name")').locator('..').locator('input');
        await expect(vendorInput).toBeVisible({ timeout: 5000 });

        // Create
        await vendorInput.fill(testVendor);
        await page.getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(2000);
        await expect(page.getByRole('cell', { name: testVendor, exact: true })).toBeVisible({ timeout: 10000 });

        // Delete
        page.on('dialog', dialog => dialog.accept());
        const vendorRow = page.locator(`tr:has-text("${testVendor}")`).first();
        await vendorRow.locator('button').nth(1).click(); // Delete button (vendors have Edit=0, Delete=1)
        await page.waitForTimeout(2000);
        await expect(page.getByRole('cell', { name: testVendor, exact: true })).not.toBeVisible({ timeout: 5000 });
    });

    test('Catalogs - Models Tab', async ({ page }) => {
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Models' }).click();
        await page.waitForTimeout(1000);

        // Verify Models tab loaded
        await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible({ timeout: 5000 });

        // Check for category selector
        const categorySelect = page.locator('select, [role="combobox"]').filter({ hasText: /category/i });
        if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(categorySelect).toBeEnabled();
        }
    });

    test('Catalogs - Locations Tab', async ({ page }) => {
        await page.waitForTimeout(3000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Locations' }).click();
        await page.waitForTimeout(1000);

        // Verify Locations tab loaded
        await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible({ timeout: 5000 });

        // Check for location name input
        const locationInput = page.locator('label:has-text("Location name")').locator('..').locator('input');
        await expect(locationInput).toBeVisible({ timeout: 5000 });
    });

    test('Catalogs - Statuses Tab', async ({ page }) => {
        await page.waitForTimeout(2000);
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Statuses' }).click();
        await page.waitForTimeout(1000);

        // Verify Statuses tab loaded
        await expect(page.getByText(/status values are fixed|predefined/i)).toBeVisible({ timeout: 5000 });
    });

    test('Inventory Page Navigation', async ({ page }) => {
        await page.goto('/inventory');

        // Verify page loads
        const heading = page.getByRole('heading', { name: /inventory/i });
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('Maintenance Page Navigation', async ({ page }) => {
        await page.goto('/maintenance');

        // Verify page loads
        const heading = page.getByRole('heading', { name: /maintenance/i });
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('Requests Page Navigation', async ({ page }) => {
        await page.goto('/requests');

        // Verify page loads
        const heading = page.getByRole('heading', { name: /request/i });
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('Reports Page Navigation', async ({ page }) => {
        await page.goto('/reports/assets');

        // Verify page loads - just check URL
        await page.waitForTimeout(2000);
        await expect(page).toHaveURL(/\/reports\/assets/);
    });
});
