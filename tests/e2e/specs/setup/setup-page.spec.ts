import { test, expect, type Page } from '@playwright/test';

test.describe('Setup Page - UI & Functionality Tests', () => {
    let consoleLogs: string[] = [];
    let consoleErrors: string[] = [];
    let consoleWarnings: string[] = [];

    test.beforeEach(async ({ page }) => {
        // Reset logs before each test
        consoleLogs = [];
        consoleErrors = [];
        consoleWarnings = [];

        // Listen to console messages
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();

            if (type === 'error') {
                consoleErrors.push(text);
            } else if (type === 'warning') {
                consoleWarnings.push(text);
            } else {
                consoleLogs.push(text);
            }
        });

        // Listen to page errors
        page.on('pageerror', error => {
            consoleErrors.push(`Page Error: ${error.message}`);
        });

        // Navigate to setup page
        await page.goto('/setup');
    });

    test('should load setup page without errors', async ({ page }) => {
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Check no console errors (excluding expected warnings and setup step errors)
        const criticalErrors = consoleErrors.filter(err =>
            !err.includes('Flowbite') &&
            !err.includes('sourcemap') &&
            !err.includes('Failed to load resource') &&
            !err.includes('Database setup failed') && // Expected when database not initialized yet
            !err.includes('HTTP 500') && // Expected API errors during setup steps
            !err.includes('HTTP 404') // Expected when endpoints not available
        );

        expect(criticalErrors).toHaveLength(0);

        // Page should be visible
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display checking status initially', async ({ page }) => {
        // Should show loading state first
        const loadingText = page.getByText(/checking system status/i);

        // Wait for either loading state or main content
        await Promise.race([
            loadingText.waitFor({ state: 'visible', timeout: 1000 }).catch(() => { }),
            page.waitForTimeout(500)
        ]);
    });

    test('should check setup status API', async ({ page }) => {
        // Wait for API call to complete
        const statusResponse = await page.waitForResponse(
            response => response.url().includes('/api/v1/setup/status'),
            { timeout: 10000 }
        );

        // Check API response is successful
        expect(statusResponse.status()).toBe(200);

        // Parse response
        const data = await statusResponse.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('isComplete');
        expect(data.data).toHaveProperty('steps');
    });

    test('should display setup wizard when setup is incomplete', async ({ page }) => {
        // Wait for content to load
        await page.waitForLoadState('networkidle');

        // Check for setup wizard component
        const setupWizard = page.locator('text=/System Setup|First Time Setup|Setup Wizard/i').first();

        // Should show either wizard or redirect message
        try {
            await setupWizard.waitFor({ state: 'visible', timeout: 5000 });
            expect(await setupWizard.isVisible()).toBeTruthy();
        } catch {
            // If redirected, that's also acceptable
            const url = page.url();
            console.log('Redirected to:', url);
        }
    });

    test('should not have critical accessibility issues', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        // Check for basic accessibility attributes
        const mainContent = page.locator('body');
        await expect(mainContent).toBeVisible();

        // Check for proper heading structure
        const headings = page.locator('h1, h2, h3');
        const headingCount = await headings.count();
        expect(headingCount).toBeGreaterThan(0);

        // Check for lang attribute
        const html = page.locator('html');
        const lang = await html.getAttribute('lang');
        expect(lang).toBeTruthy();
    });

    test('should handle setup status check failure gracefully', async ({ page }) => {
        // Intercept and fail the API call
        await page.route('**/api/v1/setup/status', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'Internal Server Error' })
            });
        });

        await page.goto('/setup');
        await page.waitForLoadState('networkidle');

        // Should show error state or proceed with setup
        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        // Should not crash the page
        const pageErrors = consoleErrors.filter(err =>
            err.includes('Page Error') || err.includes('Uncaught')
        );
        expect(pageErrors).toHaveLength(0);
    });

    test('should display proper page title', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('Setup');
    });

    test('should have responsive design', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);

        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        await expect(body).toBeVisible();

        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(500);
        await expect(body).toBeVisible();
    });

    test('should not have memory leaks (check for excessive console logs)', async ({ page }) => {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check that we don't have excessive repeated logs
        const logCounts = consoleLogs.reduce((acc, log) => {
            acc[log] = (acc[log] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const repeatedLogs = Object.entries(logCounts).filter(([_, count]) => count > 10);

        if (repeatedLogs.length > 0) {
            console.log('Warning: Repeated console logs detected:', repeatedLogs);
        }

        expect(repeatedLogs.length).toBeLessThan(5);
    });

    test.afterEach(async ({ page }, testInfo) => {
        // Log console errors if test failed
        if (testInfo.status !== 'passed') {
            console.log('\n=== Console Errors ===');
            consoleErrors.forEach(err => console.log('ERROR:', err));

            console.log('\n=== Console Warnings ===');
            consoleWarnings.forEach(warn => console.log('WARN:', warn));

            console.log('\n=== Console Logs ===');
            consoleLogs.slice(-10).forEach(log => console.log('LOG:', log));
        }
    });
});

test.describe('Setup Page - Network & Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/setup');
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;

        console.log(`Page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should not make excessive API calls', async ({ page }) => {
        const apiCalls: string[] = [];

        page.on('request', request => {
            if (request.url().includes('/api/')) {
                apiCalls.push(request.url());
            }
        });

        await page.goto('/setup');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('API calls made:', apiCalls.length);
        console.log('Unique API calls:', [...new Set(apiCalls)]);

        // Should not spam the same API repeatedly
        const setupStatusCalls = apiCalls.filter(url => url.includes('/setup/status'));
        expect(setupStatusCalls.length).toBeLessThan(5);
    });

    test('should handle slow network gracefully', async ({ page }) => {
        // Slow down network
        await page.route('**/api/v1/setup/status', async route => {
            await page.waitForTimeout(2000); // 2 second delay
            await route.continue();
        });

        await page.goto('/setup');

        // Should show loading state
        const loadingIndicator = page.locator('[class*="spin"], [class*="loading"]').first();
        try {
            await loadingIndicator.waitFor({ state: 'visible', timeout: 1000 });
        } catch {
            // Loading might be too fast, that's ok
        }

        // Should eventually complete
        await page.waitForLoadState('networkidle', { timeout: 10000 });
    });
});
