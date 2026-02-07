/**
 * Drivers Module - Repository
 */
import type { Pool } from 'pg'
import type { DriverListQueryInput, CreateDriverInput, UpdateDriverInput, DriverPackage } from './drivers.schemas.js'

type DriverRow = {
    id: string
    parent_id: string | null
    vendor: string
    device_type: string
    model: string
    component: string
    os: string
    os_version: string | null
    arch: string
    version: string
    release_date: string | null
    support_status: string
    risk_level: string
    compatibility_notes: string | null
    storage_key: string | null
    filename: string | null
    size_bytes: number | string | null
    mime_type: string | null
    sha256: string | null
    sha1: string | null
    signed: boolean
    signature_info: Record<string, any> | null
    silent_install_cmd: string | null
    silent_uninstall_cmd: string | null
    detect_rules: Record<string, any> | null
    approval_status: string
    requested_by: string | null
    approved_by: string | null
    approved_at: Date | null
    approval_reason: string | null
    tags: string[] | null
    vendor_url: string | null
    release_notes_url: string | null
    created_at: Date
    updated_at: Date
}

function toNumber(value: number | string | null): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim()) return Number(value)
    return 0
}

export class DriversRepository {
    constructor(private db: Pool) { }

    async list(query: DriverListQueryInput): Promise<{ data: DriverPackage[]; total: number }> {
        const conditions: string[] = []
        const params: any[] = []
        let idx = 1

        if (query.vendor) {
            conditions.push(`vendor ILIKE $${idx}`)
            params.push(`%${query.vendor}%`)
            idx++
        }

        if (query.model) {
            conditions.push(`model ILIKE $${idx}`)
            params.push(`%${query.model}%`)
            idx++
        }

        if (query.os) {
            conditions.push(`os = $${idx}`)
            params.push(query.os)
            idx++
        }

        if (query.arch) {
            conditions.push(`arch = $${idx}`)
            params.push(query.arch)
            idx++
        }

        if (query.component) {
            conditions.push(`component = $${idx}`)
            params.push(query.component)
            idx++
        }

        if (query.status) {
            conditions.push(`approval_status = $${idx}`)
            params.push(query.status)
            idx++
        }

        if (query.supportStatus) {
            conditions.push(`support_status = $${idx}`)
            params.push(query.supportStatus)
            idx++
        }

        if (query.riskLevel) {
            conditions.push(`risk_level = $${idx}`)
            params.push(query.riskLevel)
            idx++
        }

        if (query.tag) {
            conditions.push(`tags @> ARRAY[$${idx}]::text[]`)
            params.push(query.tag)
            idx++
        }

        if (query.q) {
            conditions.push(`(
                vendor ILIKE $${idx}
                OR model ILIKE $${idx}
                OR version ILIKE $${idx}
                OR COALESCE(filename, '') ILIKE $${idx}
            )`)
            params.push(`%${query.q}%`)
            idx++
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const allowedSort: Record<string, string> = {
            updatedAt: 'updated_at',
            releaseDate: 'release_date',
            vendor: 'vendor',
            model: 'model',
            version: 'version'
        }
        const sortColumn = allowedSort[query.sort] ?? 'updated_at'
        const sortDirection = sortColumn === 'vendor' || sortColumn === 'model' ? 'ASC' : 'DESC'
        const orderBy = sortColumn === 'release_date'
            ? `${sortColumn} ${sortDirection} NULLS LAST, updated_at DESC`
            : `${sortColumn} ${sortDirection}`

        const limit = query.pageSize
        const offset = (query.page - 1) * query.pageSize

        const count = await this.db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM drivers ${where}`,
            params
        )

        const total = parseInt(count.rows[0]?.count ?? '0', 10)

        const dataResult = await this.db.query<DriverRow>(
            `SELECT
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at
            FROM drivers
            ${where}
            ORDER BY ${orderBy}
            LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, offset]
        )

