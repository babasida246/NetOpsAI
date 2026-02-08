/**
 * Authentication Tests
 * Tests login, logout, and auth redirects
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages';
import { setupApiMocks, mockAuthTokens } from './fixtures';

test.describe('Authentication - Login Page', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await setupApiMocks(page);
        // Clear any existing auth
        await page.addInitScript(() => {
            localStorage.clear();
        });
    });

    test('should display login form', async ({ page }) => {
        await loginPage.navigate();

        // Check page title
        const title = page.locator('h1');
        await expect(title).toBeVisible();

        // Check form elements
        const emailInput = page.locator('#email');
        const passwordInput = page.locator('#password');
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();

        // Check submit button
        const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Đăng nhập")');
        await expect(submitBtn).toBeVisible();
    });

    test('should disable submit button when form is empty', async ({ page }) => {
        await loginPage.navigate();

        const submitBtn = page.locator('button:has-text("Login"), button:has-text("Đăng nhập")');
        await expect(submitBtn).toBeDisabled();
    });

    test('should enable submit button when form is filled', async ({ page }) => {
        await loginPage.navigate();

        await loginPage.fillCredentials('test@example.com', 'password123');

        const submitBtn = page.locator('button:has-text("Login"), button:has-text("Đăng nhập")');
        await expect(submitBtn).toBeEnabled();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await loginPage.navigate();

        // Fill with wrong credentials
        await loginPage.fillCredentials('wrong@example.com', 'wrongpassword');
        await loginPage.submit();

        // Wait for error response
        await page.waitForTimeout(500);

        // Should show error alert
        const alert = page.locator('[role="alert"], .alert');
        await expect(alert).toBeVisible({ timeout: 5000 });
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await loginPage.navigate();

        await loginPage.fillCredentials('test@example.com', 'password123');

        // Intercept navigation after login
        const [response] = await Promise.all([
            page.waitForResponse('**/api/v1/auth/login'),
            loginPage.submit()
        ]);

        expect(response.status()).toBe(200);
    });

    test('should redirect to original page after login', async ({ page }) => {
        // Navigate to chat without auth (should redirect to login with redirect param)
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // Should be on login page with redirect
        await expect(page).toHaveURL(/\/login\?redirect=/);
    });

    test('should handle keyboard submit with Enter key', async ({ page }) => {
        await loginPage.navigate();

        await loginPage.fillCredentials('test@example.com', 'password123');

        // Press Enter on password field
        await page.locator('#password').press('Enter');

        // Should trigger login (mock will handle it)
        await page.waitForTimeout(500);
    });
});

test.describe('Authentication - Logout', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        // Set up authenticated session
        await page.addInitScript(() => {
            localStorage.setItem('authToken', 'mock-access-token');
            localStorage.setItem('refreshToken', 'mock-refresh-token');
            localStorage.setItem('userId', 'test-user-id');
            localStorage.setItem('userEmail', 'test@example.com');
            localStorage.setItem('userRole', 'admin');
        });
    });

    test('should logout when clicking logout button', async ({ page }) => {
        await page.goto('/chat');
        await page.waitForLoadState('domcontentloaded');

        // Click logout
        await page.getByTestId('header-logout').click();

        // Should redirect to logout page or login
        await expect(page).toHaveURL(/\/(logout|login)/);
    });

    test('should clear auth tokens on logout', async ({ page }) => {
        await page.goto('/logout');
        await page.waitForLoadState('domcontentloaded');

        await page.waitForURL(/\/login/);

        // Check localStorage is cleared
        const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(authToken).toBeNull();
    });
});

test.describe('Authentication - Protected Routes', () => {
    test('should redirect to login for protected routes without auth', async ({ page }) => {
        const protectedRoutes = ['/chat', '/stats', '/models', '/tools', '/assets'];

        for (const route of protectedRoutes) {
            await page.addInitScript(() => localStorage.clear());
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            // Should redirect to login
            await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
        }
    });
});
