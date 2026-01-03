import { test, expect } from '@playwright/test'

const apiBaseOrigin = process.env.API_BASE_ORIGIN ?? 'http://localhost:3000'

async function expectHealthOk(request: any) {
    const res = await request.get(`${apiBaseOrigin}/health`)
    expect(res.status()).toBe(200)
}

test.describe('NetOps Web UI', () => {
    test.beforeAll(async ({ request }) => {
        await expectHealthOk(request)
    })

    test('devices page loads and hits API on port 3000', async ({ page }) => {
        const apiRequest = page.waitForRequest((req) =>
            req.resourceType() === 'fetch' && req.url().includes('/netops/devices')
        )

        await page.goto('/netops/devices')
        await expect(page.getByRole('heading', { name: 'NetOps Devices' })).toBeVisible()
        await expect(page.getByPlaceholder('Name or IP...')).toBeVisible()

        const req = await apiRequest
        expect(req.url()).toContain(apiBaseOrigin)
    })

    test('changes page loads', async ({ page }) => {
        await page.goto('/netops/changes')
        await expect(page.getByRole('heading', { name: 'Change Requests' })).toBeVisible()
        await expect(page.getByRole('button', { name: /New Change/i })).toBeVisible()
    })

    test('rulepacks page loads', async ({ page }) => {
        await page.goto('/netops/rulepacks')
        await expect(page.getByRole('heading', { name: 'Rulepacks' })).toBeVisible()
        await expect(page.getByText('0 rulepacks')).toBeVisible({ timeout: 5000 })
    })
})
