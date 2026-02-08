import { test, expect } from '@playwright/test'

const shouldRun = process.env.E2E_SMOKE === 'true'

test.describe('web-edge critical flow', () => {
    test.skip(!shouldRun, 'Set E2E_SMOKE=true to run critical flow')

    test('local login -> pairing -> connector config -> health', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'networkidle' })
        await page.getByTestId('login-email').fill(process.env.E2E_USER ?? 'admin@example.com')
        await page.getByTestId('login-password').fill(process.env.E2E_PASS ?? 'ChangeMe123!')
        await page.getByTestId('login-submit').click()

        await page.waitForURL(/pairing|settings/i)
        await page.getByTestId('pairing-start').click()
        await page.getByTestId('pairing-token').fill('mock-ok')
        await page.getByTestId('pairing-submit').click()
        await expect(page.getByTestId('pairing-status')).toHaveText(/paired|success/i)

        await page.getByTestId('connector-nav').click()
        await page.getByTestId('connector-endpoint').fill('http://localhost:8080')
        await page.getByTestId('connector-save').click()
        await expect(page.getByTestId('connector-status')).toHaveText(/healthy|ok/i)
    })
})
