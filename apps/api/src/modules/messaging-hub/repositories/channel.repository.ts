import type { Pool } from 'pg'

export type ChannelRecord = {
    id: string
    type: 'telegram' | 'discord' | 'email'
    name: string
    config: Record<string, unknown>
    enabled: boolean
    createdAt: string
}

export class ChannelRepository {
    constructor(private db: Pool) { }

    async findByType(type: ChannelRecord['type']): Promise<ChannelRecord | null> {
        const result = await this.db.query(
            `SELECT id, type, name, config, enabled, created_at
       FROM channels
       WHERE type = $1
       ORDER BY created_at ASC
       LIMIT 1`,
            [type]
        )
        if (!result.rows[0]) return null
        return this.mapRow(result.rows[0])
    }

    async findById(id: string): Promise<ChannelRecord | null> {
        const result = await this.db.query(
            `SELECT id, type, name, config, enabled, created_at
       FROM channels
       WHERE id = $1`,
            [id]
        )
        if (!result.rows[0]) return null
        return this.mapRow(result.rows[0])
    }

    async ensureDefault(type: ChannelRecord['type']): Promise<ChannelRecord> {
        const existing = await this.findByType(type)
        if (existing) return existing

        const name = `${type}-default`
        const result = await this.db.query(
            `INSERT INTO channels (type, name, config, enabled)
       VALUES ($1, $2, $3, true)
       RETURNING id, type, name, config, enabled, created_at`,
            [type, name, {}]
        )
        return this.mapRow(result.rows[0])
    }

    private mapRow(row: any): ChannelRecord {
        return {
            id: row.id,
            type: row.type,
            name: row.name,
            config: row.config ?? {},
            enabled: row.enabled,
            createdAt: row.created_at.toISOString()
        }
    }
}
