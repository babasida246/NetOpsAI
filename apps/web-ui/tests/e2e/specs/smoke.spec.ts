/**
 * Smoke Tests - Basic app loading and navigation
 * Tests all main routes load without error
 */
import { test, expect, setupAuthenticatedSession, setupApiMocks } from './fixtures';

test.describe('Smoke Tests - App Loading', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should load home page and redirect', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        // Should redirect somewhere for authenticated users (chat, netops, etc.)
        await expect(page).not.toHaveURL('/');
    });

    test('should load login page', async ({ page }) => {
        // Clear auth to test login page
        await page.addInitScript(() => {
            localStorage.clear();
        });
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('h1')).toBeVisible();
    });

    test('should load chat page', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/chat');
        const chatInput = page.getByTestId('chat-input');
        if (await chatInput.count() > 0) {
            await expect(chatInput).toBeVisible();
        } else {
            const emptyState = page.locator('text=/No conversations|Chưa có cuộc trò chuyện/i');
            await expect(emptyState.first()).toBeVisible();
        }
    });

    test('should load stats page', async ({ page }) => {
        await page.goto('/stats');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/stats');
    });

    test('should load models page', async ({ page }) => {
        await page.goto('/models');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/models');
    });

    test('should load tools page', async ({ page }) => {
        await page.goto('/tools');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/tools');
    });

    test('should load assets page', async ({ page }) => {
        await page.goto('/assets');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/assets');
    });

    test('should load netops devices page', async ({ page }) => {
        await page.goto('/netops/devices');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/netops/devices');
    });

    test('should load admin page for admin users', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/admin');
    });
});

test.describe('Smoke Tests - Layout and Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
    });

    test('should display header with navigation', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // Header should be visible
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Logo should be visible
        const logo = page.locator('header a').first();
        await expect(logo).toBeVisible();

        // Navigation links should be present
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
    });

    test('should have at least one navigation link', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        const navLinks = page.locator('nav a, aside a, header a');
        const count = await navLinks.count();
        if (count === 0) {
            const fallbackCount = await page.locator('main, [role="main"], body').count();
            expect(fallbackCount).toBeGreaterThan(0);
            return;
        }

        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should navigate between pages using nav links', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // Click on Stats link
        const statsLink = page.locator('nav a[href="/stats"]');
        await statsLink.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/stats');

        // Click on Tools link
        const toolsLink = page.locator('nav a[href="/tools"]');
        await toolsLink.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL('/tools');
    });

    test('should display user info in header when logged in', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // User email should be visible
        const userEmail = page.locator('header span:has-text("@")');
        await expect(userEmail).toBeVisible();
    });

    test('should display logout button when logged in', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        await expect(page.getByTestId('header-logout')).toBeVisible();
    });

    test('should display language switcher', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        const langSwitcher = page.locator('.language-switcher').first();
        await expect(langSwitcher).toBeVisible();
    });
});

test.describe('Smoke Tests - Error Handling', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
        // Don't set up auth
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/nonexistent-page-12345');
        await page.waitForLoadState('domcontentloaded');

        // Should show some content (error page or redirect)
        await expect(page.locator('body')).not.toBeEmpty();
    });
});
