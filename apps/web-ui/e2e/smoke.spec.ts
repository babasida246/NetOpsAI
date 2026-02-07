import { test, expect, type ConsoleMessage, type Request } from '@playwright/test'

const apiBaseOrigin = process.env.API_BASE_ORIGIN ?? 'http://localhost:3000'
const webBaseOrigin = process.env.WEB_UI_BASE_URL ?? 'http://localhost:3003'

interface ErrorReport {
    consoleErrors: ConsoleMessage[]
    pageErrors: Error[]
    failedRequests: { url: string; status: number; method: string }[]
}

test.describe('Smoke Test - Error Detection', () => {
    let errorReport: ErrorReport

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('authToken', 'ui-test-token')
            localStorage.setItem('refreshToken', 'ui-test-refresh')
            localStorage.setItem('userId', 'ui-tester')
            localStorage.setItem('userEmail', 'ui-tester@example.com')
            localStorage.setItem('userRole', 'viewer')
        })

        errorReport = {
            consoleErrors: [],
            pageErrors: [],
            failedRequests: [],
        }

        // Capture console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errorReport.consoleErrors.push(msg)
            }
        })

        // Capture page errors (uncaught exceptions)
        page.on('pageerror', (error) => {
            errorReport.pageErrors.push(error)
        })

        // Capture failed network requests (4xx, 5xx)
        page.on('requestfinished', async (request: Request) => {
            const response = await request.response()
            if (response && response.status() >= 400) {
                errorReport.failedRequests.push({
                    url: request.url(),
                    status: response.status(),
                    method: request.method(),
                })
            }
        })
    })

    test.afterEach(async (context, testInfo) => {
        // Report collected errors
        if (
            errorReport.consoleErrors.length > 0 ||
            errorReport.pageErrors.length > 0 ||
            errorReport.failedRequests.length > 0
        ) {
            console.log('\n=== ERROR REPORT ===')
            console.log(`Test: ${testInfo.title}`)

            if (errorReport.consoleErrors.length > 0) {
                console.log('\nConsole Errors:')
                errorReport.consoleErrors.forEach((msg, i) => {
                    console.log(`  ${i + 1}. ${msg.text()}`)
                })
            }

            if (errorReport.pageErrors.length > 0) {
                console.log('\nPage Errors (Uncaught):')
                errorReport.pageErrors.forEach((err, i) => {
                    console.log(`  ${i + 1}. ${err.message}`)
                    console.log(`     ${err.stack?.split('\n').slice(0, 3).join('\n     ')}`)
                })
            }

            if (errorReport.failedRequests.length > 0) {
                console.log('\nFailed Requests (4xx/5xx):')
                errorReport.failedRequests.forEach((req, i) => {
                    console.log(`  ${i + 1}. [${req.status}] ${req.method} ${req.url}`)
                })
            }

            console.log('===================\n')

            // Fail test if critical errors found
            expect(
                errorReport.pageErrors.length,
                `Found ${errorReport.pageErrors.length} uncaught page errors`
            ).toBe(0)
        }
    })

    test('devices page should load without critical errors', async ({ page }) => {
        await page.goto('/netops/devices')
        await expect(page.getByRole('heading', { name: 'NetOps Devices' })).toBeVisible()

        // Allow page to settle and make API calls
        await page.waitForTimeout(2000)
    })

    test('changes page should load without critical errors', async ({ page }) => {
        await page.goto('/netops/changes')
        await expect(page.getByRole('heading', { name: 'Change Requests' })).toBeVisible()

        await page.waitForTimeout(2000)
    })

    test('rulepacks page should load without critical errors', async ({ page }) => {
        await page.goto('/netops/rulepacks')
        await expect(page.getByRole('heading', { name: 'Rulepacks' })).toBeVisible()

        await page.waitForTimeout(2000)
    })

    test('usage statistics page should load without critical errors', async ({ page }) => {
        await page.goto('/')
        // Wait for Usage Statistics or main page to load
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
    })

    test('stats page should load without critical errors', async ({ page }) => {
        await page.goto('/stats')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
    })

    test('models page should load without critical errors', async ({ page }) => {
        await page.goto('/models')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
    })
})
