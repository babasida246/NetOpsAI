import { mkdir } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'

const execFileAsync = promisify(execFile)

export type EdgeBackupOptions = {
    edgeDbUrl?: string
    edgeRedisUrl?: string
    backupDir?: string
    dryRun?: boolean
    now?: Date
    execFile?: typeof execFileAsync
}

export async function runEdgeBackup(options: EdgeBackupOptions = {}): Promise<{ dbPath: string; redisPath: string }> {
    const edgeDbUrl = options.edgeDbUrl ?? process.env.EDGE_DB_URL
    const edgeRedisUrl = options.edgeRedisUrl ?? process.env.EDGE_REDIS_URL
    const backupDir = options.backupDir ?? process.env.EDGE_BACKUP_DIR ?? 'backups/edge'
    const dryRun = options.dryRun ?? process.env.EDGE_BACKUP_DRY_RUN === 'true'
    const now = options.now ?? new Date()
    const exec = options.execFile ?? execFileAsync

    if (!edgeDbUrl) {
        throw new Error('EDGE_DB_URL environment variable is required')
    }
    if (!edgeRedisUrl) {
        throw new Error('EDGE_REDIS_URL environment variable is required')
    }

    const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:.]/g, '-')
    const dbBackupPath = join(backupDir, `edge-db-${timestamp}.dump`)
    const redisBackupPath = join(backupDir, `edge-redis-${timestamp}.rdb`)

    await mkdir(backupDir, { recursive: true })

    if (!dryRun) {
        await exec('pg_dump', ['--dbname', edgeDbUrl, '--format', 'custom', '--file', dbBackupPath])
        await exec('redis-cli', ['-u', edgeRedisUrl, '--rdb', redisBackupPath])
    }

    console.log(`Edge database backup saved to ${dbBackupPath}`)
    console.log(`Edge redis backup saved to ${redisBackupPath}`)

    return { dbPath: dbBackupPath, redisPath: redisBackupPath }
}

// Only run automatically if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runEdgeBackup().catch((error) => {
        console.error('Edge backup failed:', error)
        process.exit(1)
    })
}
