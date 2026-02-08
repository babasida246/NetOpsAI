import { test, expect } from '@playwright/test';

test.describe('Inventory Redirect Loop Fix', () => {
    test('should not have redirect loop when accessing inventory', async ({ page }) => {
        let redirectCount = 0;

        // Track redirects
        page.on('response', response => {
            if (response.status() === 302 || response.status() === 301) {
                redirectCount++;
                console.log(`Redirect ${redirectCount}: ${response.url()} -> ${response.headers()['location']}`);
            }
        });

        // Navigate to inventory
        await page.goto('http://localhost:3003/inventory', {
            waitUntil: 'networkidle',
            timeout: 10000
        });

        // Wait a bit to see if any loops occur
        await page.waitForTimeout(2000);

        // Should have settled on a page
        const currentUrl = page.url();
        console.log(`Final URL: ${currentUrl}`);
        console.log(`Total redirects: ${redirectCount}`);

        // Should not have excessive redirects (max 2-3 is normal for auth flow)
        expect(redirectCount).toBeLessThan(10);

        // Should be on either inventory or login page
        expect(currentUrl).toMatch(/\/(inventory|login)/);
    });

    test('should successfully load inventory page after login', async ({ page }) => {
        // Go to login first
        await page.goto('http://localhost:3003/login');

        // Wait for login form - use ID selector
        await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });

        // Fill login form (use default admin)
        await page.fill('#email', 'admin@example.com');
        await page.fill('#password', process.env.ADMIN_PASSWORD || 'admin123');

        // Submit - use text selector
        await page.click('button:has-text("Login")');

        // Wait for redirect
        await page.waitForURL(/\/(inventory|chat|assets|stats)/, { timeout: 10000 });

        // Now try to access inventory
        await page.goto('http://localhost:3003/inventory');

        // Should load successfully
        await expect(page.locator('h1')).toContainText(/Inventory/i, { timeout: 5000 });

        // Should not redirect to login
        expect(page.url()).toContain('/inventory');
        expect(page.url()).not.toContain('/login');
    });

    test('should show inventory dashboard without errors', async ({ page }) => {
        // Setup auth
        await page.goto('http://localhost:3003/login');

        // Wait for login form
        await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });

        // Fill login
        await page.fill('#email', 'admin@example.com');
        await page.fill('#password', process.env.ADMIN_PASSWORD || 'admin123');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(2000);

        // Navigate to inventory
        await page.goto('http://localhost:3003/inventory');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check for basic elements
        await expect(page.locator('text=/Inventory/i')).toBeVisible();

        // Should not have console errors related to redirect loop
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.waitForTimeout(2000);

        // Filter out unrelated errors
        const redirectErrors = errors.filter(err =>
            err.includes('redirect') ||
            err.includes('loop') ||
            err.includes('Maximum')
        );

        expect(redirectErrors.length).toBe(0);
    });
});
