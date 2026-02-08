import { test, expect } from '@playwright/test';

test('debug i18n initialization', async ({ page }) => {
    const errors: string[] = [];
    const logs: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        console.log(`Browser console [${msg.type()}]:`, text);
    });

    // Capture page errors
    page.on('pageerror', (error) => {
        errors.push(error.message);
        console.log('Page error:', error.message);
    });

    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for any async initialization
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-i18n.png', fullPage: true });

    // Get page content
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page has "Sign in":', content.includes('Sign in'));
    console.log('Page has input fields:', await page.locator('input[type="email"]').count());

    // Report errors
    if (errors.length > 0) {
        console.log('\n=== Page Errors ===');
        errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    // Check for i18n errors
    const hasI18nError = errors.some(err => err.includes('[svelte-i18n]'));
    if (hasI18nError) {
        throw new Error('i18n initialization failed - see errors above');
    }

    // Verify basic page structure
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
});
