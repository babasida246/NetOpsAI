import type { FastifyInstance } from 'fastify'
import type { AssetService } from '@application/core'
import { assetImportCommitSchema, assetImportPreviewSchema } from './assets.import.schemas.js'
import { requireRole } from './assets.helpers.js'

interface AssetImportRoutesOptions {
    assetService: AssetService
}

export async function assetImportRoutes(
    fastify: FastifyInstance,
    opts: AssetImportRoutesOptions
): Promise<void> {
    const assetService = opts.assetService

    fastify.post('/assets/import/preview', async (request, reply) => {
        requireRole(request, ['it_asset_manager'])
        const body = assetImportPreviewSchema.parse(request.body)
        const result = await assetService.bulkImportPreview(body.rows)
        return reply.send({ data: result })
    })

    fastify.post('/assets/import/commit', async (request, reply) => {
        const ctx = requireRole(request, ['it_asset_manager'])
        const body = assetImportCommitSchema.parse(request.body)
        const result = await assetService.bulkImportCommit(body.rows, ctx)
        return reply.send({ data: result })
    })
}
