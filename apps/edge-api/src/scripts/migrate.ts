import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createEdgePool, runMigrations, closeEdgePool } from '@infra-edge/db'

const edgeDbUrl = process.env.EDGE_DB_URL
if (!edgeDbUrl) {
    throw new Error('EDGE_DB_URL environment variable is required')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const migrationsDir = join(__dirname, '../../migrations')

const pool = createEdgePool({ connectionString: edgeDbUrl })

async function migrate(): Promise<void> {
    const executed = await runMigrations(pool, migrationsDir)
    if (executed.length === 0) {
        console.log('No new edge migrations to apply.')
        return
    }
    console.log(`Applied edge migrations: ${executed.join(', ')}`)
}

migrate()
    .catch((error) => {
        console.error('Edge migrations failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await closeEdgePool(pool)
    })
