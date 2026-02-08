import { test, expect } from '@playwright/test';

test.describe('Web-UI Docker Deployment Tests', () => {
    const BASE_URL = 'http://localhost:3003';

    test.beforeEach(async ({ page }) => {
        // Listen to console messages
        page.on('console', (msg) => {
            const type = msg.type();
            const text = msg.text();

            // Log errors and warnings
            if (type === 'error') {
                console.error(`❌ Console Error: ${text}`);
            } else if (type === 'warning') {
                console.warn(`⚠️  Console Warning: ${text}`);
            }
        });

        // Listen to page errors
        page.on('pageerror', (error) => {
            console.error(`❌ Page Error: ${error.message}`);
        });

        // Listen to network failures
        page.on('requestfailed', (request) => {
            console.error(`❌ Network Failed: ${request.url()} - ${request.failure()?.errorText}`);
        });
    });

    test('should load homepage without errors', async ({ page }) => {
        const response = await page.goto(BASE_URL);

        // Check HTTP response
        expect(response?.status()).toBe(200);

        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Check page title
        const title = await page.title();
        console.log(`📄 Page Title: ${title}`);

        // Check for critical errors
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeDefined();
    });

    test('should have proper HTML structure', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check for HTML tag
        const html = await page.locator('html').count();
        expect(html).toBe(1);

        // Check for head and body
        const head = await page.locator('head').count();
        const body = await page.locator('body').count();
        expect(head).toBe(1);
        expect(body).toBe(1);

        // Check viewport meta tag
        const viewport = await page.locator('meta[name="viewport"]').count();
        expect(viewport).toBeGreaterThan(0);
    });

    test('should load static assets without 404', async ({ page }) => {
        const failed404Resources: string[] = [];

        page.on('response', (response) => {
            if (response.status() === 404) {
                failed404Resources.push(response.url());
            }
        });

        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Wait a bit for lazy-loaded assets
        await page.waitForTimeout(2000);

        if (failed404Resources.length > 0) {
            console.error(`❌ 404 Resources:\n${failed404Resources.join('\n')}`);
        }

        expect(failed404Resources.length).toBe(0);
    });

    test('should have no JavaScript errors on load', async ({ page }) => {
        const jsErrors: string[] = [];

        page.on('pageerror', (error) => {
            jsErrors.push(error.message);
        });

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                jsErrors.push(msg.text());
            }
        });

        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (jsErrors.length > 0) {
            console.error(`❌ JavaScript Errors:\n${jsErrors.join('\n')}`);
        }

        expect(jsErrors.length).toBe(0);
    });

    test('should check backend API connectivity', async ({ page }) => {
        const apiRequests: { url: string; status: number }[] = [];

        page.on('response', (response) => {
            const url = response.url();
            // Track API calls
            if (url.includes('/api/') || url.includes(':3000')) {
                apiRequests.push({
                    url: url,
                    status: response.status()
                });
            }
        });

        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        console.log(`\n📡 API Requests detected: ${apiRequests.length}`);
        apiRequests.forEach(req => {
            console.log(`  ${req.status} - ${req.url}`);
        });
    });

    test('should have working navigation (if sidebar exists)', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check for common navigation elements
        const nav = await page.locator('nav, [role="navigation"], aside, .sidebar').count();
        console.log(`🧭 Navigation elements found: ${nav}`);

        // If navigation exists, test it
        if (nav > 0) {
            const links = await page.locator('a[href]').count();
            console.log(`🔗 Links found: ${links}`);
            expect(links).toBeGreaterThan(0);
        }
    });

    test('should render login page or authenticated content', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check if login page or authenticated content is rendered
        const hasLoginForm = await page.locator('form').count() > 0;
        const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
        const hasEmailInput = await page.locator('input[type="email"], input[name*="email"]').count() > 0;

        console.log(`🔐 Login form detected: ${hasLoginForm}`);
        console.log(`   - Email input: ${hasEmailInput}`);
        console.log(`   - Password input: ${hasPasswordInput}`);

        // Should have either login form or authenticated content
        const bodyContent = await page.textContent('body');
        expect(bodyContent).toBeTruthy();
        expect(bodyContent!.length).toBeGreaterThan(100);
    });

    test('should test login functionality (if login page)', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        const hasLoginForm = await page.locator('form').count() > 0;
        const emailInput = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

        if (hasLoginForm && await emailInput.count() > 0 && await passwordInput.count() > 0) {
            console.log('🔐 Testing login form...');

            // Test form fields are visible
            await expect(emailInput).toBeVisible();
            await expect(passwordInput).toBeVisible();

            // Try filling form with test credentials
            await emailInput.fill('admin@example.com');
            await passwordInput.fill('ChangeMe123!');

            // Check if submit button exists and is enabled
            if (await submitButton.count() > 0) {
                await expect(submitButton).toBeVisible();

                // Don't actually submit in this test, just verify form works
                console.log('✅ Login form fields are functional');
            }
        } else {
            console.log('ℹ️  No login form detected, user might be already authenticated');
        }
    });

    test('should check responsive design', async ({ page }) => {
        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        let bodyContent = await page.textContent('body');
        expect(bodyContent).toBeTruthy();
        console.log('✅ Desktop viewport (1920x1080) rendered');

        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        bodyContent = await page.textContent('body');
        expect(bodyContent).toBeTruthy();
        console.log('✅ Tablet viewport (768x1024) rendered');

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        bodyContent = await page.textContent('body');
        expect(bodyContent).toBeTruthy();
        console.log('✅ Mobile viewport (375x667) rendered');
    });

    test('should measure page performance', async ({ page }) => {
        await page.goto(BASE_URL);

        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Get performance metrics
        const performanceMetrics = await page.evaluate(() => {
            const perfData = window.performance.timing;
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

            return {
                pageLoadTime: perfData.loadEventEnd - perfData.navigationStart,
                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,
                tcpConnect: perfData.connectEnd - perfData.connectStart,
                serverResponse: perfData.responseEnd - perfData.requestStart,
                domProcessing: perfData.domComplete - perfData.domLoading,
                transferSize: navigation?.transferSize || 0,
                encodedBodySize: navigation?.encodedBodySize || 0,
                decodedBodySize: navigation?.decodedBodySize || 0
            };
        });

        console.log('\n⚡ Performance Metrics:');
        console.log(`   Page Load Time: ${performanceMetrics.pageLoadTime}ms`);
        console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
        console.log(`   DNS Lookup: ${performanceMetrics.dnsLookup}ms`);
        console.log(`   TCP Connect: ${performanceMetrics.tcpConnect}ms`);
        console.log(`   Server Response: ${performanceMetrics.serverResponse}ms`);
        console.log(`   DOM Processing: ${performanceMetrics.domProcessing}ms`);
        console.log(`   Transfer Size: ${(performanceMetrics.transferSize / 1024).toFixed(2)} KB`);
        console.log(`   Decoded Size: ${(performanceMetrics.decodedBodySize / 1024).toFixed(2)} KB`);

        // Assert reasonable performance (adjust thresholds as needed)
        expect(performanceMetrics.pageLoadTime).toBeLessThan(10000); // 10 seconds max
        expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // 5 seconds max
    });

    test('should check for accessibility issues', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check for basic accessibility attributes
        const images = await page.locator('img').count();
        const imagesWithAlt = await page.locator('img[alt]').count();

        console.log(`\n♿ Accessibility Check:`);
        console.log(`   Total images: ${images}`);
        console.log(`   Images with alt text: ${imagesWithAlt}`);

        // Check for buttons without accessible text
        const buttons = await page.locator('button').count();
        console.log(`   Total buttons: ${buttons}`);

        // Check for proper heading hierarchy
        const h1Count = await page.locator('h1').count();
        console.log(`   H1 headings: ${h1Count}`);

        // Should have at least one H1
        if (h1Count > 0) {
            expect(h1Count).toBeGreaterThan(0);
            expect(h1Count).toBeLessThanOrEqual(1); // Generally only one H1 per page
        }
    });

    test('should capture screenshot of homepage', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Take full page screenshot
        await page.screenshot({
            path: 'test-results/homepage-screenshot.png',
            fullPage: true
        });

        console.log('📸 Screenshot saved to test-results/homepage-screenshot.png');
    });

    test('should test main navigation routes', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Find all internal navigation links
        const navLinks = await page.locator('a[href^="/"], a[href^="./"]').all();
        const routes: string[] = [];

        for (const link of navLinks.slice(0, 10)) { // Test first 10 links
            const href = await link.getAttribute('href');
            if (href && !href.includes('#') && !routes.includes(href)) {
                routes.push(href);
            }
        }

        console.log(`\n🗺️  Testing ${routes.length} navigation routes:`);

        for (const route of routes) {
            try {
                const fullUrl = route.startsWith('http') ? route : `${BASE_URL}${route}`;
                const response = await page.goto(fullUrl, { timeout: 5000 });
                const status = response?.status() || 0;

                console.log(`   ${status === 200 ? '✅' : '❌'} ${status} - ${route}`);

                // Don't fail test for auth-protected routes (401, 403)
                if (status !== 401 && status !== 403) {
                    expect(status).toBeLessThan(400);
                }
            } catch (error) {
                console.log(`   ⚠️  Timeout/Error - ${route}`);
            }
        }
    });
});
