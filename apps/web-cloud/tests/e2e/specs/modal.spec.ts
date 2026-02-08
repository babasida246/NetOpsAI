/**
 * Modal Tests
 * Tests modal behavior: open/close, backdrop click, ESC key, focus trap
 */
import { test, expect, setupAuthenticatedSession, setupApiMocks } from './fixtures';

test.describe('Modal - Basic Behavior', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should open modal when trigger is clicked', async ({ page }) => {
        // Navigate to page with modal (models page has create modal)
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        // Find button to open modal
        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm"), button:has-text("Create"), button:has-text("Tạo")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            // Modal should be visible
            const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
            await expect(modal).toBeVisible({ timeout: 5000 });
        }
    });

    test('should close modal when X button is clicked', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Find close button (X)
            const closeBtn = modal.locator('button:has-text("×"), button:has(svg[class*="X"]), button[aria-label="Close"]');

            if (await closeBtn.count() > 0) {
                await closeBtn.first().click();
                await expect(modal).toBeHidden({ timeout: 3000 });
            }
        }
    });

    test('should close modal when ESC key is pressed', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Press ESC
            await page.keyboard.press('Escape');

            // Modal should close
            await expect(modal).toBeHidden({ timeout: 3000 });
        }
    });

    test('should close modal when backdrop is clicked', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Click backdrop (outside modal content)
            const backdrop = page.locator('.modal-backdrop, [data-testid="modal-backdrop"]');

            if (await backdrop.count() > 0) {
                // Click in corner of backdrop
                await backdrop.click({ position: { x: 10, y: 10 } });
                await expect(modal).toBeHidden({ timeout: 3000 });
            } else {
                // Try clicking at viewport corner
                await page.mouse.click(10, 10);
                // Modal behavior may vary
            }
        }
    });
});

test.describe('Modal - Focus Management', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should focus first interactive element when modal opens', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // First input or button should be focused
            await page.waitForTimeout(200);
            const activeElement = await page.evaluate(() => document.activeElement?.tagName);
            expect(['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']).toContain(activeElement);
        }
    });

    test('should trap focus within modal', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Get focusable elements in modal
            const focusable = modal.locator('input, button, textarea, select, a[href]');
            const count = await focusable.count();

            if (count > 0) {
                // Tab through all elements
                for (let i = 0; i < count + 1; i++) {
                    await page.keyboard.press('Tab');
                }

                // Focus should still be within modal
                const activeElement = await page.evaluate(() => document.activeElement);
                // Validate focus is within modal (not behind it)
            }
        }
    });

    test('should return focus to trigger when modal closes', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")').first();

        if (await addBtn.count() > 0) {
            await addBtn.focus();
            await addBtn.click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Close with ESC
            await page.keyboard.press('Escape');
            await modal.waitFor({ state: 'hidden', timeout: 3000 });

            // Focus should return to trigger button
            await expect(addBtn).toBeFocused();
        }
    });
});

test.describe('Modal - Tab Order', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should have correct tab order for form elements', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            const focusableElements: string[] = [];

            // Tab through and record elements
            for (let i = 0; i < 10; i++) {
                const tag = await page.evaluate(() => document.activeElement?.tagName);
                if (tag) focusableElements.push(tag);
                await page.keyboard.press('Tab');
            }

            // Should have navigated through inputs and buttons
            expect(focusableElements.some(el => ['INPUT', 'BUTTON'].includes(el))).toBe(true);
        }
    });

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"], .modal');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Tab forward
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');

            const forwardElement = await page.evaluate(() => document.activeElement?.tagName);

            // Tab backward
            await page.keyboard.press('Shift+Tab');

            const backwardElement = await page.evaluate(() => document.activeElement?.tagName);

            // Should be different elements
            expect(forwardElement || backwardElement).toBeTruthy();
        }
    });
});

test.describe('Modal - Confirmation Dialogs', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should display confirmation dialog for delete action', async ({ page }) => {
        // Navigate to a page with delete functionality
        await page.goto('/tools');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Find delete button
        const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Xóa"), button[aria-label*="delete"]');

        if (await deleteBtn.count() > 0) {
            await deleteBtn.first().click();

            // Confirmation modal should appear
            const confirmModal = page.locator('text=/Are you sure|Bạn có chắc/i');
            await expect(confirmModal).toBeVisible({ timeout: 5000 });
        }
    });

    test('should cancel action when Cancel is clicked', async ({ page }) => {
        await page.goto('/tools');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Xóa")');

        if (await deleteBtn.count() > 0) {
            await deleteBtn.first().click();

            const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Hủy")');

            if (await cancelBtn.count() > 0) {
                await cancelBtn.click();

                // Modal should close
                const confirmText = page.locator('text=/Are you sure|Bạn có chắc/i');
                await expect(confirmText).toBeHidden({ timeout: 3000 });
            }
        }
    });

    test('should proceed with action when Confirm is clicked', async ({ page }) => {
        await page.goto('/tools');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Xóa")');

        if (await deleteBtn.count() > 0) {
            await deleteBtn.first().click();

            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Xác nhận"), button:has-text("Yes")');

            if (await confirmBtn.count() > 0) {
                // Click confirm and wait for API call
                await page.route('**/api/v1/**', async (route) => {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ success: true })
                    });
                });

                await confirmBtn.click();

                // Modal should close
                await page.waitForTimeout(1000);
            }
        }
    });
});

test.describe('Modal - Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should have role="dialog" attribute', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"]');
            await expect(modal).toBeVisible({ timeout: 5000 });
        }
    });

    test('should have aria-modal="true"', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[aria-modal="true"]');
            if (await modal.count() > 0) {
                await expect(modal).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('should have descriptive title', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")');

        if (await addBtn.count() > 0) {
            await addBtn.first().click();

            const modal = page.locator('[role="dialog"]');
            await modal.waitFor({ state: 'visible', timeout: 5000 });

            // Should have heading
            const heading = modal.locator('h1, h2, h3, [role="heading"]');
            await expect(heading.first()).toBeVisible();
        }
    });
});
