import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import fs from 'node:fs'
import path from 'node:path'
import { attachmentRoutes } from '../../src/routes/v1/attachments.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { AttachmentService } from '@application/core'
import type { AttachmentRecord } from '@contracts/shared'

describe('attachment routes', () => {
    let app: ReturnType<typeof Fastify>
    let attachmentService: AttachmentService
    const uploadRoot = path.resolve(process.cwd(), 'uploads')

    const attachment: AttachmentRecord = {
        id: 'attach-1',
        assetId: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        storageKey: 'assets/123e4567-e89b-12d3-a456-426614174000/test.txt',
        sizeBytes: 5,
        version: 1,
        uploadedBy: 'user-1',
        correlationId: 'corr-1',
        createdAt: new Date()
    }

    beforeEach(async () => {
        app = Fastify()
        await app.register(multipart)
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        attachmentService = {
            addAttachmentMeta: vi.fn().mockImplementation(async (assetId, input) => ({
                ...attachment,
                id: 'attach-2',
                assetId,
                fileName: input.fileName,
                mimeType: input.mimeType ?? null,
                storageKey: input.storageKey,
                sizeBytes: input.sizeBytes ?? null
            })),
            listAttachments: vi.fn().mockResolvedValue([attachment]),
            getAttachment: vi.fn().mockResolvedValue(attachment)
        } as unknown as AttachmentService

        await app.register(attachmentRoutes, { prefix: '/v1', attachmentService })
    })

    afterEach(async () => {
        await app.close()
        await fs.promises.rm(uploadRoot, { recursive: true, force: true })
    })

    it('uploads attachment with manager role', async () => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        const payload = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="test.txt"',
            'Content-Type: text/plain',
            '',
            'hello',
            `--${boundary}--`,
            ''
        ].join('\r\n')

        const response = await app.inject({
            method: 'POST',
            url: `/v1/assets/${attachment.assetId}/attachments`,
            headers: {
                'x-user-id': 'user-1',
                'x-user-role': 'it_asset_manager',
                'content-type': `multipart/form-data; boundary=${boundary}`
            },
            payload
        })

        expect(response.statusCode).toBe(201)
    })

    it('lists attachments', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/v1/assets/${attachment.assetId}/attachments`,
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveLength(1)
    })
})
