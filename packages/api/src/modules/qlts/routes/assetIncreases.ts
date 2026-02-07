import type { FastifyPluginAsync } from 'fastify'
import type { AssetIncreaseRepo, ApprovalRepo, PgClient } from '@infra-postgres/shared'
import { WorkflowService } from '../services/WorkflowService.js'
import {
    CreateAssetIncreaseSchema,
    UpdateAssetIncreaseSchema,
    ListAssetIncreasesQuerySchema,
    SubmitAssetIncreaseSchema
} from '../schemas/assetIncrease.js'
import { ApproveRejectSchema } from '../schemas/purchasePlan.js'

export const assetIncreaseRoutes: FastifyPluginAsync = async (fastify) => {
    const assetIncreaseRepo = fastify.diContainer.resolve<AssetIncreaseRepo>('assetIncreaseRepo')
    const approvalRepo = fastify.diContainer.resolve<ApprovalRepo>('approvalRepo')
    const pgClient = fastify.diContainer.resolve<PgClient>('pgClient')

    const workflowService = new WorkflowService(pgClient, approvalRepo)

    // POST /api/v1/qlts/asset-increases
    fastify.post('/', {
        schema: {
            body: CreateAssetIncreaseSchema
        }
    }, async (request, reply) => {
        const userId = request.user?.id || 'system'
        const doc = await assetIncreaseRepo.create(request.body, userId)
        return { data: doc }
    })

    // GET /api/v1/qlts/asset-increases
    fastify.get('/', {
        schema: {
            querystring: ListAssetIncreasesQuerySchema
        }
    }, async (request, reply) => {
        const query = ListAssetIncreasesQuerySchema.parse(request.query)
        const result = await assetIncreaseRepo.list(query)
        return {
            data: result.items,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / query.limit)
            }
        }
    })

    // GET /api/v1/qlts/asset-increases/:id
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const doc = await assetIncreaseRepo.getById(id)
        if (!doc) {
            return reply.code(404).send({ error: 'Asset increase document not found' })
        }
        return { data: doc }
    })

    // PUT /api/v1/qlts/asset-increases/:id
    fastify.put('/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: UpdateAssetIncreaseSchema
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const existing = await assetIncreaseRepo.getById(id)
        if (!existing) {
            return reply.code(404).send({ error: 'Asset increase document not found' })
        }
        if (existing.status !== 'draft') {
            return reply.code(400).send({ error: 'Can only edit draft documents' })
        }
        const doc = await assetIncreaseRepo.update(id, request.body)
        return { data: doc }
    })

    // POST /api/v1/qlts/asset-increases/:id/submit
    fastify.post('/:id/submit', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: SubmitAssetIncreaseSchema
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { approvers } = request.body
        const userId = request.user?.id || 'system'

        const doc = await assetIncreaseRepo.getById(id)
        if (!doc) {
            return reply.code(404).send({ error: 'Asset increase document not found' })
        }

        const transition = await workflowService.canTransition('asset_increase', id, doc.status, 'submitted', userId)
        if (!transition.allowed) {
            return reply.code(400).send({ error: transition.reason })
        }

        await assetIncreaseRepo.updateStatus(id, 'submitted', userId)
        const approvalRecords = await workflowService.submitForApproval('asset_increase', id, approvers)

        return { data: { status: 'submitted', approvals: approvalRecords } }
    })

    // POST /api/v1/qlts/asset-increases/:id/approve
    fastify.post('/:id/approve', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: ApproveRejectSchema
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { approvalId, note } = request.body
        const userId = request.user?.id || 'system'

        await workflowService.approve(approvalId, userId, note)

        const approvals = await workflowService.getApprovalHistory('asset_increase', id)
        const allApproved = approvals.every(a => a.decision === 'approved')

        if (allApproved) {
            await assetIncreaseRepo.updateStatus(id, 'approved', userId)
        }

        return { data: { approved: true, allApproved } }
    })

    // POST /api/v1/qlts/asset-increases/:id/reject
    fastify.post('/:id/reject', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: ApproveRejectSchema
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const { approvalId, note } = request.body
        const userId = request.user?.id || 'system'

        if (!note) {
            return reply.code(400).send({ error: 'Rejection reason required' })
        }

        await workflowService.reject(approvalId, userId, note)
        await assetIncreaseRepo.updateStatus(id, 'rejected', userId)

        return { data: { rejected: true } }
    })

    // POST /api/v1/qlts/asset-increases/:id/post
    fastify.post('/:id/post', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const userId = request.user?.id || 'system'

        const doc = await assetIncreaseRepo.getById(id)
        if (!doc) {
            return reply.code(404).send({ error: 'Asset increase document not found' })
        }

        const transition = await workflowService.canTransition('asset_increase', id, doc.status, 'posted', userId)
        if (!transition.allowed) {
            return reply.code(400).send({ error: transition.reason })
        }

        await pgClient.transaction(async (client) => {
            for (const line of doc.lines) {
                const assetResult = await client.query<{ id: string }>(
                    `INSERT INTO assets (
                        code, name, category_id, model_id, serial_number,
                        original_cost, current_value, acquisition_date,
                        in_service_date, warranty_end_date,
                        location_id, custodian_id, status, created_by,
                        ref_doc_type, source_doc_id, source_doc_no
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    RETURNING id`,
                    [
                        line.assetCode || `AST-${Date.now()}-${line.lineNo}`,
                        line.assetName,
                        line.categoryId,
                        line.modelId,
                        line.serialNumber,
                        line.originalCost,
                        line.currentValue || line.originalCost,
                        line.acquisitionDate || doc.docDate,
                        line.inServiceDate,
                        line.warrantyEndDate,
                        line.locationId,
                        line.custodianId,
                        'active',
                        userId,
                        'asset_increase',
                        doc.id,
                        doc.docNo
                    ]
                )

                await client.query(
                    `UPDATE asset_increase_lines SET asset_id = $1 WHERE id = $2`,
                    [assetResult.rows[0].id, line.id]
                )

                if (line.modelId) {
                    await client.query(
                        `UPDATE asset_models 
                         SET current_stock_qty = COALESCE(current_stock_qty, 0) + $1,
                             updated_at = NOW()
                         WHERE id = $2`,
                        [line.quantity, line.modelId]
                    )
                }
            }

            await client.query(
                `UPDATE asset_increase_docs 
                 SET status = $1, posted_by = $2, posted_at = NOW(), updated_at = NOW()
                 WHERE id = $3`,
                ['posted', userId, id]
            )
        })

        return { data: { posted: true, assetsCreated: doc.lines.length } }
    })

    // DELETE /api/v1/qlts/asset-increases/:id/cancel
    fastify.delete('/:id/cancel', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const userId = request.user?.id || 'system'

        const doc = await assetIncreaseRepo.getById(id)
        if (!doc) {
            return reply.code(404).send({ error: 'Asset increase document not found' })
        }

        if (!['draft', 'submitted'].includes(doc.status)) {
            return reply.code(400).send({ error: 'Can only cancel draft or submitted documents' })
        }

        await assetIncreaseRepo.updateStatus(id, 'cancelled', userId)
        return { data: { cancelled: true } }
    })
}
