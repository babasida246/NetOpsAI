import { test, expect } from '@playwright/test'

type Asset = {
    id: string
    assetCode: string
    status: string
    modelId: string
    modelName?: string
    vendorId?: string
    vendorName?: string
    locationId?: string
    locationName?: string
    hostname?: string
    mgmtIp?: string
    macAddress?: string
    createdAt: string
    updatedAt: string
}

function applyAuth(page: Parameters<typeof test>[0]['page'], role = 'it_asset_manager') {
    return page.addInitScript((roleValue) => {
        localStorage.setItem('authToken', 'ui-test-token')
        localStorage.setItem('refreshToken', 'ui-test-refresh')
        localStorage.setItem('userId', 'ui-tester')
        localStorage.setItem('userEmail', 'ui-tester@example.com')
        localStorage.setItem('userRole', roleValue)
    }, role)
}

function filterAssets(assets: Asset[], params: URLSearchParams): Asset[] {
    const status = params.get('status')
    const query = params.get('query')
    const categoryId = params.get('categoryId')
    const vendorId = params.get('vendorId')
    const modelId = params.get('modelId')
    const locationId = params.get('locationId')
    return assets.filter((asset) => {
        if (status && asset.status !== status) return false
        if (categoryId && asset.modelId !== categoryId && asset.modelId !== '') return false
        if (vendorId && asset.vendorId !== vendorId) return false
        if (modelId && asset.modelId !== modelId) return false
        if (locationId && asset.locationId !== locationId) return false
        if (!query) return true
        const haystack = [
            asset.assetCode,
            asset.hostname ?? '',
            asset.mgmtIp ?? '',
            asset.macAddress ?? ''
        ].join(' ').toLowerCase()
        return haystack.includes(query.toLowerCase())
    })
}

