import { Pool } from 'pg'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCHEMA_PATH = join(__dirname, '../packages/infra-postgres/src/schema.sql')
const SCHEMA_NAME = 'schema.sql'

interface MigrationRecord {
    id: number
    name: string
    executed_at: Date
}

async function runMigrations() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required')
    }

    const pool = new Pool({
        connectionString,
        max: 1, // Single connection for migrations
    })

    console.log('🔧 Starting database migrations...')
    console.log(`📁 Schema path: ${SCHEMA_PATH}`)

    try {
        // Create migrations table if not exists
        await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `)

        console.log('✅ Migrations table ready')

        // Get executed migrations
        const { rows: executed } = await pool.query<MigrationRecord>(
            'SELECT name FROM migrations ORDER BY id'
        )
        const executedNames = new Set(executed.map((r) => r.name))

        console.log(`📊 ${executedNames.size} migrations already executed`)

        if (executedNames.has(SCHEMA_NAME)) {
            console.log(`⏭️  Skipping ${SCHEMA_NAME} (already executed)`)
            console.log('\n🎉 Schema already applied. Nothing to do.')
            return
        }

        console.log(`🔄 Running ${SCHEMA_NAME}...`)
        const sql = await readFile(SCHEMA_PATH, 'utf-8')

        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            await client.query(sql)
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [SCHEMA_NAME])
            await client.query('COMMIT')
            console.log(`✅ ${SCHEMA_NAME} completed`)
        } catch (error: any) {
            await client.query('ROLLBACK')
            console.error(`❌ ${SCHEMA_NAME} failed:`, error.message)
            throw error
        } finally {
            client.release()
        }

        console.log('\n🎉 Schema migration completed successfully!')
    } catch (error: any) {
        console.error('💥 Migration failed:', error.message)
        process.exit(1)
    } finally {
        await pool.end()
    }
}

// Run migrations
runMigrations().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})