        return { data: dataResult.rows.map((row) => this.mapDriver(row)), total }
    }

    async getById(id: string): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `SELECT
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at
            FROM drivers
            WHERE id = $1`,
            [id]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async create(data: CreateDriverInput, actorUserId: string): Promise<DriverPackage> {
        const result = await this.db.query<DriverRow>(
            `INSERT INTO drivers (
                parent_id,
                vendor, device_type, model, component,
                os, os_version, arch,
                version, release_date,
                support_status, risk_level, compatibility_notes,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by,
                tags, vendor_url, release_notes_url
            )
            VALUES (
                $1,
                $2, $3, $4, $5,
                $6, $7, $8,
                $9, $10,
                $11, $12, $13,
                $14, $15, $16,
                'draft', $17,
                $18, $19, $20
            )
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [
                data.parentId ?? null,
                data.vendor,
                data.deviceType,
                data.model,
                data.component,
                data.os,
                data.osVersion ?? null,
                data.arch,
                data.version,
                data.releaseDate ?? null,
                data.supportStatus,
                data.riskLevel,
                data.compatibilityNotes ?? null,
                data.install?.silentInstallCmd ?? null,
                data.install?.silentUninstallCmd ?? null,
                data.install?.detectRules ?? null,
                actorUserId,
                data.tags,
                data.links?.vendorUrl ?? null,
                data.links?.releaseNotesUrl ?? null
            ]
        )

        return this.mapDriver(result.rows[0])
    }

    async update(id: string, patch: UpdateDriverInput): Promise<DriverPackage | null> {
        const updates: string[] = []
        const params: any[] = []
        let idx = 1

        const set = (column: string, value: any) => {
            updates.push(`${column} = $${idx}`)
            params.push(value)
            idx++
        }

        if (patch.vendor !== undefined) set('vendor', patch.vendor)
        if (patch.deviceType !== undefined) set('device_type', patch.deviceType)
        if (patch.model !== undefined) set('model', patch.model)
        if (patch.component !== undefined) set('component', patch.component)
        if (patch.os !== undefined) set('os', patch.os)
        if (patch.osVersion !== undefined) set('os_version', patch.osVersion ?? null)
        if (patch.arch !== undefined) set('arch', patch.arch)
        if (patch.version !== undefined) set('version', patch.version)
        if (patch.releaseDate !== undefined) set('release_date', patch.releaseDate ?? null)
        if (patch.supportStatus !== undefined) set('support_status', patch.supportStatus)
        if (patch.riskLevel !== undefined) set('risk_level', patch.riskLevel)
        if (patch.compatibilityNotes !== undefined) set('compatibility_notes', patch.compatibilityNotes ?? null)
        if (patch.tags !== undefined) set('tags', patch.tags)
        if (patch.links?.vendorUrl !== undefined) set('vendor_url', patch.links.vendorUrl ?? null)
        if (patch.links?.releaseNotesUrl !== undefined) set('release_notes_url', patch.links.releaseNotesUrl ?? null)
        if (patch.install?.silentInstallCmd !== undefined) set('silent_install_cmd', patch.install.silentInstallCmd ?? null)
        if (patch.install?.silentUninstallCmd !== undefined) set('silent_uninstall_cmd', patch.install.silentUninstallCmd ?? null)
        if (patch.install?.detectRules !== undefined) set('detect_rules', patch.install.detectRules ?? null)

        if (updates.length === 0) {
            return this.getById(id)
        }

        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${idx}
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [...params, id]
        )

        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async setFileMeta(
        id: string,
        meta: {
            storageKey: string
            filename: string
            sizeBytes: number
            mimeType: string | null
            sha256: string | null
            sha1: string | null
            signed: boolean
            signatureInfo: Record<string, any> | null
        }
    ): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET storage_key = $1,
                filename = $2,
                size_bytes = $3,
                mime_type = $4,
                sha256 = $5,
                sha1 = $6,
                signed = $7,
                signature_info = $8,
                updated_at = NOW()
            WHERE id = $9
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [
                meta.storageKey,
                meta.filename,
                meta.sizeBytes,
                meta.mimeType,
                meta.sha256,
                meta.sha1,
                meta.signed,
                meta.signatureInfo,
                id
            ]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async submitApproval(id: string, actorUserId: string): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET approval_status = 'pending',
                requested_by = $1,
                approved_by = NULL,
                approved_at = NULL,
                approval_reason = NULL,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [actorUserId, id]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async approve(id: string, actorUserId: string, reason: string | null): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET approval_status = 'approved',
                approved_by = $1,
                approved_at = NOW(),
                approval_reason = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [actorUserId, reason, id]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async reject(id: string, actorUserId: string, reason: string): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET approval_status = 'rejected',
                approved_by = $1,
                approved_at = NOW(),
                approval_reason = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [actorUserId, reason, id]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async setSupportStatus(id: string, supportStatus: string): Promise<DriverPackage | null> {
        const result = await this.db.query<DriverRow>(
            `UPDATE drivers
            SET support_status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                id, parent_id, vendor, device_type, model, component, os, os_version, arch, version,
                release_date, support_status, risk_level, compatibility_notes,
                storage_key, filename, size_bytes, mime_type, sha256, sha1, signed, signature_info,
                silent_install_cmd, silent_uninstall_cmd, detect_rules,
                approval_status, requested_by, approved_by, approved_at, approval_reason,
                tags, vendor_url, release_notes_url, created_at, updated_at`,
            [supportStatus, id]
        )
        if (result.rows.length === 0) return null
        return this.mapDriver(result.rows[0])
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.query(`DELETE FROM drivers WHERE id = $1`, [id])
        return (result.rowCount ?? 0) > 0
    }

    private mapDriver(row: DriverRow): DriverPackage {
        const file = row.storage_key
            ? {
                storageKey: row.storage_key,
                filename: row.filename ?? 'artifact',
                size: toNumber(row.size_bytes),
                mime: row.mime_type ?? null,
                sha256: row.sha256 ?? null,
                sha1: row.sha1 ?? null,
                signed: row.signed ?? false,
                signatureInfo: row.signature_info ?? null
            }
            : null

        return {
            id: row.id,
            parentId: row.parent_id,
            vendor: row.vendor,
            deviceType: row.device_type as any,
            model: row.model,
            component: row.component as any,
            os: row.os as any,
            osVersion: row.os_version,
            arch: row.arch as any,
            version: row.version,
            releaseDate: row.release_date,
            supportStatus: row.support_status as any,
            riskLevel: row.risk_level as any,
            compatibilityNotes: row.compatibility_notes,
            file,
            install: {
                silentInstallCmd: row.silent_install_cmd,
                silentUninstallCmd: row.silent_uninstall_cmd,
                detectRules: row.detect_rules
            },
            approval: {
                status: row.approval_status as any,
                requestedBy: row.requested_by,
                approvedBy: row.approved_by,
                approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
                reason: row.approval_reason
            },
            tags: row.tags ?? [],
            links: {
                vendorUrl: row.vendor_url,
                releaseNotesUrl: row.release_notes_url
            },
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString()
        }
    }
}
