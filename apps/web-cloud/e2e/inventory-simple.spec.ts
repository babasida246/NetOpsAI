import { test, expect } from '@playwright/test';

test.describe('Inventory Module - Simple Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login manually before each test
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Execute login via page.evaluate to bypass reactive state issues
        await page.evaluate(async () => {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: 'ChangeMe123!'
                })
            });

            const result = await response.json();

            localStorage.setItem('authToken', result.accessToken);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userRole', result.user.role);
            localStorage.setItem('userName', result.user.name);
        });

        // Navigate to inventory page
        await page.goto('/inventory');
        await page.waitForLoadState('networkidle');
    });

    test('1. Should load inventory sessions page', async ({ page }) => {
        // Check page heading
        await expect(page.locator('h1')).toContainText('Inventory Sessions');

        // Check "Create Session" button exists
        await expect(page.locator('button:has-text("Create Session")')).toBeVisible();
    });

    test('2. Should display empty state or session list', async ({ page }) => {
        // Either shows empty state message or a list of sessions
        const hasEmptyMessage = await page.locator('text=/no.*session/i').count() > 0;
        const hasSessionCards = await page.locator('[class*="card"]').count() > 0;

        expect(hasEmptyMessage || hasSessionCards).toBeTruthy();
    });

    test('3. Should open create session dialog', async ({ page }) => {
        // Click create button
        await page.click('button:has-text("Create Session")');

        // Wait for dialog/modal
        await page.waitForTimeout(500);

        // Check for input fields
        const hasNameInput = await page.locator('input[name="name"], input#name, label:has-text("Name") + input').count() > 0;
        const hasLocationInput = await page.locator('input[name="location"], input#location, select').count() > 0;

        expect(hasNameInput || hasLocationInput).toBeTruthy();
    });

    test('4. Should make API call when loading sessions', async ({ page }) => {
        // Listen for API requests
        const apiRequests: string[] = [];
        page.on('request', request => {
            if (request.url().includes('/inventory/sessions')) {
                apiRequests.push(request.url());
            }
        });

        // Reload page to trigger API call
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify API was called
        expect(apiRequests.length).toBeGreaterThan(0);
    });

    test('5. Should include authentication headers in API calls', async ({ page }) => {
        let hasAuthHeaders = false;

        page.on('request', request => {
            if (request.url().includes('/inventory/sessions')) {
                const headers = request.headers();
                hasAuthHeaders = !!headers['x-user-id'] && !!headers['authorization'];
            }
        });

        // Reload to trigger API call
        await page.reload();
        await page.waitForLoadState('networkidle');

        expect(hasAuthHeaders).toBeTruthy();
    });
});
