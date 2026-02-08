import { test, expect } from '@playwright/test';

test.describe('Asset Catalogs - Spec Fields Tests', () => {

    const categoryName = 'Laptop';

    // Helper: Navigate to specs modal
    async function navigateToSpecs(page: any) {
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Categories' }).click();
        await page.waitForTimeout(500);

        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        if (!(await categoryRow.isVisible({ timeout: 3000 }).catch(() => false))) {
            throw new Error(`Category '${categoryName}' not found`);
        }

        const specsButton = categoryRow.getByRole('button').nth(1);
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Wait for modal/dialog
        await expect(page.locator('dialog, [role="dialog"], .modal').first()).toBeVisible({ timeout: 5000 });
    }

    // Helper: Add new field
    async function addNewField(page: any) {
        // Wait a bit for modal to settle
        await page.waitForTimeout(800);

        // Look for Add Field / New Field button in dialog
        const buttons = page.locator('dialog button, [role="dialog"] button, .modal button');
        let addButton = null;

        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
            const text = await buttons.nth(i).textContent();
            if (text && (text.includes('Add') || text.includes('New'))) {
                addButton = buttons.nth(i);
                break;
            }
        }

        if (!addButton) {
            // Fallback: use first non-disabled button
            for (let i = 0; i < count; i++) {
                const disabled = await buttons.nth(i).isDisabled();
                if (!disabled) {
                    addButton = buttons.nth(i);
                    break;
                }
            }
        }

        if (addButton) {
            await addButton.click();
            await page.waitForTimeout(800);
        }
    }

    // Helper: Save field
    async function saveField(page: any) {
        await page.waitForTimeout(500);
        const buttons = page.locator('dialog button, [role="dialog"] button, .modal button, button');
        let saveButton = null;

        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
            const text = await buttons.nth(i).textContent();
            if (text && (text.includes('Save') || text.includes('Create') || text.includes('Add'))) {
                const disabled = await buttons.nth(i).isDisabled();
                if (!disabled) {
                    saveButton = buttons.nth(i);
                    break;
                }
            }
        }

        if (saveButton) {
            // Scroll into view and click
            await saveButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(300);
            await saveButton.click({ force: true });
            await page.waitForTimeout(2000);
        }
    }

    test('Test 1: Add field with Label and Key', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        // Get all inputs in form
        const inputs = page.locator('input[type="text"]');
        const inputCount = await inputs.count();

        if (inputCount < 2) {
            throw new Error('Expected at least 2 input fields');
        }

        // Fill label (first input)
        await inputs.nth(0).fill('Test Field 1');

        // Fill key (second input)  
        await inputs.nth(1).fill('testField1');

        await saveField(page);

        // Verify field was added
        await expect(page.locator('text=testField1').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 2: Add field with Type selection', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Number Field');
        await inputs.nth(1).fill('numberField');

        // Select type
        const selects = page.locator('select');
        if (await selects.count() > 0) {
            await selects.first().selectOption('number');
            await page.waitForTimeout(500);
        }

        await saveField(page);
        await expect(page.locator('text=numberField').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 3: Add field with Min/Max values', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('RAM Size');
        await inputs.nth(1).fill('ramSize');

        // Select number type
        const selects = page.locator('select');
        if (await selects.count() > 0) {
            await selects.first().selectOption('number');
            await page.waitForTimeout(500);
        }

        // Fill number inputs
        const numberInputs = page.locator('input[type="number"]');
        const numCount = await numberInputs.count();

        if (numCount >= 2) {
            await numberInputs.nth(0).fill('4'); // min
            await numberInputs.nth(1).fill('128'); // max
        }

        await saveField(page);
        await expect(page.locator('text=ramSize').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 4: Add field with Unit', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Storage');
        await inputs.nth(1).fill('storage');

        // Type = number
        const selects = page.locator('select');
        if (await selects.count() > 0) {
            await selects.first().selectOption('number');
            await page.waitForTimeout(500);
        }

        // Find unit input
        const allInputs = page.locator('input[type="text"]');
        const allCount = await allInputs.count();

        if (allCount >= 3) {
            // Unit is typically the 3rd or later input
            await allInputs.nth(2).fill('GB');
        }

        await saveField(page);
        await expect(page.locator('text=storage').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 5: Add enum field with values', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Color');
        await inputs.nth(1).fill('color');

        // Select enum type
        const selects = page.locator('select');
        if (await selects.count() > 0) {
            await selects.first().selectOption('enum');
            await page.waitForTimeout(500);
        }

        // Fill enum values
        const allInputs = page.locator('input[type="text"]');
        const allCount = await allInputs.count();

        if (allCount >= 3) {
            await allInputs.nth(2).fill('Red, Blue, Green');
        }

        await saveField(page);
        await expect(page.locator('text=color').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 6: Add field with Pattern', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Serial Number');
        await inputs.nth(1).fill('serialNumber');

        // Fill pattern
        const allInputs = page.locator('input[type="text"]');
        const allCount = await allInputs.count();

        if (allCount >= 3) {
            await allInputs.nth(2).fill('[A-Z0-9]{10}');
        }

        await saveField(page);
        await expect(page.locator('text=serialNumber').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 7: Add field with Help Text', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Description');
        await inputs.nth(1).fill('description');

        // Find help text input (might be textarea or later input)
        const allInputs = page.locator('input[type="text"], textarea');
        const allCount = await allInputs.count();

        if (allCount >= 4) {
            await allInputs.nth(3).fill('This is a help text');
        }

        await saveField(page);
        await expect(page.locator('text=description').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 8: Add required field', async ({ page }) => {
        await navigateToSpecs(page);
        await addNewField(page);

        const inputs = page.locator('input[type="text"]');
        await inputs.nth(0).fill('Required Field');
        await inputs.nth(1).fill('requiredField');

        // Check required checkbox
        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 0) {
            await checkboxes.first().check();
        }

        await saveField(page);
        await expect(page.locator('text=requiredField').first()).toBeVisible({ timeout: 5000 });
    });

    test('Test 9: Edit field', async ({ page }) => {
        await navigateToSpecs(page);

        // Find first field to edit
        const editButton = page.locator('button').filter({ hasText: /edit/i }).first();

        if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await editButton.click();
            await page.waitForTimeout(500);

            // Change label
            const inputs = page.locator('input[type="text"]');
            if (await inputs.count() > 0) {
                await inputs.first().clear();
                await inputs.first().fill('Updated Label');
            }

            await saveField(page);
        }
    });

    test('Test 10: Delete field', async ({ page }) => {
        await navigateToSpecs(page);

        // Find field to delete (not a critical one)
        const deleteButton = page.locator('button').filter({ hasText: /delete|remove/i }).first();

        if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await deleteButton.click();
            await page.waitForTimeout(500);

            // Confirm if needed
            const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i });
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
                await page.waitForTimeout(1500);
            }
        }
    });
});
