import type { Pool } from 'pg'

export type EdgeJobRecord = {
    id: string
    jobType: string
    payload: Record<string, unknown>
    signature: string
    nonce: string
    expiresAt: string
}

export type EdgeJobsStore = {
    recordReceived: (job: EdgeJobRecord) => Promise<void>
    recordResult: (jobId: string, status: 'success' | 'failed', result: unknown, error?: string) => Promise<void>
}

export function createEdgeJobsStore(pool: Pool): EdgeJobsStore {
    return {
        async recordReceived(job: EdgeJobRecord): Promise<void> {
            await pool.query(
                `INSERT INTO edge_jobs (id, job_type, payload, signature, nonce, expires_at, status, received_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'received', NOW())
                 ON CONFLICT (id)
                 DO UPDATE SET job_type = EXCLUDED.job_type,
                               payload = EXCLUDED.payload,
                               signature = EXCLUDED.signature,
                               nonce = EXCLUDED.nonce,
                               expires_at = EXCLUDED.expires_at,
                               status = 'received',
                               received_at = NOW()`,
                [job.id, job.jobType, job.payload, job.signature, job.nonce, job.expiresAt]
            )
        },
        async recordResult(jobId: string, status: 'success' | 'failed', result: unknown, error?: string): Promise<void> {
            await pool.query(
                `UPDATE edge_jobs
                 SET status = $2,
                     result = $3,
                     error = $4,
                     processed_at = NOW()
                 WHERE id = $1`,
                [jobId, status, result, error ?? null]
            )
        }
    }
}
