import type { IRelTypeRepo, RelationshipTypeRecord } from '@contracts/shared'
import type { Queryable } from './types.js'

type RelTypeRow = {
    id: string
    code: string
    name: string
    reverse_name: string | null
    allowed_from_type_id: string | null
    allowed_to_type_id: string | null
}

const mapRow = (row: RelTypeRow): RelationshipTypeRecord => ({
    id: row.id,
    code: row.code,
    name: row.name,
    reverseName: row.reverse_name,
    allowedFromTypeId: row.allowed_from_type_id,
    allowedToTypeId: row.allowed_to_type_id
})

export class RelationshipTypeRepo implements IRelTypeRepo {
    constructor(private pg: Queryable) { }

    async create(input: {
        code: string
        name: string
        reverseName?: string | null
        allowedFromTypeId?: string | null
        allowedToTypeId?: string | null
    }): Promise<RelationshipTypeRecord> {
        const result = await this.pg.query<RelTypeRow>(
            `INSERT INTO cmdb_relationship_types (code, name, reverse_name, allowed_from_type_id, allowed_to_type_id)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id, code, name, reverse_name, allowed_from_type_id, allowed_to_type_id`,
            [
                input.code,
                input.name,
                input.reverseName ?? null,
                input.allowedFromTypeId ?? null,
                input.allowedToTypeId ?? null
            ]
        )
        return mapRow(result.rows[0])
    }

    async list(): Promise<RelationshipTypeRecord[]> {
        const result = await this.pg.query<RelTypeRow>(
            `SELECT id, code, name, reverse_name, allowed_from_type_id, allowed_to_type_id
             FROM cmdb_relationship_types
             ORDER BY name ASC`
        )
        return result.rows.map(mapRow)
    }

    async getById(id: string): Promise<RelationshipTypeRecord | null> {
        const result = await this.pg.query<RelTypeRow>(
            `SELECT id, code, name, reverse_name, allowed_from_type_id, allowed_to_type_id
             FROM cmdb_relationship_types
             WHERE id = $1`,
            [id]
        )
        return result.rows[0] ? mapRow(result.rows[0]) : null
    }
}
