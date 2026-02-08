import type { Pool } from 'pg'

export class AlertDedupRepository {
    constructor(private db: Pool) { }

    async shouldSend(dedupKey: string, throttleMs: number): Promise<boolean> {
        const result = await this.db.query(
            `SELECT dedup_key, last_sent_at, count
       FROM alert_dedup
       WHERE dedup_key = $1`,
            [dedupKey]
        )

        if (!result.rows[0]) {
            await this.db.query(
                `INSERT INTO alert_dedup (dedup_key, last_sent_at, count)
         VALUES ($1, NOW(), 1)`,
                [dedupKey]
            )
            return true
        }

        const lastSentAt = new Date(result.rows[0].last_sent_at)
        const now = Date.now()
        if (now - lastSentAt.getTime() < throttleMs) {
            return false
        }

        await this.db.query(
            `UPDATE alert_dedup
       SET last_sent_at = NOW(), count = count + 1
       WHERE dedup_key = $1`,
            [dedupKey]
        )

        return true
    }
}
