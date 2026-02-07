/**
 * Drivers Module - Service
 */
import type { Pool } from 'pg'
import { BadRequestError, NotFoundError } from '../../shared/errors/http-errors.js'
import type {
    ApprovalActionInput,
    BulkDriversInput,
    CreateDriverInput,
    DriverListQueryInput,
    DriverPackage,
    DriverRecommendationQueryInput,
    UpdateDriverInput
} from './drivers.schemas.js'
import { DriversRepository } from './drivers.repository.js'

export type DriverRecommendation = {
    driver: DriverPackage
    score: number
    explain: string[]
}

type AssetContext = {
    vendor?: string | null
    model?: string | null
}

export function scoreDriverRecommendation(
    driver: DriverPackage,
    ctx: { vendor?: string; model?: string; os?: string; arch?: string; component?: string }
): { score: number; explain: string[] } {
    let score = 0
    const explain: string[] = []

    if (driver.supportStatus === 'blocked') {
        score -= 100
        explain.push('blocked=-100')
    } else if (driver.supportStatus === 'deprecated') {
        score -= 30
        explain.push('deprecated=-30')
    }

    if (ctx.model && driver.model.toLowerCase() === ctx.model.toLowerCase()) {
        score += 50
        explain.push('modelExact=+50')
    }

    if (ctx.vendor && driver.vendor.toLowerCase() === ctx.vendor.toLowerCase()) {
        score += 30
        explain.push('vendorMatch=+30')
    }

    if (ctx.os && ctx.arch && driver.os === ctx.os && driver.arch === ctx.arch) {
        score += 20
        explain.push('osArchExact=+20')
    }

    if (ctx.component && driver.component === ctx.component) {
        score += 10
        explain.push('componentMatch=+10')
    }

    return { score, explain }
}

export class DriversService {
    constructor(
        private repo: DriversRepository,
        private db: Pool
    ) { }

    async listDrivers(query: DriverListQueryInput): Promise<{ data: DriverPackage[]; total: number }> {
        return this.repo.list(query)
    }

    async getDriver(id: string): Promise<DriverPackage> {
        const driver = await this.repo.getById(id)
        if (!driver) {
            throw new NotFoundError('Driver not found')
        }
        return driver
    }

    async createDriver(input: CreateDriverInput, actorUserId: string): Promise<DriverPackage> {
        return this.repo.create(input, actorUserId)
    }

