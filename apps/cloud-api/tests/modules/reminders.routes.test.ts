import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { reminderRoutes } from '../../src/routes/v1/reports/reminders.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { ReminderService } from '@application/core'
import type { ReminderRecord } from '@contracts/shared'

describe('reminder routes', () => {
    let app: ReturnType<typeof Fastify>
    let reminderService: ReminderService

    const reminder: ReminderRecord = {
        id: 'rem-1',
        reminderType: 'warranty_expiring',
        assetId: 'asset-1',
        dueAt: new Date(),
        status: 'pending',
        channel: 'ui',
        createdAt: new Date(),
        sentAt: null,
        correlationId: 'corr-1'
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        reminderService = {
            listReminders: vi.fn().mockResolvedValue({ items: [reminder], total: 1, page: 1, limit: 20 }),
            runWarrantyReminders: vi.fn().mockResolvedValue({ created: 1 })
        } as unknown as ReminderService

        await app.register(reminderRoutes, { prefix: '/v1', reminderService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists reminders', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/assets/reminders',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
    })

    it('rejects run without admin', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/reminders/run',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { days: [30] }
        })

        expect(response.statusCode).toBe(403)
    })

    it('runs reminders as admin', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/assets/reminders/run',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'admin' },
            payload: { days: [30] }
        })

        expect(response.statusCode).toBe(200)
    })
})
