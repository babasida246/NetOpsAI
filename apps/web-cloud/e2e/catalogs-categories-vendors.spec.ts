import { test, expect } from '@playwright/test'

type Category = { id: string; name: string }
type Vendor = { id: string; name: string; taxCode?: string | null; phone?: string | null; email?: string | null; address?: string | null }
type Catalogs = { categories: Category[]; vendors: Vendor[]; models: unknown[]; locations: unknown[] }

function applyAuth(page: Parameters<typeof test>[0]['page'], role = 'it_asset_manager') {
    return page.addInitScript((roleValue) => {
        localStorage.setItem('authToken', 'ui-test-token')
        localStorage.setItem('refreshToken', 'ui-test-refresh')
        localStorage.setItem('userId', 'ui-tester')
        localStorage.setItem('userEmail', 'ui-tester@example.com')
        localStorage.setItem('userRole', roleValue)
    }, role)
}

function parseId(url: string): string {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? ''
}

test.describe('Asset catalogs UI - categories and vendors', () => {
    test('manage categories and vendors', async ({ page }) => {
        await applyAuth(page)
        page.on('dialog', (dialog) => dialog.accept())

        const catalogs: Catalogs = {
            categories: [{ id: 'cat-1', name: 'Laptop' }],
            vendors: [{ id: 'vendor-1', name: 'Dell', email: 'support@dell.com' }],
            models: [],
            locations: []
        }

        await page.route(/\/v1\/assets\/catalogs(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: catalogs } })
        })

        // Mock CREATE category - uses /v1/asset-categories (not /v1/assets/catalogs/categories)
        await page.route(/\/v1\/asset-categories(?:\?.*)?$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.fulfill({ status: 405 })
                return
            }
            const body = route.request().postDataJSON() as { name?: string }
            const next: Category = { id: `cat-${catalogs.categories.length + 1}`, name: body.name ?? 'New' }
            catalogs.categories = [...catalogs.categories, next]
            await route.fulfill({ json: { data: { category: next, versionId: 'v1', specDefs: [] } } })
        })

        await page.route(/\/v1\/assets\/catalogs\/categories\/[^/]+$/, async (route) => {
            const id = parseId(route.request().url())
            if (route.request().method() === 'PUT') {
                const body = route.request().postDataJSON() as { name?: string }
                const index = catalogs.categories.findIndex((item) => item.id === id)
                if (index >= 0) {
                    catalogs.categories[index] = { ...catalogs.categories[index], ...body }
                }
                const updated = catalogs.categories[index] ?? { id, name: body.name ?? 'Updated' }
                await route.fulfill({ json: { data: updated } })
                return
            }
            if (route.request().method() === 'DELETE') {
                const index = catalogs.categories.findIndex((item) => item.id === id)
                if (index >= 0) catalogs.categories.splice(index, 1)
                await route.fulfill({ json: { data: { id } } })
                return
            }
            await route.fulfill({ status: 405 })
        })

        await page.route(/\/v1\/assets\/catalogs\/vendors(?:\?.*)?$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.fulfill({ status: 405 })
                return
            }
            const body = route.request().postDataJSON() as Vendor
            const next: Vendor = {
                id: `vendor-${catalogs.vendors.length + 1}`,
                name: body.name ?? 'New Vendor',
                taxCode: body.taxCode ?? null,
                phone: body.phone ?? null,
                email: body.email ?? null,
                address: body.address ?? null
            }
            catalogs.vendors = [...catalogs.vendors, next]
            await route.fulfill({ json: { data: next } })
        })

        await page.route(/\/v1\/assets\/catalogs\/vendors\/[^/]+$/, async (route) => {
            const id = parseId(route.request().url())
            if (route.request().method() === 'PUT') {
                const body = route.request().postDataJSON() as Vendor
                const index = catalogs.vendors.findIndex((item) => item.id === id)
                if (index >= 0) {
                    catalogs.vendors[index] = { ...catalogs.vendors[index], ...body }
                }
                const updated = catalogs.vendors[index] ?? { id, name: body.name ?? 'Updated Vendor' }
                await route.fulfill({ json: { data: updated } })
                return
            }
            if (route.request().method() === 'DELETE') {
                const index = catalogs.vendors.findIndex((item) => item.id === id)
                if (index >= 0) catalogs.vendors.splice(index, 1)
                await route.fulfill({ json: { data: { id } } })
                return
            }
            await route.fulfill({ status: 405 })
        })

        await page.goto('/assets/catalogs')
        await expect(page.getByRole('heading', { name: 'Asset Catalogs' })).toBeVisible()
        await page.getByRole('tab', { name: 'Categories' }).click()

        await page.locator('label:has-text("Category name")').locator('..').locator('input').fill('Desktop')
        await page.getByRole('button', { name: 'Add' }).click()
        await expect(page.getByRole('cell', { name: 'Desktop', exact: true })).toBeVisible()

        const laptopRow = page.getByRole('row', { name: /Laptop/ })
        await laptopRow.getByRole('button').nth(0).click()
        await page.locator('label:has-text("Category name")').locator('..').locator('input').fill('Laptop Pro')
        await page.getByRole('button', { name: 'Update' }).click()
        await expect(page.getByRole('cell', { name: 'Laptop Pro', exact: true })).toBeVisible()

        const desktopRow = page.getByRole('row', { name: /Desktop/ })
        await desktopRow.getByRole('button').nth(2).click()  // nth(2) is Delete button (0=Edit, 1=Specs, 2=Delete)
        await expect(page.getByRole('cell', { name: 'Desktop', exact: true })).not.toBeVisible()

        await page.getByRole('tab', { name: 'Vendors' }).click()
        await page.locator('label:has-text("Vendor name")').locator('..').locator('input').fill('HP')
        await page.locator('label:has-text("Email")').locator('..').locator('input').fill('hello@hp.com')
        await page.getByRole('button', { name: 'Add' }).click()
        await expect(page.getByRole('cell', { name: 'HP', exact: true })).toBeVisible()

        const dellRow = page.getByRole('row', { name: /Dell/ })
        await dellRow.getByRole('button').nth(0).click()
        await page.locator('label:has-text("Vendor name")').locator('..').locator('input').fill('Dell Inc.')
        await page.getByRole('button', { name: 'Update' }).click()
        await expect(page.getByRole('cell', { name: 'Dell Inc.', exact: true })).toBeVisible()

        const hpRow = page.getByRole('row', { name: /HP/ })
        await hpRow.getByRole('button').nth(1).click()  // nth(1) is Delete for vendors (0=Edit, 1=Delete - no Specs button)
        await expect(page.getByRole('cell', { name: 'HP', exact: true })).not.toBeVisible()
    })
})
