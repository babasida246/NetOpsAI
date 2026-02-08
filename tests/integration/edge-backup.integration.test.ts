import { describe, expect, it } from 'vitest'
import { runEdgeBackup } from '../../scripts/edge-backup.js'

describe('integration: edge backup script', () => {
    it('builds backup paths without executing in dry-run mode', async () => {
        const calls: Array<{ cmd: string; args: string[] }> = []
        const now = new Date('2026-02-08T10:00:00Z')

        const result = await runEdgeBackup({
            edgeDbUrl: 'postgresql://edge:password@localhost:5433/netopsai_edge',
            edgeRedisUrl: 'redis://:password@localhost:6380/0',
            backupDir: 'backups/test',
            dryRun: true,
            now,
            execFile: async (cmd, args) => {
                calls.push({ cmd, args })
                return { stdout: '', stderr: '' }
            }
        })

        expect(calls).toHaveLength(0)
        expect(result.dbPath).toContain('edge-db-2026-02-08T10-00-00Z.dump')
        expect(result.redisPath).toContain('edge-redis-2026-02-08T10-00-00Z.rdb')
    })
})
