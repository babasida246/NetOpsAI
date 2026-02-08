import { test, expect } from '@playwright/test'

type InventorySession = {
    id: string
    name: string
    locationId?: string
    status: string
    createdAt: string
}

type InventoryItem = {
    id: string
    sessionId: string
    assetId?: string | null
    expectedLocationId?: string | null
    scannedLocationId?: string | null
    status: string
}

type MaintenanceTicket = {
    id: string
    assetId: string
    title: string
    severity: string
    status: string
    openedAt: string
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

function buildCounts(items: InventoryItem[]): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1
        return acc
    }, {})
}

test.describe('Inventory and maintenance UI', () => {
    test('inventory sessions create, scan, and close', async ({ page }) => {
        await applyAuth(page)

        const catalogs = {
            categories: [],
            vendors: [],
            models: [],
            locations: [{ id: '11111111-1111-1111-1111-111111111111', name: 'HQ', path: '/hq' }]
        }

        let sessions: InventorySession[] = [
            {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                name: 'Monthly Audit',
                locationId: '11111111-1111-1111-1111-111111111111',
                status: 'in_progress',
                createdAt: '2025-01-05T00:00:00Z'
            }
        ]
        const itemsBySession: Record<string, InventoryItem[]> = { 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': [] }

        await page.route(/\/v1\/assets\/catalogs(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: catalogs } })
        })

        await page.route(/\/v1\/inventory\/sessions\/[^/]+\/scan$/, async (route) => {
            const sessionId = parseId(new URL(route.request().url()).pathname.replace('/scan', ''))
            const item: InventoryItem = {
                id: `item-${itemsBySession[sessionId]?.length ?? 0}`,
                sessionId,
                assetId: 'ASSET-001',
                scannedLocationId: '11111111-1111-1111-1111-111111111111',
                status: 'found'
            }
            itemsBySession[sessionId] = [...(itemsBySession[sessionId] ?? []), item]
            await route.fulfill({ json: { data: item } })
        })

        await page.route(/\/v1\/inventory\/sessions\/[^/]+\/close$/, async (route) => {
            const sessionId = parseId(new URL(route.request().url()).pathname.replace('/close', ''))
            sessions = sessions.map((session) => session.id === sessionId ? { ...session, status: 'closed' } : session)
            const counts = buildCounts(itemsBySession[sessionId] ?? [])
            await route.fulfill({ json: { data: { session: sessions.find(s => s.id === sessionId), counts } } })
        })

        await page.route(/\/v1\/inventory\/sessions\/[^/]+\/report$/, async (route) => {
            const sessionId = parseId(new URL(route.request().url()).pathname.replace('/report', ''))
            const counts = buildCounts(itemsBySession[sessionId] ?? [])
            await route.fulfill({ json: { data: { session: sessions.find(s => s.id === sessionId), counts } } })
        })

        await page.route(/\/v1\/inventory\/sessions\/[^/]+$/, async (route) => {
            const sessionId = parseId(new URL(route.request().url()).pathname)
            const session = sessions.find((item) => item.id === sessionId)
            await route.fulfill({ json: { data: { session, items: itemsBySession[sessionId] ?? [] } } })
        })

        await page.route(/\/v1\/inventory\/sessions(?:\?.*)?$/, async (route) => {
            if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON() as { name?: string; locationId?: string }
                const newSession: InventorySession = {
                    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    name: body.name ?? 'Session',
                    locationId: body.locationId,
                    status: 'draft',
                    createdAt: '2025-01-06T00:00:00Z'
                }
                sessions = [...sessions, newSession]
                itemsBySession[newSession.id] = []
                await route.fulfill({ json: { data: newSession } })
                return
            }
            await route.fulfill({ json: { data: sessions, meta: { total: sessions.length, page: 1, limit: 20 } } })
        })

        await page.goto('/inventory')
        await expect(page.getByRole('heading', { name: 'Inventory Sessions' })).toBeVisible()
        await expect(page.getByText('Monthly Audit')).toBeVisible()

        await page.getByRole('button', { name: 'New Session' }).click()
        await page.locator('label:has-text("Session Name")').locator('..').locator('input').fill('Quarterly Check')
        await page.locator('label:has-text("Location")').locator('..').locator('select').selectOption('11111111-1111-1111-1111-111111111111')
        await page.getByRole('button', { name: 'Create' }).click()
        await expect(page.getByText('Quarterly Check')).toBeVisible()

        await page.getByRole('button', { name: 'View' }).first().click()
        await expect(page.getByRole('heading', { name: 'Monthly Audit' })).toBeVisible()

        await page.locator('label:has-text("Asset Code")').locator('..').locator('input').fill('ASSET-001')
        await page.locator('label:has-text("Scanned Location")').locator('..').locator('select').selectOption('11111111-1111-1111-1111-111111111111')
        await page.getByRole('button', { name: 'Scan' }).click()
        await expect(page.getByText('ASSET-001')).toBeVisible()

        await page.getByRole('button', { name: 'Close Session' }).click()
        await expect(page.getByText('closed')).toBeVisible()
    })

    test('maintenance list and create ticket', async ({ page }) => {
        await applyAuth(page)

        let tickets: MaintenanceTicket[] = [
            {
                id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                assetId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                title: 'Fan issue',
                severity: 'low',
                status: 'open',
                openedAt: '2025-01-05T00:00:00Z'
            }
        ]

        await page.route(/\/v1\/maintenance(?:\?.*)?$/, async (route) => {
            if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON() as { assetId?: string; title?: string; severity?: string }
                const ticket: MaintenanceTicket = {
                    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                    assetId: body.assetId ?? 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                    title: body.title ?? 'New ticket',
                    severity: body.severity ?? 'medium',
                    status: 'open',
                    openedAt: '2025-01-06T00:00:00Z'
                }
                tickets = [...tickets, ticket]
                await route.fulfill({ json: { data: ticket } })
                return
            }
            await route.fulfill({ json: { data: tickets, meta: { total: tickets.length, page: 1, limit: 20 } } })
        })

        await page.goto('/maintenance')
        await expect(page.getByRole('heading', { name: 'Maintenance Tickets' })).toBeVisible()
        await expect(page.getByText('Fan issue')).toBeVisible()

        await page.getByRole('button', { name: 'New Ticket' }).click()
        await page.locator('label:has-text("Asset ID")').locator('..').locator('input').fill('ffffffff-ffff-ffff-ffff-ffffffffffff')
        await page.locator('label:has-text("Title")').locator('..').locator('input').fill('Disk failure')
        await page.getByRole('button', { name: 'Create' }).click()
        await expect(page.getByText('Disk failure')).toBeVisible()
    })
})