    async updateDriver(id: string, patch: UpdateDriverInput, actorUserId: string): Promise<DriverPackage> {
        const current = await this.getDriver(id)
        if (current.approval.status === 'approved') {
            // Approved artifacts should not be mutated in-place.
            throw new BadRequestError('Approved driver packages are immutable. Create a new version instead.')
        }
        const updated = await this.repo.update(id, patch)
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async submitApproval(id: string, actorUserId: string): Promise<DriverPackage> {
        const current = await this.getDriver(id)
        if (!current.file?.storageKey) {
            throw new BadRequestError('Upload a driver file before submitting for approval')
        }
        const updated = await this.repo.submitApproval(id, actorUserId)
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async approve(id: string, input: ApprovalActionInput, actorUserId: string): Promise<DriverPackage> {
        const current = await this.getDriver(id)
        if (current.approval.status !== 'pending') {
            throw new BadRequestError('Only pending drivers can be approved')
        }
        if ((current.riskLevel === 'high' || current.riskLevel === 'critical') && !input.reason) {
            throw new BadRequestError('Reason is required to approve high/critical risk drivers')
        }
        const updated = await this.repo.approve(id, actorUserId, input.reason ?? null)
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async reject(id: string, input: ApprovalActionInput, actorUserId: string): Promise<DriverPackage> {
        const current = await this.getDriver(id)
        if (current.approval.status !== 'pending') {
            throw new BadRequestError('Only pending drivers can be rejected')
        }
        if (!input.reason) {
            throw new BadRequestError('Reason is required to reject a driver')
        }
        const updated = await this.repo.reject(id, actorUserId, input.reason)
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async block(id: string, reason: string | undefined, actorUserId: string): Promise<DriverPackage> {
        void actorUserId
        if (!reason) {
            throw new BadRequestError('Reason is required to block a driver')
        }
        const updated = await this.repo.setSupportStatus(id, 'blocked')
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async unblock(id: string, reason: string | undefined, actorUserId: string): Promise<DriverPackage> {
        void actorUserId
        if (!reason) {
            throw new BadRequestError('Reason is required to unblock a driver')
        }
        const updated = await this.repo.setSupportStatus(id, 'supported')
        if (!updated) throw new NotFoundError('Driver not found')
        return updated
    }

    async deleteDriver(id: string, reason: string | undefined, actorUserId: string): Promise<void> {
        void actorUserId
        const current = await this.getDriver(id)
        const isApproved = current.approval.status === 'approved'
        if (isApproved && !reason) {
            throw new BadRequestError('Reason is required to delete an approved driver')
        }
        const deleted = await this.repo.delete(id)
        if (!deleted) throw new NotFoundError('Driver not found')
    }

    async bulk(input: BulkDriversInput, actorUserId: string): Promise<{ updated: number }> {
        let updated = 0
        for (const id of input.ids) {
            if (input.action === 'tag/add') {
                if (!input.tag) throw new BadRequestError('tag is required')
                const driver = await this.getDriver(id)
                const tags = Array.from(new Set([...(driver.tags ?? []), input.tag]))
                await this.updateDriver(id, { tags }, actorUserId)
                updated++
                continue
            }

            if (input.action === 'tag/remove') {
                if (!input.tag) throw new BadRequestError('tag is required')
                const driver = await this.getDriver(id)
                const tags = (driver.tags ?? []).filter((t) => t !== input.tag)
                await this.updateDriver(id, { tags }, actorUserId)
                updated++
                continue
            }

            if (input.action === 'setRisk') {
                if (!input.riskLevel) throw new BadRequestError('riskLevel is required')
                await this.updateDriver(id, { riskLevel: input.riskLevel }, actorUserId)
                updated++
                continue
            }

            if (input.action === 'submitApproval') {
                await this.submitApproval(id, actorUserId)
                updated++
                continue
            }

            if (input.action === 'block') {
                await this.block(id, input.reason, actorUserId)
                updated++
                continue
            }

            if (input.action === 'unblock') {
                await this.unblock(id, input.reason, actorUserId)
                updated++
                continue
            }

            if (input.action === 'delete') {
                await this.deleteDriver(id, input.reason, actorUserId)
                updated++
                continue
            }
        }
        return { updated }
    }

    async recommend(query: DriverRecommendationQueryInput, actorRole: string): Promise<DriverRecommendation[]> {
        const includeDraft = actorRole === 'admin' || actorRole === 'super_admin'
        // Start with the direct query context.
        const context = {
            vendor: query.vendor,
            model: query.model,
            os: query.os,
            arch: query.arch,
            component: query.component
        }

        if (query.assetId) {
            const asset = await this.getAssetContext(query.assetId)
            if (!context.vendor && asset.vendor) context.vendor = asset.vendor
            if (!context.model && asset.model) context.model = asset.model
        }

        // Keep recommendations strict by default: approved + not blocked.
        const baseQuery: DriverListQueryInput = {
            page: 1,
            pageSize: 200,
            sort: 'updatedAt',
            vendor: context.vendor,
            model: context.model,
            os: context.os as any,
            arch: context.arch as any,
            component: context.component as any,
            status: includeDraft ? undefined : 'approved',
            supportStatus: undefined,
            riskLevel: undefined,
            tag: undefined,
            q: undefined
        }

        const { data } = await this.repo.list(baseQuery)
        const filtered = includeDraft
            ? data
            : data.filter((driver) => driver.approval.status === 'approved' && driver.supportStatus !== 'blocked')

        return filtered
            .map((driver) => {
                const { score, explain } = scoreDriverRecommendation(driver, context)
                return { driver, score, explain }
            })
            .filter((rec) => rec.score > -100) // hide blocked by default
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
    }

    private async getAssetContext(assetId: string): Promise<AssetContext> {
        // Best-effort lookup. Asset DB schema differs between deployments; failures should not block recommendations.
        try {
            const result = await this.db.query<{ vendor: string | null; model: string | null }>(
                `
                SELECT
                    v.name as vendor,
                    m.model as model
                FROM assets a
                LEFT JOIN asset_models m ON m.id = a.model_id
                LEFT JOIN vendors v ON v.id = COALESCE(a.vendor_id, m.vendor_id)
                WHERE a.id = $1
                LIMIT 1
                `,
                [assetId]
            )
            return result.rows[0] ?? {}
        } catch {
            return {}
        }
    }
}
