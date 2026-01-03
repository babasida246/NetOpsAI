import { defineConfig, devices } from '@playwright/test'

const webBase = process.env.WEB_UI_BASE_URL ?? 'http://localhost:3003'

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: webBase,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
