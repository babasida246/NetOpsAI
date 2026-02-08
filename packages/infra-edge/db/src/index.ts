import { Pool, type PoolClient } from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface EdgeDbConfig {
    connectionString: string
}

export function createEdgePool(config: EdgeDbConfig): Pool {
    return new Pool({ connectionString: config.connectionString })
}

export async function closeEdgePool(pool: Pool): Promise<void> {
    await pool.end()
}

export async function ensureMigrationsTable(client: PoolClient): Promise<void> {
    await client.query(
        `CREATE TABLE IF NOT EXISTS edge_schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
    )
}

export async function runMigrations(pool: Pool, migrationsDir: string): Promise<string[]> {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        await ensureMigrationsTable(client)
        const applied = await client.query<{ id: string }>('SELECT id FROM edge_schema_migrations')
        const appliedIds = new Set(applied.rows.map((row) => row.id))

        const files = (await readdir(migrationsDir))
            .filter((file) => file.endsWith('.sql'))
            .sort()

        const executed: string[] = []
        for (const file of files) {
            if (appliedIds.has(file)) continue
            const sql = await readFile(path.join(migrationsDir, file), 'utf8')
            await client.query(sql)
            await client.query('INSERT INTO edge_schema_migrations (id) VALUES ($1)', [file])
            executed.push(file)
        }

        await client.query('COMMIT')
        return executed
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
