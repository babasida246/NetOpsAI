import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile } from 'fs/promises'
import { createEdgePool, closeEdgePool } from '@infra-edge/db'

const edgeDbUrl = process.env.EDGE_DB_URL
if (!edgeDbUrl) {
    throw new Error('EDGE_DB_URL environment variable is required')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const seedPath = join(__dirname, '../../seed/seed-edge.sql')

const pool = createEdgePool({ connectionString: edgeDbUrl })

async function seed(): Promise<void> {
    const sql = await readFile(seedPath, 'utf8')
    await pool.query(sql)
    console.log('Edge seed data applied.')
}

seed()
    .catch((error) => {
        console.error('Edge seed failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await closeEdgePool(pool)
    })
