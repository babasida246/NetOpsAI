import { test, expect } from '@playwright/test'

type Asset = {
    id: string
    assetCode: string
    status: string
    modelName?: string
    vendorName?: string
    locationName?: string
    serialNo?: string
    mgmtIp?: string
    warrantyEnd?: string
    createdAt: string
    updatedAt: string
}

type Assignment = {
    id: string
    assetId: string
    assigneeType: string
    assigneeId: string
    assigneeName: string
    assignedAt: string
    returnedAt?: string | null
}

type Ticket = {
    id: string
    assetId: string
    title: string
    severity: string
    status: string
    openedAt: string
}

type Attachment = {
    id: string
    assetId: string
    fileName: string
    storageKey: string
    version: number
    sizeBytes?: number
    createdAt: string
}

type Event = {
    id: string
    assetId: string
    eventType: string
    payload: Record<string, unknown>
    createdAt: string
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

function nowIso(): string {
    return new Date('2025-01-10T10:00:00Z').toISOString()
}

test.describe('Asset detail UI', () => {
    test('assign, return, maintenance, attachments, and timeline', async ({ page }) => {
        await applyAuth(page)

        const assetId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        const asset: Asset = {
            id: assetId,
            assetCode: 'ASSET-100',
            status: 'in_stock',
            modelName: 'Latitude',
            vendorName: 'Dell',
            locationName: 'HQ',
            serialNo: 'SN-100',
            mgmtIp: '10.0.0.100',
            warrantyEnd: '2026-01-01',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z'
        }

        let assignments: Assignment[] = []
        let maintenance: Ticket[] = []
        let attachments: Attachment[] = []
        let timeline: Event[] = [
            {
                id: 'event-1',
                assetId,
                eventType: 'CREATED',
                payload: { assetCode: 'ASSET-100' },
                createdAt: nowIso()
            }
        ]

        await page.route(/\/v1\/assets\/[^/]+\/timeline(?:\?.*)?$/, async (route) => {
            await route.fulfill({ json: { data: timeline } })
        })

        await page.route(/\/v1\/assets\/[^/]+\/attachments(?:\?.*)?$/, async (route) => {
            if (route.request().method() === 'POST') {
                const newAttachment: Attachment = {
                    id: `att-${attachments.length + 1}`,
                    assetId,
                    fileName: 'handover.pdf',
                    storageKey: 'upload/handover.pdf',
                    version: attachments.length + 1,
                    sizeBytes: 1234,
                    createdAt: nowIso()
                }
                attachments = [...attachments, newAttachment]
                await route.fulfill({ json: { data: newAttachment } })
                return
            }
            await route.fulfill({ json: { data: attachments } })
        })

        await page.route(/\/v1\/assets\/[^/]+\/assign$/, async (route) => {
            const body = route.request().postDataJSON() as { assigneeType?: string; assigneeName?: string; assigneeId?: string }
            const assignment: Assignment = {
                id: `assign-${assignments.length + 1}`,
                assetId,
                assigneeType: body.assigneeType ?? 'person',
                assigneeId: body.assigneeId ?? 'EMP-1',
                assigneeName: body.assigneeName ?? 'Test User',
                assignedAt: nowIso()
            }
            assignments = [assignment]
            timeline = [
                {
                    id: `event-${timeline.length + 1}`,
                    assetId,
                    eventType: 'ASSIGNED',
                    payload: { assigneeName: assignment.assigneeName },
                    createdAt: nowIso()
                },
                ...timeline
            ]
            await route.fulfill({ json: { data: { asset, assignment } } })
        })

        await page.route(/\/v1\/assets\/[^/]+\/return$/, async (route) => {
            assignments = assignments.map((item) => ({
                ...item,
                returnedAt: nowIso()
            }))
            const assignment = assignments[0]
            timeline = [
                {
                    id: `event-${timeline.length + 1}`,
                    assetId,
                    eventType: 'UNASSIGNED',
                    payload: { note: 'Returned' },
                    createdAt: nowIso()
                },
                ...timeline
            ]
            await route.fulfill({ json: { data: { asset, assignment } } })
        })

        await page.route(/\/v1\/maintenance(?:\?.*)?$/, async (route) => {
            const body = route.request().postDataJSON() as { title?: string; severity?: string }
            const ticket: Ticket = {
                id: `maint-${maintenance.length + 1}`,
                assetId,
                title: body.title ?? 'Repair',
                severity: body.severity ?? 'low',
                status: 'open',
                openedAt: nowIso()
            }
            maintenance = [...maintenance, ticket]
            timeline = [
                {
                    id: `event-${timeline.length + 1}`,
                    assetId,
                    eventType: 'MAINT_OPEN',
                    payload: { title: ticket.title },
                    createdAt: nowIso()
                },
                ...timeline
            ]
            await route.fulfill({ json: { data: ticket } })
        })

        await page.route(/\/v1\/assets\/[^/]+$/, async (route) => {
            if (route.request().method() !== 'GET') {
                await route.fulfill({ status: 405 })
                return
            }
            await route.fulfill({
                json: { data: { asset, assignments, maintenance } }
            })
        })

        await page.goto(`/assets/${assetId}`)
        await expect(page.getByRole('heading', { name: asset.assetCode })).toBeVisible()
        await expect(page.getByText('Overview')).toBeVisible()

        await page.getByRole('button', { name: 'Assign' }).click()
        await page.locator('label:has-text("Assignee Name")').locator('..').locator('input').fill('Nguyen Test')
        await page.locator('label:has-text("Assignee ID")').locator('..').locator('input').fill('EMP-100')
        await page.getByRole('dialog').getByRole('button', { name: 'Assign' }).click()
        await expect(page.getByRole('cell', { name: 'Nguyen Test' })).toBeVisible()
        await expect(page.getByText('ASSIGNED', { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Return' }).click()
        await page.locator('label:has-text("Return Note")').locator('..').locator('input').fill('Returned')
        await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click()
        await expect(page.getByText('UNASSIGNED')).toBeVisible()

        await page.getByRole('button', { name: 'Maintenance' }).click()
        await page.locator('label:has-text("Title")').locator('..').locator('input').fill('Battery issue')
        await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click()
        const maintenanceTable = page.getByRole('table').filter({
            has: page.getByRole('columnheader', { name: 'Title' })
        })
        await expect(maintenanceTable.getByRole('cell', { name: 'Battery issue' })).toBeVisible()
        await expect(page.getByText('MAINT_OPEN')).toBeVisible()

        await page.locator('input[type="file"]').setInputFiles({
            name: 'handover.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4 test', 'utf-8')
        })
        await page.getByRole('button', { name: 'Upload' }).click()
        await expect(page.getByText('handover.pdf')).toBeVisible()
    })
})
