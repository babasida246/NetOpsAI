import { test, expect } from '@playwright/test'

type WorkflowRequest = {
    id: string
    requestType: string
    assetId?: string | null
    status: string
    requestedBy?: string | null
    approvedBy?: string | null
    createdAt: string
    updatedAt: string
    payload: Record<string, unknown>
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

function parseId(pathname: string): string {
    const parts = pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? ''
}

test.describe('Workflow and reports UI', () => {
    test('workflow list and create request', async ({ page }) => {
        await applyAuth(page)

        let requests: WorkflowRequest[] = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                requestType: 'assign',
                assetId: '22222222-2222-2222-2222-222222222222',
                status: 'submitted',
                requestedBy: 'dept-a',
                approvedBy: null,
                createdAt: '2025-01-07T00:00:00Z',
                updatedAt: '2025-01-07T00:00:00Z',
                payload: {}
            }
        ]

        await page.route(/\/v1\/workflows(?:\?.*)?$/, async (route) => {
            if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON() as { requestType?: string; assetId?: string; payload?: Record<string, unknown> }
                const newRequest: WorkflowRequest = {
                    id: '33333333-3333-3333-3333-333333333333',
                    requestType: body.requestType ?? 'move',
                    assetId: body.assetId ?? '44444444-4444-4444-4444-444444444444',
                    status: 'submitted',
                    requestedBy: 'dept-b',
                    approvedBy: null,
                    createdAt: '2025-01-08T00:00:00Z',
                    updatedAt: '2025-01-08T00:00:00Z',
                    payload: body.payload ?? {}
                }
                requests = [...requests, newRequest]
                await route.fulfill({ json: { data: newRequest } })
                return
            }
            await route.fulfill({ json: { data: requests, meta: { total: requests.length, page: 1, limit: 20 } } })
        })

        await page.route(/\/v1\/workflows\/[^/]+$/, async (route) => {
            const requestId = parseId(new URL(route.request().url()).pathname)
            const request = requests.find((item) => item.id === requestId)
            await route.fulfill({ json: { data: request } })
        })

        await page.goto('/requests')
        await expect(page.getByRole('heading', { name: 'Workflow Requests' })).toBeVisible()
        await expect(page.getByText('11111111-1111-1111-1111-111111111111')).toBeVisible()

        await page.getByRole('button', { name: 'New Request' }).click()
        await page.locator('label:has-text("Request Type")').locator('..').locator('select').selectOption('move')
        await page.locator('label:has-text("Asset ID")').locator('..').locator('input').fill('44444444-4444-4444-4444-444444444444')
        await page.locator('label:has-text("From Department")').locator('..').locator('input').fill('IT')
        await page.locator('label:has-text("To Department")').locator('..').locator('input').fill('HR')
        await page.locator('label:has-text("Payload (JSON)")').locator('..').locator('textarea').fill('{"note":"move"}')
        await page.getByRole('button', { name: 'Submit Request' }).click()

        await expect(page.getByRole('heading', { name: 'Workflow Requests' })).toBeVisible()
        await expect(page.getByText('33333333-3333-3333-3333-333333333333')).toBeVisible()
    })

    test('workflow approve and execute', async ({ page }) => {
        await applyAuth(page)

        let requests: WorkflowRequest[] = [
            {
                id: '55555555-5555-5555-5555-555555555555',
                requestType: 'assign',
                assetId: '66666666-6666-6666-6666-666666666666',
                status: 'submitted',
                requestedBy: 'dept-a',
                approvedBy: null,
                createdAt: '2025-01-07T00:00:00Z',
                updatedAt: '2025-01-07T00:00:00Z',
                payload: {}
            }
        ]

        await page.route(/\/v1\/workflows\/[^/]+\/approve$/, async (route) => {
            requests = requests.map((item) => item.id === '55555555-5555-5555-5555-555555555555' ? { ...item, status: 'approved', approvedBy: 'ui-tester' } : item)
            await route.fulfill({ json: { data: requests[0] } })
        })

        await page.route(/\/v1\/workflows\/[^/]+\/execute$/, async (route) => {
            requests = requests.map((item) => item.id === '55555555-5555-5555-5555-555555555555' ? { ...item, status: 'done' } : item)
            await route.fulfill({ json: { data: requests[0] } })
        })

        await page.route(/\/v1\/workflows\/[^/]+\/reject$/, async (route) => {
            requests = requests.map((item) => item.id === '55555555-5555-5555-5555-555555555555' ? { ...item, status: 'rejected' } : item)
            await route.fulfill({ json: { data: requests[0] } })
        })

        await page.route(/\/v1\/workflows\/[^/]+$/, async (route) => {
            const requestId = parseId(new URL(route.request().url()).pathname)
            const request = requests.find((item) => item.id === requestId)
            await route.fulfill({ json: { data: request } })
        })

        await page.goto('/requests/55555555-5555-5555-5555-555555555555')
        await expect(page.getByText('submitted')).toBeVisible()

        await page.getByRole('button', { name: 'Approve' }).click()
        await expect(page.getByText('approved', { exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Execute' })).toBeVisible()

        await page.getByRole('button', { name: 'Execute' }).click()
        await expect(page.getByText('done', { exact: true })).toBeVisible()
    })

    test('reports page shows status, category, and location counts', async ({ page }) => {
        await applyAuth(page, 'viewer')

        const catalogs = {
            categories: [{ id: '77777777-7777-7777-7777-777777777777', name: 'Laptop' }],
            locations: [{ id: '88888888-8888-8888-8888-888888888888', name: 'HQ', path: '/hq' }],
            vendors: [],
            models: []
        }

        await page.route(/\/v1\/assets\/catalogs(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: catalogs } })
        })

        await page.route(/\/v1\/assets(?:\?.*)?$/, async (route) => {
            const url = new URL(route.request().url())
            let total = 0
            if (url.searchParams.get('status') === 'in_stock') total = 2
            if (url.searchParams.get('status') === 'in_use') total = 1
            if (url.searchParams.get('categoryId') === '77777777-7777-7777-7777-777777777777') total = 3
            if (url.searchParams.get('locationId') === '88888888-8888-8888-8888-888888888888') total = 4
            await route.fulfill({ json: { data: [], meta: { total, page: 1, limit: 1 } } })
        })

        await page.goto('/reports/assets')
        await expect(page.getByRole('heading', { name: 'Asset Reports' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Category' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible()
    })
})
