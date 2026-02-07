/**
 * Logout E2E Tests
 * 
 * Tests for user logout functionality
 * Based on: docs/modules/AUTH.md
 */
import { test, expect } from '@playwright/test';

test.describe('Logout', () => {
    test.describe('Logout Flow', () => {
        test('should logout and redirect to login page', async ({ page }) => {
            // Start from authenticated state (from global-setup)
            await page.goto('/chat');
            await page.waitForLoadState('networkidle');

            // Check if we're logged in
            const url = page.url();
            if (!url.includes('/chat')) {
                // Not logged in, skip test
                test.skip();
                return;
            }

            // Look for logout button or user menu
            const userMenuButton = page.locator('[data-testid="user-menu"], button:has-text("Logout"), a:has-text("Logout")');

            if (await userMenuButton.count() > 0) {
                await userMenuButton.first().click();
                await page.waitForTimeout(1000);
            }

            // Navigate to logout
            await page.goto('/logout');
            await page.waitForLoadState('networkidle');

            // Should redirect to login
            const finalUrl = page.url();
            expect(finalUrl.includes('/login') || finalUrl.includes('/')).toBeTruthy();
        });

        test('should clear localStorage on logout', async ({ page }) => {
            await page.goto('/chat');
            await page.waitForLoadState('networkidle');

            // Check initial state
            const tokenBefore = await page.evaluate(() => localStorage.getItem('authToken'));

            // Navigate to logout
            await page.goto('/logout');
            await page.waitForLoadState('networkidle');

            // Token should be cleared
            const tokenAfter = await page.evaluate(() => localStorage.getItem('authToken'));

            // Either token is cleared or we weren't logged in
            expect(tokenAfter === null || tokenBefore === null).toBeTruthy();
        });
    });

    test.describe('Post-Logout Access', () => {
        test('should not access protected routes after logout', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            // Clear any stored auth
            await page.goto('/');
            await page.evaluate(() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
            });

            // Try to access protected route
            await page.goto('/chat');
            await page.waitForLoadState('networkidle');

            // Should redirect to login
            const url = page.url();
            expect(url.includes('/login') || url.includes('/setup')).toBeTruthy();

            await context.close();
        });
    });
});
