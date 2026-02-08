import { test, expect } from '@playwright/test'

type Model = { id: string; model: string; brand?: string | null; categoryId?: string | null; vendorId?: string | null; spec: Record<string, unknown> }
type Location = { id: string; name: string; parentId?: string | null; path: string }
type Catalogs = { categories: Array<{ id: string; name: string }>; vendors: Array<{ id: string; name: string }>; models: Model[]; locations: Location[] }

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

function buildPath(name: string, parentPath?: string | null): string {
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!parentPath) return `/${slug}`
    return `${parentPath}/${slug}`
}

test.describe('Asset catalogs UI - models and locations', () => {
    test('manage models and locations', async ({ page }) => {
        await applyAuth(page)
        page.on('dialog', (dialog) => dialog.accept())

        const catalogs: Catalogs = {
            categories: [{ id: 'cat-1', name: 'Laptop' }],
            vendors: [{ id: 'vendor-1', name: 'Dell' }],
            models: [{ id: 'model-1', model: 'Latitude', brand: 'Dell', categoryId: 'cat-1', vendorId: 'vendor-1', spec: {} }],
            locations: [{ id: 'loc-1', name: 'HQ', parentId: null, path: '/hq' }]
        }

        await page.route(/\/v1\/assets\/catalogs(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: catalogs } })
        })

        // Mock spec defs for categories (prevents infinite loading)
        await page.route(/\/v1\/asset-categories\/[^/]+\/spec-defs(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: [] } })  // Empty spec defs
        })

        await page.route(/\/v1\/assets\/catalogs\/models(?:\?.*)?$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.fulfill({ status: 405 })
                return
            }
            const body = route.request().postDataJSON() as Partial<Model>
            const next: Model = {
                id: `model-${catalogs.models.length + 1}`,
                model: body.model ?? 'Model',
                brand: body.brand ?? null,
                categoryId: body.categoryId ?? null,
                vendorId: body.vendorId ?? null,
                spec: body.spec ?? {}
            }
            catalogs.models = [...catalogs.models, next]
            await route.fulfill({ json: { data: next } })
        })

        await page.route(/\/v1\/assets\/catalogs\/models\/[^/]+$/, async (route) => {
            const id = parseId(route.request().url())
            if (route.request().method() === 'PUT') {
                const body = route.request().postDataJSON() as Partial<Model>
                const index = catalogs.models.findIndex((item) => item.id === id)
                if (index >= 0) {
                    catalogs.models[index] = { ...catalogs.models[index], ...body }
                }
                const updated = catalogs.models[index] ?? { id, model: body.model ?? 'Updated', spec: {} }
                await route.fulfill({ json: { data: updated } })
                return
            }
            if (route.request().method() === 'DELETE') {
                const index = catalogs.models.findIndex((item) => item.id === id)
                if (index >= 0) catalogs.models.splice(index, 1)
                await route.fulfill({ json: { data: { id } } })
                return
            }
            await route.fulfill({ status: 405 })
        })

        await page.route(/\/v1\/assets\/catalogs\/locations(?:\?.*)?$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.fulfill({ status: 405 })
                return
            }
            const body = route.request().postDataJSON() as { name?: string; parentId?: string | null }
            const parent = catalogs.locations.find((loc) => loc.id === body.parentId)
            const next: Location = {
                id: `loc-${catalogs.locations.length + 1}`,
                name: body.name ?? 'Location',
                parentId: body.parentId ?? null,
                path: buildPath(body.name ?? 'Location', parent?.path ?? null)
            }
            catalogs.locations = [...catalogs.locations, next]
            await route.fulfill({ json: { data: next } })
        })

        await page.route(/\/v1\/assets\/catalogs\/locations\/[^/]+$/, async (route) => {
            const id = parseId(route.request().url())
            if (route.request().method() === 'PUT') {
                const body = route.request().postDataJSON() as { name?: string; parentId?: string | null }
                const index = catalogs.locations.findIndex((item) => item.id === id)
                if (index >= 0) {
                    const parent = catalogs.locations.find((loc) => loc.id === body.parentId)
                    catalogs.locations[index] = {
                        ...catalogs.locations[index],
                        ...body,
                        path: buildPath(body.name ?? catalogs.locations[index].name, parent?.path ?? null)
                    }
                }
                const updated = catalogs.locations[index] ?? { id, name: body.name ?? 'Updated', path: '/' }
                await route.fulfill({ json: { data: updated } })
                return
            }
            if (route.request().method() === 'DELETE') {
                const index = catalogs.locations.findIndex((item) => item.id === id)
                if (index >= 0) catalogs.locations.splice(index, 1)
                await route.fulfill({ json: { data: { id } } })
                return
            }
            await route.fulfill({ status: 405 })
        })

        await page.goto('/assets/catalogs')
        await expect(page.getByRole('heading', { name: 'Asset Catalogs' })).toBeVisible()

        await page.getByRole('tab', { name: 'Models' }).click()

        // Fill model form - ModelForm no longer has "Spec (JSON)" textarea
        // It uses DynamicSpecForm which loads based on category selection
        // We'll just test basic model creation without spec
        const modelInput = page.locator('label:has-text("Model")').locator('..').locator('input')
        await modelInput.first().fill('EliteBook 840')

        const brandInput = page.locator('label:has-text("Brand")').locator('..').locator('input')
        await brandInput.first().fill('HP')

        // Select category - use nth(1) to skip filter form select
        const categorySelects = page.locator('label:has-text("Category")').locator('..').locator('select')
        await categorySelects.nth(1).selectOption('cat-1')

        const vendorSelect = page.locator('label:has-text("Vendor")').locator('..').locator('select')
        await vendorSelect.first().selectOption('vendor-1')

        // Skip spec fields since they're now dynamic based on category spec defs
        // which requires mocking /v1/asset-categories/:id/spec-defs

        await page.getByRole('button', { name: 'Add' }).click()
        await expect(page.getByRole('cell', { name: 'EliteBook 840', exact: true })).toBeVisible()

        const latitudeRow = page.getByRole('row', { name: /Latitude/ })
        await latitudeRow.getByRole('button').nth(0).click()
        await page.locator('label:has-text("Model")').locator('..').locator('input').fill('Latitude 9420')
        await page.getByRole('button', { name: 'Update' }).click()
        await expect(page.getByRole('cell', { name: 'Latitude 9420', exact: true })).toBeVisible()

        const eliteRow = page.getByRole('row', { name: /EliteBook 840/ })
        await eliteRow.getByRole('button').nth(1).click()
        await expect(page.getByRole('cell', { name: 'EliteBook 840', exact: true })).not.toBeVisible()

        await page.getByRole('tab', { name: 'Locations' }).click()
        await page.locator('label:has-text("Location name")').locator('..').locator('input').fill('Datacenter')
        await page.locator('label:has-text("Parent location")').locator('..').locator('select').selectOption('loc-1')
        await page.getByRole('button', { name: 'Add' }).click()
        await expect(page.getByRole('cell', { name: 'Datacenter', exact: true })).toBeVisible()

        const dataRow = page.getByRole('row', { name: /Datacenter/ })
        await dataRow.getByRole('button').nth(0).click()
        await page.locator('label:has-text("Location name")').locator('..').locator('input').fill('DC-1')
        await page.getByRole('button', { name: 'Update' }).click()
        await expect(page.getByRole('cell', { name: 'DC-1', exact: true })).toBeVisible()

        const dcRow = page.getByRole('row', { name: /DC-1/ })
        await dcRow.getByRole('button').nth(1).click()
        await expect(page.getByRole('cell', { name: 'DC-1', exact: true })).not.toBeVisible()
    })
})
