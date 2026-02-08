import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { workflowRoutes } from '../../src/routes/v1/workflow/workflow.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { WorkflowService } from '@application/core'
import type { WorkflowRequestRecord } from '@contracts/shared'

describe('workflow routes', () => {
    let app: ReturnType<typeof Fastify>
    let workflowService: WorkflowService

    const requestRecord: WorkflowRequestRecord = {
        id: '123e4567-e89b-12d3-a456-426614174009',
        requestType: 'assign',
        assetId: '123e4567-e89b-12d3-a456-426614174000',
        fromDept: 'IT',
        toDept: 'HR',
        requestedBy: 'user-1',
        approvedBy: null,
        status: 'submitted',
        payload: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        correlationId: 'corr-1'
    }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        workflowService = {
            submitRequest: vi.fn().mockResolvedValue(requestRecord),
            listRequests: vi.fn().mockResolvedValue({ items: [requestRecord], total: 1, page: 1, limit: 20 }),
            getRequest: vi.fn().mockResolvedValue(requestRecord),
            approveRequest: vi.fn().mockResolvedValue({ ...requestRecord, status: 'approved' }),
            rejectRequest: vi.fn().mockResolvedValue({ ...requestRecord, status: 'rejected' }),
            executeRequest: vi.fn().mockResolvedValue({ ...requestRecord, status: 'done' })
        } as unknown as WorkflowService

        await app.register(workflowRoutes, { prefix: '/v1', workflowService })
    })

    afterEach(async () => {
        await app.close()
    })

    it('lists workflow requests', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/workflows',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        expect(workflowService.listRequests).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: 'user-1' }))
    })

    it('forces requestedBy filter for non-privileged roles', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/workflows?requestedBy=other-user',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        expect(workflowService.listRequests).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: 'user-1' }))
    })

    it('returns 404 when a non-privileged user tries to access another user request', async () => {
        (workflowService.getRequest as any).mockResolvedValueOnce({
            ...requestRecord,
            requestedBy: 'user-2'
        })

        const response = await app.inject({
            method: 'GET',
            url: `/v1/workflows/${requestRecord.id}`,
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(404)
    })

    it('rejects submit without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/workflows',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { requestType: 'assign' }
        })

        expect(response.statusCode).toBe(403)
    })

    it('submits workflow request with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/workflows',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { requestType: 'assign', assetId: requestRecord.assetId }
        })

        expect(response.statusCode).toBe(201)
    })
})
