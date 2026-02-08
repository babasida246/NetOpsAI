/**
 * Drivers Module - Routes
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Pool } from 'pg'

import type { AuthService } from '../auth/auth.service.js'
import { AdminRepository } from '../admin/admin.repository.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../shared/errors/http-errors.js'
import {
    approvalActionSchema,
    bulkDriversSchema,
    createDriverSchema,
    driverListQuerySchema,
    driverRecommendationQuerySchema,
    idParamSchema,
    updateDriverSchema
} from './drivers.schemas.js'
import { DriversRepository } from './drivers.repository.js'
import { DriversService } from './drivers.service.js'

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? process.env.ASSET_UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads')

const DRIVER_FILE_EXT_ALLOWLIST = new Set(['.inf', '.cab', '.msi', '.exe', '.zip', '.rar', '.7z'])
const UPLOAD_TOKEN_SECRET = process.env.UPLOAD_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'upload-secret'

const deleteBodySchema = z.object({
    reason: z.string().trim().min(1).optional()
})

function sanitizeFileName(name: string): string {
    const base = path.basename(name)
    return base.replace(/[^\w.-]/g, '_')
}

function buildStorageKey(driverId: string, fileName: string): { storageKey: string; filePath: string } {
    const safeName = sanitizeFileName(fileName)
    const storageKey = path.posix.join('drivers', driverId, `${crypto.randomUUID()}-${safeName || 'artifact'}`)
    const filePath = path.resolve(UPLOAD_ROOT, storageKey)
    return { storageKey, filePath }
}

type UploadTokenPayload = {
    driverId: string
    userId: string
    storageKey: string
    filename: string
    mimeType: string | null
    exp: number
}

function signUploadToken(payload: UploadTokenPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', UPLOAD_TOKEN_SECRET).update(data).digest('hex')
    return `${data}.${sig}`
}

function verifyUploadToken(token: string): UploadTokenPayload {
    const [data, sig] = token.split('.', 2)
    if (!data || !sig) {
        throw new BadRequestError('Invalid upload token')
    }
    const expected = crypto.createHmac('sha256', UPLOAD_TOKEN_SECRET).update(data).digest('hex')
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        throw new ForbiddenError('Invalid upload token signature')
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as UploadTokenPayload
    if (!payload?.exp || payload.exp <= Date.now()) {
        throw new ForbiddenError('Upload token expired')
    }
    return payload
}

export async function driversRoutes(
    fastify: FastifyInstance,
    deps: { db: Pool; authService: AuthService }
): Promise<void> {
    const repo = new DriversRepository(deps.db)
    const service = new DriversService(repo, deps.db)
    const adminRepo = new AdminRepository(deps.db)

    const authenticate = async (request: any) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }
        const token = authHeader.substring(7)
        request.user = deps.authService.verifyAccessToken(token)
    }

    const requireAdmin = (request: any) => {
        const role = request.user?.role
        if (role !== 'admin' && role !== 'super_admin') {
            throw new ForbiddenError('Insufficient role for this action')
        }
    }

    const audit = async (request: any, action: string, resourceId: string | undefined, details: Record<string, any>) => {
        try {
            await adminRepo.createAuditLog({
                userId: request.user?.sub,
                action,
                resource: 'drivers',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write drivers audit log')
        }
    }

    // ==================== Drivers CRUD ====================

    fastify.get('/drivers', {
        schema: {
            tags: ['Drivers'],
            summary: 'List driver packages',
            security: [{ bearerAuth: [] }],
            querystring: zodToJsonSchema(driverListQuerySchema)
        },
        preHandler: authenticate
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const query = driverListQuerySchema.parse(request.query)
        const { data, total } = await service.listDrivers(query)
        return reply.send({
            data,
            meta: {
                page: query.page,
                pageSize: query.pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / query.pageSize))
            }
        })
    })

    fastify.post('/drivers', {
        schema: {
            tags: ['Drivers'],
            summary: 'Create driver package (draft)',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(createDriverSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const body = createDriverSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const created = await service.createDriver(body, actor)
        await audit(request, 'drivers.create', created.id, {
            vendor: created.vendor,
            model: created.model,
            component: created.component,
            os: created.os,
            arch: created.arch,
            version: created.version
        })
        return reply.status(201).send({ data: created })
    })

    fastify.get('/drivers/:id', {
        schema: {
            tags: ['Drivers'],
            summary: 'Get driver by ID',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        const { id } = idParamSchema.parse(request.params)
        const driver = await service.getDriver(id)
        return reply.send({ data: driver })
    })

    fastify.put('/drivers/:id', {
        schema: {
            tags: ['Drivers'],
            summary: 'Update driver (draft/pending only)',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(updateDriverSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = updateDriverSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.updateDriver(id, body, actor)
        await audit(request, 'drivers.update', id, { patch: body })
        return reply.send({ data: updated })
    })

    fastify.delete('/drivers/:id', {
        schema: {
            tags: ['Drivers'],
            summary: 'Delete driver',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(deleteBodySchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = deleteBodySchema.parse(request.body ?? {})
        const actor = request.user?.sub ?? 'system'
        await service.deleteDriver(id, body.reason, actor)
        await audit(request, 'drivers.delete', id, { reason: body.reason ?? null })
        return reply.status(204).send()
    })

    // ==================== Files ====================

    // Upload driver file (direct upload via multipart)
    fastify.post('/drivers/:id/upload', {
        schema: {
            tags: ['Drivers'],
            summary: 'Upload driver package file (multipart) OR request a presigned-like PUT URL',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const actor = request.user?.sub ?? 'system'

        // Ensure driver exists
        await service.getDriver(id)

        // If not multipart, return a signed upload URL for a subsequent PUT.
        if (!request.isMultipart?.()) {
            const bodySchema = z.object({
                filename: z.string().min(1),
                mimeType: z.string().optional()
            })
            const body = bodySchema.parse(request.body ?? {})
            const ext = path.extname(body.filename).toLowerCase()
            if (!DRIVER_FILE_EXT_ALLOWLIST.has(ext)) {
                throw new BadRequestError(`Unsupported file type: ${ext}`)
            }
            const { storageKey } = buildStorageKey(id, body.filename)
            const token = signUploadToken({
                driverId: id,
                userId: actor,
                storageKey,
                filename: body.filename,
                mimeType: body.mimeType ?? null,
                exp: Date.now() + 10 * 60 * 1000
            })
            return reply.send({
                data: {
                    storageKey,
                    uploadUrl: `/api/v1/drivers/${id}/upload?token=${encodeURIComponent(token)}`,
                    method: 'PUT',
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
                }
            })
        }

        const file = await request.file()
        if (!file) throw new BadRequestError('File is required')

        const filename = file.filename ?? 'driver'
        const ext = path.extname(filename).toLowerCase()
        if (!DRIVER_FILE_EXT_ALLOWLIST.has(ext)) {
            throw new BadRequestError(`Unsupported file type: ${ext}`)
        }

        const { storageKey, filePath } = buildStorageKey(id, filename)
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })

        const hash = crypto.createHash('sha256')
        let sizeBytes = 0

        file.file.on('data', (chunk: Buffer) => {
            sizeBytes += chunk.length
            hash.update(chunk)
        })

        await pipeline(file.file, fs.createWriteStream(filePath))

        const sha256 = hash.digest('hex')
        const updated = await repo.setFileMeta(id, {
            storageKey,
            filename,
            sizeBytes,
            mimeType: file.mimetype ?? null,
            sha256,
            sha1: null,
            signed: false,
            signatureInfo: null
        })
        if (!updated) throw new NotFoundError('Driver not found')

        await audit(request, 'drivers.upload', id, { storageKey, filename, sizeBytes, sha256 })
        return reply.status(200).send({ data: updated })
    })

    // Upload driver file via a signed (presigned-like) PUT URL.
    fastify.put('/drivers/:id/upload', {
        schema: {
            tags: ['Drivers'],
            summary: 'Presigned-like PUT upload (tokenized).',
            params: zodToJsonSchema(idParamSchema),
            querystring: {
                type: 'object',
                properties: {
                    token: { type: 'string' }
                },
                required: ['token']
            }
        }
    }, async (request: any, reply) => {
        const { id } = idParamSchema.parse(request.params)
        const token = String((request.query as any)?.token ?? '')
        const payload = verifyUploadToken(token)

        if (payload.driverId !== id) {
            throw new ForbiddenError('Upload token does not match target driver')
        }

        const filePath = path.resolve(UPLOAD_ROOT, payload.storageKey)
        if (!filePath.startsWith(UPLOAD_ROOT)) {
            throw new NotFoundError('Invalid storage path')
        }

        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })

        const hash = crypto.createHash('sha256')
        let sizeBytes = 0

        request.raw.on('data', (chunk: Buffer) => {
            sizeBytes += chunk.length
            hash.update(chunk)
        })

        await pipeline(request.raw, fs.createWriteStream(filePath))
        const sha256 = hash.digest('hex')

        const updated = await repo.setFileMeta(id, {
            storageKey: payload.storageKey,
            filename: payload.filename,
            sizeBytes,
            mimeType: payload.mimeType ?? (request.headers['content-type'] as string | undefined) ?? null,
            sha256,
            sha1: null,
            signed: false,
            signatureInfo: null
        })
        if (!updated) throw new NotFoundError('Driver not found')

        // Audit as the actor who requested the signed URL.
        await adminRepo.createAuditLog({
            userId: payload.userId,
            action: 'drivers.upload',
            resource: 'drivers',
            resourceId: id,
            details: { storageKey: payload.storageKey, filename: payload.filename, sizeBytes, sha256, via: 'presigned' },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        })

        return reply.send({ data: updated })
    })

    // Download driver file (approved + not blocked)
    fastify.get('/drivers/:id/download', {
        schema: {
            tags: ['Drivers'],
            summary: 'Download driver file',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        const { id } = idParamSchema.parse(request.params)
        const driver = await service.getDriver(id)

        // Only allow download for approved and not blocked.
        if (driver.approval.status !== 'approved') {
            throw new ForbiddenError('Driver is not approved for download')
        }
        if (driver.supportStatus === 'blocked') {
            throw new ForbiddenError('Driver is blocked')
        }
        if (!driver.file?.storageKey) {
            throw new NotFoundError('Driver file not available')
        }

        const filePath = path.resolve(UPLOAD_ROOT, driver.file.storageKey)
        if (!filePath.startsWith(UPLOAD_ROOT)) {
            throw new NotFoundError('Invalid storage path')
        }
        await fs.promises.access(filePath).catch(() => {
            throw new NotFoundError('File missing')
        })

        await audit(request, 'drivers.download', id, { storageKey: driver.file.storageKey })

        reply.header('Content-Type', driver.file.mime ?? 'application/octet-stream')
        reply.header('Content-Disposition', `attachment; filename="${sanitizeFileName(driver.file.filename)}"`)
        return reply.send(fs.createReadStream(filePath))
    })

    // ==================== Approval Workflow ====================

    fastify.post('/drivers/:id/submit-approval', {
        schema: {
            tags: ['Drivers'],
            summary: 'Submit driver for approval',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.submitApproval(id, actor)
        await audit(request, 'drivers.submit_approval', id, {})
        return reply.send({ data: updated })
    })

    fastify.post('/drivers/:id/approve', {
        schema: {
            tags: ['Drivers'],
            summary: 'Approve driver',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(approvalActionSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = approvalActionSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.approve(id, body, actor)
        await audit(request, 'drivers.approve', id, { reason: body.reason ?? null, note: body.note ?? null })
        return reply.send({ data: updated })
    })

    fastify.post('/drivers/:id/reject', {
        schema: {
            tags: ['Drivers'],
            summary: 'Reject driver',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(approvalActionSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = approvalActionSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.reject(id, body, actor)
        await audit(request, 'drivers.reject', id, { reason: body.reason ?? null, note: body.note ?? null })
        return reply.send({ data: updated })
    })

    fastify.post('/drivers/:id/block', {
        schema: {
            tags: ['Drivers'],
            summary: 'Block driver',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(approvalActionSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = approvalActionSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.block(id, body.reason, actor)
        await audit(request, 'drivers.block', id, { reason: body.reason ?? null })
        return reply.send({ data: updated })
    })

    fastify.post('/drivers/:id/unblock', {
        schema: {
            tags: ['Drivers'],
            summary: 'Unblock driver',
            security: [{ bearerAuth: [] }],
            params: zodToJsonSchema(idParamSchema),
            body: zodToJsonSchema(approvalActionSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const { id } = idParamSchema.parse(request.params)
        const body = approvalActionSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const updated = await service.unblock(id, body.reason, actor)
        await audit(request, 'drivers.unblock', id, { reason: body.reason ?? null })
        return reply.send({ data: updated })
    })

    // ==================== Bulk ====================

    fastify.post('/drivers/bulk', {
        schema: {
            tags: ['Drivers'],
            summary: 'Bulk driver actions',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(bulkDriversSchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        requireAdmin(request)
        const body = bulkDriversSchema.parse(request.body)
        const actor = request.user?.sub ?? 'system'
        const result = await service.bulk(body, actor)
        await audit(request, 'drivers.bulk', undefined, { action: body.action, ids: body.ids, tag: body.tag, riskLevel: body.riskLevel })
        return reply.send({ data: result })
    })

    // ==================== Recommendations ====================

    fastify.get('/drivers/recommendations', {
        schema: {
            tags: ['Drivers'],
            summary: 'Recommend drivers for a context',
            security: [{ bearerAuth: [] }],
            querystring: zodToJsonSchema(driverRecommendationQuerySchema)
        },
        preHandler: authenticate
    }, async (request: any, reply) => {
        const query = driverRecommendationQuerySchema.parse(request.query)
        const role = request.user?.role ?? 'user'
        const data = await service.recommend(query, role)
        return reply.send({ data })
    })
}
