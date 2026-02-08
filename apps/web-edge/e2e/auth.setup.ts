import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth', 'user.json');

// Test credentials - from environment or defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

setup('authenticate', async ({ page }) => {
    // Listen for console messages and errors
    page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('Page error:', err));
    page.on('response', response => {
        if (response.url().includes('/auth/login')) {
            console.log('Login response:', response.status(), response.url());
        }
    });

    // Go to login page
    await page.goto('/login');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Fill form fields and trigger input events to update Svelte reactive state
    await page.fill('#email', ADMIN_EMAIL);
    await page.dispatchEvent('#email', 'input');

    await page.fill('#password', ADMIN_PASSWORD);
    await page.dispatchEvent('#password', 'input');

    // Wait for reactive state to update
    await page.waitForTimeout(300);

    console.log('Before click, URL:', page.url());

    // Evaluate and call handleLogin directly since onclick handler may not work with force click
    const loginResult = await page.evaluate(async (credentials) => {
        try {
            // Call login API directly
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }

            const result = await response.json();

            // Store tokens and user info
            localStorage.setItem('authToken', result.accessToken);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userRole', result.user.role);
            localStorage.setItem('userName', result.user.name);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    console.log('Login result:', loginResult);

    // Verify tokens were stored
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    const userId = await page.evaluate(() => localStorage.getItem('userId'));

    console.log('Auth token exists:', !!authToken);
    console.log('User ID exists:', !!userId);

    expect(loginResult.success).toBeTruthy();
    expect(authToken).toBeTruthy();
    expect(userId).toBeTruthy();

    // Save authentication state
    await page.context().storageState({ path: authFile });
});
