import type { Pool } from 'pg'

export type EdgeConnectorRecord = {
    name: string
    config: Record<string, unknown>
    updatedAt: string
}

export type EdgeConnectorsStore = {
    list: () => Promise<EdgeConnectorRecord[]>
    upsert: (name: string, config: Record<string, unknown>) => Promise<void>
}

export function createEdgeConnectorsStore(pool: Pool): EdgeConnectorsStore {
    return {
        async list(): Promise<EdgeConnectorRecord[]> {
            const result = await pool.query<{
                name: string
                config: Record<string, unknown>
                updated_at: Date
            }>('SELECT name, config, updated_at FROM edge_connectors ORDER BY name')
            return result.rows.map((row) => ({
                name: row.name,
                config: row.config,
                updatedAt: row.updated_at.toISOString()
            }))
        },
        async upsert(name: string, config: Record<string, unknown>): Promise<void> {
            await pool.query(
                `INSERT INTO edge_connectors (name, config, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (name)
                 DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
                [name, config]
            )
        }
    }
}
