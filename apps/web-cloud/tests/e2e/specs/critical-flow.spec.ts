import { test, expect } from '@playwright/test'

const shouldRun = process.env.E2E_SMOKE === 'true'

test.describe('web-cloud critical flow', () => {
    test.skip(!shouldRun, 'Set E2E_SMOKE=true to run critical flow')

    test('login -> create asset -> dispatch job -> audit view', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'networkidle' })
        await page.getByTestId('login-email').fill(process.env.E2E_USER ?? 'admin@example.com')
        await page.getByTestId('login-password').fill(process.env.E2E_PASS ?? 'ChangeMe123!')
        await page.getByTestId('login-submit').click()

        await page.waitForURL(/assets/i)
        await page.getByTestId('asset-create').click()
        await page.getByTestId('asset-name').fill(`Smoke Asset ${Date.now()}`)
        await page.getByTestId('asset-save').click()

        await page.getByTestId('netops-dispatch').click()
        await page.getByTestId('netops-job-type').selectOption('backup_config')
        await page.getByTestId('netops-submit').click()
        await expect(page.getByTestId('job-status')).toHaveText(/success|queued|running/i)

        await page.getByTestId('audit-nav').click()
        await expect(page.getByTestId('audit-list')).toBeVisible()
    })
})
