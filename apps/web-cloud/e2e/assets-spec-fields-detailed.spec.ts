import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * DETAILED TEST SUITE: Category Spec Fields
 * 
 * Kiểm tra từng field một trong form Add/Edit Spec Field:
 * - Label, Key, Type, Unit
 * - Sort Order, Required, Readonly, Searchable, Filterable
 * - Min Length, Max Length, Pattern
 * - Min Value, Max Value, Step Value
 * - Precision, Scale, Normalize
 * - Default Value, Help Text, Computed Expression
 * - Enum Values (cho enum/multi_enum)
 * 
 * Fix tất cả lỗi phát sinh trong quá trình test
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth', 'user.json');

function getSpecModal(page: any) {
    return page.locator('dialog, [role="dialog"], .modal').first();
}

test.describe('Category Spec Fields - Detailed Field Testing', () => {

    const timestamp = Date.now();
    const categoryName = `TEST_SPEC_FIELDS_${timestamp}`;

    test.beforeAll(async ({ browser }) => {
        // Setup: Create test category
        const context = await browser.newContext({ storageState: authFile });
        const page = await context.newPage();
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Categories' }).click();
        await page.waitForTimeout(500);

        const nameInput = page.locator('input[placeholder*="Laptop" i], input[name="name"]').first();
        await nameInput.fill(categoryName);

        const addButton = page.getByRole('button', { name: /^add$/i }).first();
        await addButton.click();
        await page.waitForTimeout(2000);

        await expect(page.getByText(categoryName)).toBeVisible();
        await page.close();
        await context.close();
    });

    // Helper function to open spec modal
    async function openSpecModal(page: any) {
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Categories' }).click();
        await page.waitForTimeout(500);

        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        await expect(categoryRow).toBeVisible({ timeout: 5000 });

        const specsButton = categoryRow.getByRole('button').nth(1); // Specs button
        await specsButton.click();
        await page.waitForTimeout(1500);

        // Wait for modal to be visible
        const modal = getSpecModal(page);
        await expect(modal).toBeVisible({ timeout: 5000 });

        const newDraftButton = modal.getByRole('button', { name: /new draft/i }).first();
        const addFieldButton = modal.getByRole('button', { name: /add field/i }).first();
        const canCreateDraft = await newDraftButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (canCreateDraft) {
            const addDisabled = await addFieldButton.isDisabled().catch(() => false);
            if (addDisabled) {
                await newDraftButton.click();
                await page.waitForTimeout(1500);
            }
        }
    }

    // Helper function to click Add Field button
    async function clickAddField(page: any) {
        // Ensure form inputs are available
        const modal = getSpecModal(page);
        await page.waitForTimeout(300);
        await expect(modal.locator('input[name="label"]')).toBeVisible({ timeout: 5000 });
    }

    test.describe('Basic Fields - Label, Key, Type', () => {
        test('Field 1: Label (required string field)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            // Test Label field
            const labelInput = modal.locator('input[name="label"]').first();
            await expect(labelInput).toBeVisible({ timeout: 5000 });

            // Fill with empty - should fail
            await labelInput.fill('');
            const keyInput = modal.locator('input[name="key"]').first();
            await keyInput.fill('testKey1');

            const saveButton = modal.locator('button').filter({ hasText: /save|add field/i }).first();
            await expect(saveButton).toBeDisabled({ timeout: 5000 });

            // Now fill valid label
            await labelInput.fill('Test Label 1');
            await expect(saveButton).toBeEnabled({ timeout: 5000 });
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('testKey1')).toBeVisible({ timeout: 5000 });
        });

        test('Field 2: Key (required, must be camelCase)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            const keyInput = modal.locator('input[name="key"]').first();
            await expect(keyInput).toBeVisible({ timeout: 5000 });

            // Test valid key
            await modal.locator('input[name="label"]').first().fill('Test Label 2');
            await keyInput.fill('validKey2');

            const saveButton = modal.locator('button').filter({ hasText: /save|add field/i }).first();
            await expect(saveButton).toBeEnabled({ timeout: 5000 });
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('validKey2')).toBeVisible({ timeout: 5000 });
        });

        test('Field 3: Type dropdown (string, number, enum, etc.)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Test Type Field');
            await modal.locator('input[name="key"]').first().fill('typeTest');

            const typeSelect = modal.locator('select[name="type"], select[name="fieldType"]').first();
            await expect(typeSelect).toBeVisible({ timeout: 5000 });

            // Test selecting different types
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            // Should show number-specific fields (min/max/step)
            const minValueInput = modal.locator('input[name="minValue"]').first();
            await expect(minValueInput).toBeVisible({ timeout: 3000 });

            await typeSelect.selectOption('string');
            await page.waitForTimeout(500);

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('typeTest')).toBeVisible();
        });
    });

    test.describe('Validation Fields - Min/Max Length, Pattern', () => {
        test('Field 4: Min Length (number input)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Min Length Test');
            await modal.locator('input[name="key"]').first().fill('minLenTest');

            const minLenInput = modal.locator('input[name="minLen"], input[placeholder*="min length" i]').first();
            await expect(minLenInput).toBeVisible({ timeout: 5000 });

            // Test with valid number
            await minLenInput.fill('5');

            // Test with empty
            await minLenInput.clear();

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('minLenTest')).toBeVisible();
        });

        test('Field 5: Max Length (number input)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Max Length Test');
            await modal.locator('input[name="key"]').first().fill('maxLenTest');

            const maxLenInput = modal.locator('input[name="maxLen"], input[placeholder*="max length" i]').first();
            await expect(maxLenInput).toBeVisible({ timeout: 5000 });

            await maxLenInput.fill('255');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('maxLenTest')).toBeVisible();
        });

        test('Field 6: Pattern (regex string)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Pattern Test');
            await modal.locator('input[name="key"]').first().fill('patternTest');

            const patternInput = modal.locator('input[name="pattern"], input[placeholder*="pattern" i]').first();
            await expect(patternInput).toBeVisible({ timeout: 5000 });

            // Test with various patterns
            await patternInput.fill('^[A-Z0-9]{10}$');
            await page.waitForTimeout(300);

            await patternInput.clear();
            await patternInput.fill('^[a-z]+@[a-z]+\\.[a-z]+$');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('patternTest')).toBeVisible();
        });
    });

    test.describe('Number Fields - Min/Max Value, Step, Precision', () => {
        test('Field 7: Min Value (for number type)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Min Value Test');
            await modal.locator('input[name="key"]').first().fill('minValueTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            const minValueInput = modal.locator('input[name="minValue"], input[placeholder*="min value" i]').first();
            await expect(minValueInput).toBeVisible({ timeout: 5000 });

            // Test with decimal
            await minValueInput.fill('0.5');
            await page.waitForTimeout(300);

            // Test with negative
            await minValueInput.clear();
            await minValueInput.fill('-10');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('minValueTest')).toBeVisible();
        });

        test('Field 8: Max Value (for number type)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Max Value Test');
            await modal.locator('input[name="key"]').first().fill('maxValueTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            const maxValueInput = modal.locator('input[name="maxValue"], input[placeholder*="max value" i]').first();
            await expect(maxValueInput).toBeVisible({ timeout: 5000 });

            await maxValueInput.fill('1000.99');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('maxValueTest')).toBeVisible();
        });

        test('Field 9: Step Value (for number input)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Step Test');
            await modal.locator('input[name="key"]').first().fill('stepTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            const stepInput = modal.locator('input[name="stepValue"], input[placeholder*="step" i]').first();
            if (await stepInput.isVisible({ timeout: 3000 })) {
                await stepInput.fill('0.01');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('stepTest')).toBeVisible();
        });

        test('Field 10: Precision (decimal places)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Precision Test');
            await modal.locator('input[name="key"]').first().fill('precisionTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            const precisionInput = modal.locator('input[name="precision"], input[placeholder*="precision" i]').first();
            if (await precisionInput.isVisible({ timeout: 3000 })) {
                await precisionInput.fill('2');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('precisionTest')).toBeVisible();
        });

        test('Field 11: Scale', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Scale Test');
            await modal.locator('input[name="key"]').first().fill('scaleTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('number');
            await page.waitForTimeout(500);

            const scaleInput = modal.locator('input[name="scale"], input[placeholder*="scale" i]').first();
            if (await scaleInput.isVisible({ timeout: 3000 })) {
                await scaleInput.fill('3');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('scaleTest')).toBeVisible();
        });
    });

    test.describe('Checkboxes - Required, Readonly, Searchable, Filterable', () => {
        test('Field 12: Required checkbox', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Required Test');
            await modal.locator('input[name="key"]').first().fill('requiredTest');

            const requiredCheckbox = modal.locator('input[type="checkbox"][name="required"]').or(
                modal.locator('label:has-text("Required") input[type="checkbox"]')
            ).first();

            await expect(requiredCheckbox).toBeVisible({ timeout: 5000 });
            await requiredCheckbox.check();

            const isChecked = await requiredCheckbox.isChecked();
            expect(isChecked).toBeTruthy();

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('requiredTest')).toBeVisible();
        });

        test('Field 13: Readonly checkbox', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Readonly Test');
            await modal.locator('input[name="key"]').first().fill('readonlyTest');

            const readonlyCheckbox = modal.locator('input[type="checkbox"][name="readonly"], input[type="checkbox"][name="isReadonly"]').or(
                modal.locator('label:has-text("Readonly") input[type="checkbox"]')
            ).first();

            if (await readonlyCheckbox.isVisible({ timeout: 3000 })) {
                await readonlyCheckbox.check();
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('readonlyTest')).toBeVisible();
        });

        test('Field 14: Searchable checkbox', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Searchable Test');
            await modal.locator('input[name="key"]').first().fill('searchableTest');

            const searchableCheckbox = modal.locator('input[type="checkbox"][name="searchable"], input[type="checkbox"][name="isSearchable"]').or(
                modal.locator('label:has-text("Searchable") input[type="checkbox"]')
            ).first();

            if (await searchableCheckbox.isVisible({ timeout: 3000 })) {
                await searchableCheckbox.check();
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('searchableTest')).toBeVisible();
        });

        test('Field 15: Filterable checkbox', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Filterable Test');
            await modal.locator('input[name="key"]').first().fill('filterableTest');

            const filterableCheckbox = modal.locator('input[type="checkbox"][name="filterable"], input[type="checkbox"][name="isFilterable"]').or(
                modal.locator('label:has-text("Filterable") input[type="checkbox"]')
            ).first();

            if (await filterableCheckbox.isVisible({ timeout: 3000 })) {
                await filterableCheckbox.check();
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('filterableTest')).toBeVisible();
        });
    });

    test.describe('Other Fields - Unit, Sort Order, Default Value, Help Text', () => {
        test('Field 16: Unit (text field)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Unit Test');
            await modal.locator('input[name="key"]').first().fill('unitTest');

            const unitInput = modal.locator('input[name="unit"], input[placeholder*="unit" i]').first();
            await expect(unitInput).toBeVisible({ timeout: 5000 });

            await unitInput.fill('GB');
            await page.waitForTimeout(300);

            await unitInput.clear();
            await unitInput.fill('MHz');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('unitTest')).toBeVisible();
        });

        test('Field 17: Sort Order (number)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Sort Order Test');
            await modal.locator('input[name="key"]').first().fill('sortOrderTest');

            const sortOrderInput = modal.locator('input[name="sortOrder"], input[placeholder*="sort" i]').first();
            await expect(sortOrderInput).toBeVisible({ timeout: 5000 });

            await sortOrderInput.fill('10');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('sortOrderTest')).toBeVisible();
        });

        test('Field 18: Default Value (varies by type)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Default Value Test');
            await modal.locator('input[name="key"]').first().fill('defaultValueTest');

            const defaultInput = modal.locator('input[name="defaultValue"], input[placeholder*="default" i]').first();
            if (await defaultInput.isVisible({ timeout: 3000 })) {
                await defaultInput.fill('default text');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('defaultValueTest')).toBeVisible();
        });

        test('Field 19: Help Text (textarea)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Help Text Test');
            await modal.locator('input[name="key"]').first().fill('helpTextTest');

            const helpTextInput = modal.locator('textarea[name="helpText"], input[name="helpText"], input[placeholder*="help" i]').first();
            if (await helpTextInput.isVisible({ timeout: 3000 })) {
                await helpTextInput.fill('This is helpful text for users');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('helpTextTest')).toBeVisible();
        });

        test('Field 20: Computed Expression', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Computed Test');
            await modal.locator('input[name="key"]').first().fill('computedTest');

            const computedInput = modal.locator('input[name="computedExpr"], input[placeholder*="computed" i], textarea[name="computedExpr"]').first();
            if (await computedInput.isVisible({ timeout: 3000 })) {
                await computedInput.fill('modelName.capacity');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('computedTest')).toBeVisible();
        });

        test('Field 21: Normalize dropdown', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Normalize Test');
            await modal.locator('input[name="key"]').first().fill('normalizeTest');

            const normalizeSelect = modal.locator('select[name="normalize"]').first();
            if (await normalizeSelect.isVisible({ timeout: 3000 })) {
                await normalizeSelect.selectOption('lowercase');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('normalizeTest')).toBeVisible();
        });
    });

    test.describe('Enum Fields - Enum Values', () => {
        test('Field 22: Enum Values (comma-separated)', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Enum Test');
            await modal.locator('input[name="key"]').first().fill('enumTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();
            await typeSelect.selectOption('enum');
            await page.waitForTimeout(500);

            const enumInput = modal.locator('input[name="enumValues"], input[placeholder*="enum" i], textarea[name="enumValues"]').first();
            await expect(enumInput).toBeVisible({ timeout: 5000 });

            // Test with various formats
            await enumInput.fill('Option1, Option2, Option3');
            await page.waitForTimeout(300);

            // Test with spaces
            await enumInput.clear();
            await enumInput.fill('  Value A  ,  Value B  ,  Value C  ');

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('enumTest')).toBeVisible();
        });

        test('Field 23: Multi Enum type', async ({ page }) => {
            await openSpecModal(page);
            await clickAddField(page);
            const modal = getSpecModal(page);

            await modal.locator('input[name="label"]').first().fill('Multi Enum Test');
            await modal.locator('input[name="key"]').first().fill('multiEnumTest');

            const typeSelect = modal.locator('select[name="fieldType"]').first();

            // Check if multi_enum exists
            const options = await typeSelect.locator('option').allTextContents();
            const hasMultiEnum = options.some(opt => opt.toLowerCase().includes('multi'));

            if (hasMultiEnum) {
                await typeSelect.selectOption('multi_enum');
                await page.waitForTimeout(500);

                const enumInput = modal.locator('input[name="enumValues"]').first();
                await enumInput.fill('Tag1, Tag2, Tag3, Tag4');
            }

            const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
            await saveButton.click();
            await page.waitForTimeout(2000);

            await expect(modal.getByText('multiEnumTest')).toBeVisible();
        });
    });

    test.describe('Edit Field Tests - Update with null/undefined values', () => {
        test('Field 24: Edit existing field - clear optional fields', async ({ page }) => {
            await openSpecModal(page);
            const modal = getSpecModal(page);

            // Find a field to edit
            const specRow = modal.locator('tr, li').filter({ hasText: /unitTest|sortOrderTest/i }).first();
            if (await specRow.isVisible({ timeout: 3000 })) {
                const editButton = specRow.getByRole('button', { name: /edit/i }).first();
                await editButton.click();
                await page.waitForTimeout(1000);

                // Clear optional fields (this is where trim error can occur)
                const unitInput = modal.locator('input[name="unit"]').first();
                if (await unitInput.isVisible({ timeout: 2000 })) {
                    await unitInput.clear(); // This might cause trim error if not handled
                }

                const minLenInput = modal.locator('input[name="minLen"]').first();
                if (await minLenInput.isVisible({ timeout: 2000 })) {
                    await minLenInput.clear();
                }

                const maxLenInput = modal.locator('input[name="maxLen"]').first();
                if (await maxLenInput.isVisible({ timeout: 2000 })) {
                    await maxLenInput.clear();
                }

                const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
                await saveButton.click();
                await page.waitForTimeout(2000);

                // Should not have error
                const errorMsg = modal.locator('[role="alert"], .error').filter({ hasText: /trim|function/i });
                const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
                expect(hasError).toBeFalsy();
            }
        });

        test('Field 25: Edit number field - change all numeric values', async ({ page }) => {
            await openSpecModal(page);
            const modal = getSpecModal(page);

            const specRow = modal.locator('tr, li').filter({ hasText: /minValueTest|maxValueTest/i }).first();
            if (await specRow.isVisible({ timeout: 3000 })) {
                const editButton = specRow.getByRole('button', { name: /edit/i }).first();
                await editButton.click();
                await page.waitForTimeout(1000);

                // Update all number fields
                const minValueInput = modal.locator('input[name="minValue"]').first();
                if (await minValueInput.isVisible({ timeout: 2000 })) {
                    await minValueInput.clear();
                    await minValueInput.fill('1');
                }

                const maxValueInput = modal.locator('input[name="maxValue"]').first();
                if (await maxValueInput.isVisible({ timeout: 2000 })) {
                    await maxValueInput.clear();
                    await maxValueInput.fill('100');
                }

                const stepInput = modal.locator('input[name="stepValue"]').first();
                if (await stepInput.isVisible({ timeout: 2000 })) {
                    await stepInput.clear();
                    await stepInput.fill('5');
                }

                const saveButton = modal.getByRole('button', { name: /add field|update field|save/i }).first();
                await saveButton.click();
                await page.waitForTimeout(2000);

                // Should not have trim error
                const errorMsg = modal.locator('[role="alert"], .error').filter({ hasText: /trim|function/i });
                const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
                expect(hasError).toBeFalsy();
            }
        });
    });

    test.afterAll(async ({ browser }) => {
        // Cleanup: Delete test category
        const context = await browser.newContext({ storageState: authFile });
        const page = await context.newPage();
        await page.goto('/assets/catalogs');
        await page.getByRole('tab', { name: 'Categories' }).click();
        await page.waitForTimeout(500);

        const categoryRow = page.locator(`tr:has-text("${categoryName}")`);
        if (await categoryRow.isVisible({ timeout: 3000 })) {
            const deleteButton = categoryRow.getByRole('button').last();
            await deleteButton.click();
            await page.waitForTimeout(500);

            const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
            if (await confirmButton.isVisible({ timeout: 2000 })) {
                await confirmButton.click();
                await page.waitForTimeout(1500);
            }
        }

        await page.close();
        await context.close();
    });
});
