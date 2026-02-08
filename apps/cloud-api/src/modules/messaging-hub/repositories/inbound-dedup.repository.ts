import type { Pool } from 'pg'

export class InboundDedupRepository {
    constructor(private db: Pool) { }

    async recordIfNew(channelId: string, externalEventId: string): Promise<boolean> {
        try {
            await this.db.query(
                `INSERT INTO inbound_dedup (channel_id, external_event_id)
         VALUES ($1, $2)`,
                [channelId, externalEventId]
            )
            return true
        } catch (error: any) {
            if (error?.code === '23505') {
                return false
            }
            throw error
        }
    }
}
