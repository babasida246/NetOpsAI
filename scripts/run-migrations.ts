import { Pool } from 'pg'
import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MIGRATIONS_DIR = join(__dirname, '../packages/infra-postgres/src/migrations')

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
    console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}`)

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

        // Get migration files
        const files = (await readdir(MIGRATIONS_DIR))
            .filter((f) => f.endsWith('.sql'))
            .sort()

        console.log(`📋 Found ${files.length} migration files`)

        let executedCount = 0
        let skippedCount = 0

        // Run pending migrations
        for (const file of files) {
            if (executedNames.has(file)) {
                console.log(`⏭️  Skipping ${file} (already executed)`)
                skippedCount++
                continue
            }

            console.log(`🔄 Running ${file}...`)
            const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')

            const client = await pool.connect()
            try {
                await client.query('BEGIN')

                // Execute migration SQL
                await client.query(sql)

                // Record migration
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [file])

                await client.query('COMMIT')

                console.log(`✅ ${file} completed`)
                executedCount++
            } catch (error: any) {
                await client.query('ROLLBACK')
                console.error(`❌ ${file} failed:`, error.message)
                throw error
            } finally {
                client.release()
            }
        }

        console.log('\n📊 Migration Summary:')
        console.log(`   ✅ Executed: ${executedCount}`)
        console.log(`   ⏭️  Skipped: ${skippedCount}`)
        console.log(`   📁 Total: ${files.length}`)
        console.log('\n🎉 All migrations completed successfully!')
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
