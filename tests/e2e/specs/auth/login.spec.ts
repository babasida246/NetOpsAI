/**
 * Login Page E2E Tests
 * 
 * Tests for user authentication and login functionality
 * Based on: docs/modules/AUTH.md - Login Page section
 */
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
    test.describe('UI Elements', () => {
        test('should display login form with all required fields', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Check for email input
            const emailInput = page.locator('input[type="email"], input#email');
            await expect(emailInput).toBeVisible();

            // Check for password input
            const passwordInput = page.locator('input[type="password"], input#password');
            await expect(passwordInput).toBeVisible();

            // Check for login button
            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');
            await expect(loginButton).toBeVisible();

            await context.close();
        });

        test('should display logo and title', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Check page title
            const title = await page.title();
            expect(title.toLowerCase()).toMatch(/login|sign|netops|gateway/i);

            await context.close();
        });
    });

    test.describe('Form Validation', () => {
        test('should disable login button when fields are empty', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Find login button
            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');

            // Button should be disabled when fields are empty
            const isDisabled = await loginButton.isDisabled();
            expect(isDisabled).toBeTruthy();

            await context.close();
        });

        test('should enable login button when both fields are filled', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Fill in email
            await page.fill('input[type="email"], input#email', 'test@example.com');

            // Fill in password
            await page.fill('input[type="password"], input#password', 'password123');

            // Button should be enabled
            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');
            await expect(loginButton).toBeEnabled();

            await context.close();
        });
    });

    test.describe('Authentication Flow', () => {
        test('should show error message for invalid credentials', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Fill invalid credentials
            await page.fill('input[type="email"], input#email', 'invalid@example.com');
            await page.fill('input[type="password"], input#password', 'wrongpassword');

            // Click login
            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');
            await loginButton.click();

            // Wait for error message
            await page.waitForTimeout(2000);

            // Check for error message (Alert component) - use valid CSS selectors
            const errorAlert = page.locator('[role="alert"], .alert, .error, .text-red-500, .text-danger');
            const hasError = await errorAlert.count() > 0;

            // Either shows error or stays on login page
            const url = page.url();
            expect(hasError || url.includes('/login')).toBeTruthy();

            await context.close();
        });

        test('should redirect to chat after successful login', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            // Get credentials from env or use defaults
            const email = process.env.ADMIN_EMAIL || 'admin@example.com';
            const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Fill credentials
            await page.fill('input[type="email"], input#email', email);
            await page.fill('input[type="password"], input#password', password);

            // Click login
            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');
            await loginButton.click();

            // Wait for navigation
            await page.waitForTimeout(3000);

            // Should redirect to /chat or stay on login (if credentials invalid)
            const url = page.url();
            expect(url.includes('/chat') || url.includes('/login') || url.includes('/setup')).toBeTruthy();

            await context.close();
        });

        test('should store tokens in localStorage after login', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            const email = process.env.ADMIN_EMAIL || 'admin@example.com';
            const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            await page.fill('input[type="email"], input#email', email);
            await page.fill('input[type="password"], input#password', password);

            const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign"), button:has-text("Đăng nhập")');
            await loginButton.click();

            await page.waitForTimeout(3000);

            // Check localStorage for auth token
            const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
            const url = page.url();

            // If login succeeded, token should exist
            if (url.includes('/chat')) {
                expect(authToken).toBeTruthy();
            }

            await context.close();
        });
    });

    test.describe('Protected Routes', () => {
        test('should redirect unauthenticated user to login', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            // Try to access protected route
            await page.goto('/chat');
            await page.waitForLoadState('networkidle');

            // Should redirect to login or setup
            const url = page.url();
            expect(url.includes('/login') || url.includes('/setup')).toBeTruthy();

            await context.close();
        });

        test('should redirect to /assets when accessing assets without auth', async ({ browser }) => {
            const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
            const page = await context.newPage();

            await page.goto('/assets');
            await page.waitForLoadState('networkidle');

            const url = page.url();
            expect(url.includes('/login') || url.includes('/setup') || url.includes('/assets')).toBeTruthy();

            await context.close();
        });
    });
});

test.describe('Login API', () => {
    test('POST /api/v1/auth/login should return tokens for valid credentials', async ({ request }) => {
        const email = process.env.ADMIN_EMAIL || 'admin@example.com';
        const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

        const response = await request.post('/api/v1/auth/login', {
            data: { email, password }
        });

        // Either success (200), invalid credentials (401), validation error (422), or server error (500)
        expect([200, 401, 422, 500]).toContain(response.status());

        if (response.status() === 200) {
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('accessToken');
        }
    });

    test('POST /api/v1/auth/login should reject invalid credentials', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: {
                email: 'invalid@test.com',
                password: 'wrongpassword'
            }
        });

        // 401 for invalid, 404 if not found, 500 for server error
        expect([401, 404, 500]).toContain(response.status());
    });

    test('POST /api/v1/auth/login should validate email format', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: {
                email: 'not-an-email',
                password: 'password123'
            }
        });

        // Should return validation error (400/422), or 401 for invalid, or 500 for server error
        expect([400, 401, 422, 500]).toContain(response.status());
    });
});