test.describe('Assets list UI', () => {
    test('filters, export, create, and import', async ({ page }) => {
        await applyAuth(page)

        const catalogs = {
            categories: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Laptop' }],
            locations: [{ id: '22222222-2222-2222-2222-222222222222', name: 'HQ', path: '/hq' }],
            vendors: [{ id: '33333333-3333-3333-3333-333333333333', name: 'Dell' }],
            models: [{ id: '44444444-4444-4444-4444-444444444444', model: 'Latitude', brand: 'Dell', categoryId: '11111111-1111-1111-1111-111111111111', vendorId: '33333333-3333-3333-3333-333333333333', spec: {} }]
        }

        let assets: Asset[] = [
            {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                assetCode: 'ASSET-001',
                status: 'in_stock',
                modelId: '44444444-4444-4444-4444-444444444444',
                modelName: 'Latitude',
                vendorId: '33333333-3333-3333-3333-333333333333',
                vendorName: 'Dell',
                locationId: '22222222-2222-2222-2222-222222222222',
                locationName: 'HQ',
                hostname: 'laptop-01',
                mgmtIp: '10.0.0.10',
                macAddress: 'AA:BB:CC:DD:EE:01',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
            },
            {
                id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                assetCode: 'ASSET-002',
                status: 'in_use',
                modelId: '44444444-4444-4444-4444-444444444444',
                modelName: 'Latitude',
                vendorId: '33333333-3333-3333-3333-333333333333',
                vendorName: 'Dell',
                locationId: '22222222-2222-2222-2222-222222222222',
                locationName: 'HQ',
                hostname: 'laptop-02',
                mgmtIp: '10.0.0.11',
                macAddress: 'AA:BB:CC:DD:EE:02',
                createdAt: '2025-01-02T00:00:00Z',
                updatedAt: '2025-01-02T00:00:00Z'
            }
        ]

        let csvRequested = false

        await page.route('**/v1/assets/catalogs', async (route) => {
            await route.fulfill({ json: { data: catalogs } })
        })

        await page.route('**/v1/assets/import/preview', async (route) => {
            const body = route.request().postDataJSON() as { rows?: Array<{ assetCode?: string; modelId?: string }> }
            const rows = body.rows ?? []
            await route.fulfill({
                json: {
                    data: {
                        items: rows.map((row) => ({ row, valid: true, errors: [] })),
                        total: rows.length,
                        validCount: rows.length,
                        invalidCount: 0
                    }
                }
            })
        })

        await page.route('**/v1/assets/import/commit', async (route) => {
            const body = route.request().postDataJSON() as { rows?: Array<{ assetCode?: string; modelId?: string }> }
            const rows = body.rows ?? []
            rows.forEach((row) => {
                if (!row.assetCode || !row.modelId) return
                assets.push({
                    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                    assetCode: row.assetCode,
                    status: 'in_stock',
                    modelId: row.modelId,
                    modelName: 'Latitude',
                    vendorId: '33333333-3333-3333-3333-333333333333',
                    vendorName: 'Dell',
                    locationId: '22222222-2222-2222-2222-222222222222',
                    locationName: 'HQ',
                    createdAt: '2025-01-03T00:00:00Z',
                    updatedAt: '2025-01-03T00:00:00Z'
                })
            })
            await route.fulfill({ json: { data: { created: rows.length, updated: 0, skipped: 0 } } })
        })

        await page.route(/\/v1\/assets(?:\?.*)?$/, async (route) => {
            const request = route.request()
            const url = new URL(request.url())
            if (request.method() === 'GET') {
                if (url.searchParams.get('export') === 'csv') {
                    csvRequested = true
                    await route.fulfill({
                        status: 200,
                        contentType: 'text/csv',
                        body: 'asset_code,model_id\nASSET-001,44444444-4444-4444-4444-444444444444\n'
                    })
                    return
                }
                const filtered = filterAssets(assets, url.searchParams)
                await route.fulfill({ json: { data: filtered, meta: { total: filtered.length, page: 1, limit: 20 } } })
                return
            }
            if (request.method() === 'POST') {
                const body = request.postDataJSON() as { assetCode?: string; modelId?: string; status?: string }
                const newAsset: Asset = {
                    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                    assetCode: body.assetCode ?? 'ASSET-NEW',
                    status: body.status ?? 'in_stock',
                    modelId: body.modelId ?? '44444444-4444-4444-4444-444444444444',
                    modelName: 'Latitude',
                    vendorId: '33333333-3333-3333-3333-333333333333',
                    vendorName: 'Dell',
                    locationId: '22222222-2222-2222-2222-222222222222',
                    locationName: 'HQ',
                    createdAt: '2025-01-04T00:00:00Z',
                    updatedAt: '2025-01-04T00:00:00Z'
                }
                assets = [...assets, newAsset]
                await route.fulfill({ json: { data: newAsset } })
                return
            }
            await route.fulfill({ status: 405 })
        })

        await page.goto('/assets')
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
        await expect(page.getByText('ASSET-001')).toBeVisible()

        const statusSelect = page.locator('label:has-text("Status")').locator('..').locator('select')
        await statusSelect.selectOption('in_use')
        await page.getByRole('button', { name: 'Apply' }).click()
        await expect(page.getByText('ASSET-002')).toBeVisible()
        await expect(page.getByText('ASSET-001')).not.toBeVisible()

        await page.getByRole('button', { name: 'Clear' }).click()
        await expect(page.getByText('ASSET-001')).toBeVisible()

        await page.getByRole('button', { name: 'Export CSV' }).click()
        await expect.poll(() => csvRequested).toBe(true)

        await page.getByRole('button', { name: 'Add Asset' }).click()
        const addAssetDialog = page.getByRole('dialog')
        await addAssetDialog.locator('label:has-text("Asset Code")').locator('..').locator('input').fill('ASSET-NEW')
        await addAssetDialog.locator('label:has-text("Model")').locator('..').locator('select').selectOption('44444444-4444-4444-4444-444444444444')
        await page.getByRole('button', { name: 'Create' }).click()
        await expect(page.getByText('ASSET-NEW')).toBeVisible()

        await page.getByRole('button', { name: 'Import' }).click()
        const csvBuffer = Buffer.from('assetCode,modelId\nASSET-IMP,44444444-4444-4444-4444-444444444444\n', 'utf-8')
        await page.locator('input[type="file"]').setInputFiles({
            name: 'assets.csv',
            mimeType: 'text/csv',
            buffer: csvBuffer
        })
        await expect(page.getByText('Total rows')).toBeVisible()
        await page.getByRole('button', { name: 'Commit Import' }).click()
        await expect(page.getByText('ASSET-IMP')).toBeVisible()
    })
})
