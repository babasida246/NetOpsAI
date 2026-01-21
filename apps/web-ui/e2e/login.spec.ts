import { test, expect } from '@playwright/test';

test.describe('Login Page Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Go directly to login page
        await page.goto('/login');
    });

    test('should display login form', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.getByLabel('Email').fill('invalid@example.com');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: /login/i }).click();

        // Should show error message
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.getByLabel('Email').fill('admin@example.com');
        await page.getByLabel('Password').fill('ChangeMe123!');
        await page.getByRole('button', { name: /login/i }).click();

        // Should redirect after login - allow more patterns
        await page.waitForURL(/\/(chat|assets|netops|admin|stats|models|tools)/, { timeout: 15000 });

        // Verify auth tokens are stored
        const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(authToken).toBeTruthy();
    });

    test('should disable login button when fields are empty', async ({ page }) => {
        const loginButton = page.getByRole('button', { name: /login/i });
        await expect(loginButton).toBeDisabled();

        await page.getByLabel('Email').fill('test@example.com');
        await expect(loginButton).toBeDisabled();

        await page.getByLabel('Password').fill('password');
        await expect(loginButton).toBeEnabled();
    });
});
