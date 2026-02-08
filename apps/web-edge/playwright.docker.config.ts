import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/docker-deployment.spec.ts',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    retries: 0, // No retries for deployment tests
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/docker-deployment.json' }]
    ],
    workers: 1,
    fullyParallel: false,

    use: {
        // Use Docker deployment URL
        baseURL: 'http://localhost:3003',
        trace: 'on',
        screenshot: 'on',
        video: 'on',

        // Increase timeouts for Docker
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
    },

    // Don't start dev server - using Docker containers
    // webServer: undefined,

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
            },
        },
    ],
});
