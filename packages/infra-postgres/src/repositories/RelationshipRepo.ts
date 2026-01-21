import type { IRelRepo, RelationshipRecord } from '@contracts/shared'
import type { Queryable } from './types.js'

type RelRow = {
    id: string
    rel_type_id: string
    from_ci_id: string
    to_ci_id: string
    status: RelationshipRecord['status']
    since_date: string | null
    note: string | null
    created_at: Date
}

const mapRow = (row: RelRow): RelationshipRecord => ({
    id: row.id,
    relTypeId: row.rel_type_id,
    fromCiId: row.from_ci_id,
    toCiId: row.to_ci_id,
    status: row.status,
    sinceDate: row.since_date ?? null,
    note: row.note ?? null,
    createdAt: row.created_at
})

export class RelationshipRepo implements IRelRepo {
    constructor(private pg: Queryable) { }

    async create(input: {
        relTypeId: string
        fromCiId: string
        toCiId: string
        sinceDate?: string | null
        note?: string | null
    }): Promise<RelationshipRecord> {
        const result = await this.pg.query<RelRow>(
            `INSERT INTO cmdb_relationships (rel_type_id, from_ci_id, to_ci_id, since_date, note)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id, rel_type_id, from_ci_id, to_ci_id, status, since_date, note, created_at`,
            [input.relTypeId, input.fromCiId, input.toCiId, input.sinceDate ?? null, input.note ?? null]
        )
        return mapRow(result.rows[0])
    }

    async retire(id: string): Promise<RelationshipRecord | null> {
        const result = await this.pg.query<RelRow>(
            `UPDATE cmdb_relationships
             SET status = 'retired'
             WHERE id = $1
             RETURNING id, rel_type_id, from_ci_id, to_ci_id, status, since_date, note, created_at`,
            [id]
        )
        return result.rows[0] ? mapRow(result.rows[0]) : null
    }

    async listByCi(ciId: string): Promise<RelationshipRecord[]> {
        const result = await this.pg.query<RelRow>(
            `SELECT id, rel_type_id, from_ci_id, to_ci_id, status, since_date, note, created_at
             FROM cmdb_relationships
             WHERE status = 'active' AND (from_ci_id = $1 OR to_ci_id = $1)
             ORDER BY created_at DESC`,
            [ciId]
        )
        return result.rows.map(mapRow)
    }
}
