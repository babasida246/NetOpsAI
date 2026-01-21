import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webBase = process.env.WEB_UI_BASE_URL ?? 'http://localhost:5173'
const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json')

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    // Retry failed tests once to handle intermittent API issues
    retries: 1,
    reporter: [['list']],
    // Reduce workers to avoid rate limiting from API
    workers: 1,
    fullyParallel: false,
    use: {
        baseURL: webBase,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    // Start web server before running tests
    webServer: {
        command: 'pnpm dev',
        port: 5173,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        // Setup project for authentication
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        // Main project that uses authenticated state
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Use stored authentication state
                storageState: authFile,
            },
            dependencies: ['setup'],
            testIgnore: [/login\.spec\.ts/, /auth\.setup\.ts/],
        },
        // Tests that don't need authentication (login page tests)
        {
            name: 'chromium-no-auth',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /login\.spec\.ts/,
        },
    ],
})
