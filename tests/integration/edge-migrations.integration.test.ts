import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createEdgePool, closeEdgePool, runMigrations } from '@infra-edge/db'
import type { Pool } from 'pg'

const runIntegration = process.env.RUN_INTEGRATION === 'true'
const describeMaybe = runIntegration ? describe : describe.skip

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const migrationsDir = join(__dirname, '../../apps/edge-api/migrations')
const seedPath = join(__dirname, '../../apps/edge-api/seed/seed-edge.sql')

describeMaybe('integration: edge migrations and seed', () => {
    const edgeDbUrl = process.env.EDGE_DB_URL ?? ''
    let pool: Pool

    beforeAll(async () => {
        expect(edgeDbUrl, 'EDGE_DB_URL required').toBeTruthy()
        pool = createEdgePool({ connectionString: edgeDbUrl })
    })

    afterAll(async () => {
        if (pool) {
            await closeEdgePool(pool)
        }
    })

    it('applies migrations and seed data', async () => {
        await runMigrations(pool, migrationsDir)
        await pool.query('TRUNCATE edge_connectors RESTART IDENTITY')

        const seedSql = await readFile(seedPath, 'utf8')
        await pool.query(seedSql)

        const result = await pool.query<{ name: string }>('SELECT name FROM edge_connectors ORDER BY name')
        const names = result.rows.map((row) => row.name)
        expect(names).toEqual(['snmp', 'ssh', 'syslog', 'zabbix'])
    })
})
