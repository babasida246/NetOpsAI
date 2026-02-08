import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webBase = process.env.WEB_CLOUD_BASE_URL ?? 'http://localhost:5173'
const authFile = path.join(__dirname, 'tests', 'e2e', '.auth', 'user.json')

const projects = [
    {
        name: 'chromium',
        use: {
            ...devices['Desktop Chrome'],
        },
    },
]

if (process.env.CI) {
    projects.push(
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox']
            },
        },
        {
            name: 'mobile-chrome',
            use: {
                ...devices['Pixel 5'],
            },
        }
    )
}

export default defineConfig({
    // Use new test directory structure
    testDir: './tests/e2e/specs',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    // Retry failed tests once to handle intermittent API issues
    retries: process.env.CI ? 2 : 1,
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
        : [['list'], ['html', { open: 'never' }]],
    // Reduce workers to avoid rate limiting from API
    workers: process.env.CI ? 1 : 2,
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
    projects,
})
