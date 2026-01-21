import type { CiAttrValueInput, CiAttrValueRecord, ICiAttrValueRepo } from '@contracts/shared'
import type { Queryable } from './types.js'

type AttrRow = {
    id: string
    ci_id: string
    version_id: string
    key: string
    value: unknown | null
    updated_at: Date
}

const mapRow = (row: AttrRow): CiAttrValueRecord => ({
    id: row.id,
    ciId: row.ci_id,
    versionId: row.version_id,
    key: row.key,
    value: row.value ?? undefined,
    updatedAt: row.updated_at
})

export class CiAttrValueRepo implements ICiAttrValueRepo {
    constructor(private pg: Queryable) { }

    async listByCi(ciId: string): Promise<CiAttrValueRecord[]> {
        const result = await this.pg.query<AttrRow>(
            `SELECT id, ci_id, version_id, key, value, updated_at
             FROM cmdb_ci_attr_values
             WHERE ci_id = $1
             ORDER BY key ASC`,
            [ciId]
        )
        return result.rows.map(mapRow)
    }

    async upsertMany(ciId: string, versionId: string, values: CiAttrValueInput[]): Promise<CiAttrValueRecord[]> {
        if (values.length === 0) return []
        const columns = ['ci_id', 'version_id', 'key', 'value']
        const params: unknown[] = []
        const placeholders = values.map((value, index) => {
            const base = index * columns.length
            params.push(ciId, versionId, value.key, value.value ?? null)
            const items = columns.map((_, colIndex) => `$${base + colIndex + 1}`)
            return `(${items.join(', ')})`
        })

        const result = await this.pg.query<AttrRow>(
            `INSERT INTO cmdb_ci_attr_values (${columns.join(', ')})
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (ci_id, key)
             DO UPDATE SET value = EXCLUDED.value, version_id = EXCLUDED.version_id, updated_at = NOW()
             RETURNING id, ci_id, version_id, key, value, updated_at`,
            params
        )
        return result.rows.map(mapRow)
    }
}
