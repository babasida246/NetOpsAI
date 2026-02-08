import type { Pool } from 'pg'

interface PairingRow {
    id: string
    tenant_id: string
    expires_at: Date
    consumed_at: Date | null
}

interface EdgeNodeRow {
    id: string
    tenant_id: string
    name: string
    instance_fingerprint: string
    auth_token: string
    policy_bundle: Record<string, unknown>
}

interface EdgeJobRow {
    id: string
    job_type: string
    payload: Record<string, unknown>
    signature: string
    nonce: string
    expires_at: Date
}

interface EdgeJobDetailRow extends EdgeJobRow {
    edge_node_id: string
    status: string
}

export class EdgeRepository {
    constructor(private db: Pool) { }

    async createPairingCode(tenantId: string, pairingCode: string, expiresAt: Date): Promise<void> {
        await this.db.query(
            `INSERT INTO edge_pairings (tenant_id, pairing_code, expires_at)
             VALUES ($1, $2, $3)`,
            [tenantId, pairingCode, expiresAt]
        )
    }

    async consumePairingCode(pairingCode: string): Promise<PairingRow | null> {
        const result = await this.db.query<PairingRow>(
            `SELECT id, tenant_id, expires_at, consumed_at
             FROM edge_pairings
             WHERE pairing_code = $1`,
            [pairingCode]
        )
        return result.rows[0] ?? null
    }

    async markPairingConsumed(pairingId: string, edgeNodeId: string): Promise<void> {
        await this.db.query(
            `UPDATE edge_pairings
             SET consumed_at = NOW(), edge_node_id = $2
             WHERE id = $1`,
            [pairingId, edgeNodeId]
        )
    }

    async createEdgeNode(
        tenantId: string,
        name: string,
        instanceFingerprint: string,
        authToken: string,
        policyBundle: Record<string, unknown>
    ): Promise<EdgeNodeRow> {
        const result = await this.db.query<EdgeNodeRow>(
            `INSERT INTO edge_nodes (tenant_id, name, instance_fingerprint, auth_token, policy_bundle)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, tenant_id, name, instance_fingerprint, auth_token, policy_bundle`,
            [tenantId, name, instanceFingerprint, authToken, policyBundle]
        )
        return result.rows[0]
    }

    async getEdgeNodeByToken(token: string): Promise<EdgeNodeRow | null> {
        const result = await this.db.query<EdgeNodeRow>(
            `SELECT id, tenant_id, name, instance_fingerprint, auth_token, policy_bundle
             FROM edge_nodes
             WHERE auth_token = $1`,
            [token]
        )
        return result.rows[0] ?? null
    }

    async listQueuedJobs(edgeNodeId: string, limit: number): Promise<EdgeJobRow[]> {
        const result = await this.db.query<EdgeJobRow>(
            `SELECT id, job_type, payload, signature, nonce, expires_at
             FROM edge_jobs
             WHERE edge_node_id = $1
               AND status = 'queued'
               AND expires_at > NOW()
             ORDER BY created_at ASC
             LIMIT $2`,
            [edgeNodeId, limit]
        )
        return result.rows
    }

    async getJobById(jobId: string): Promise<EdgeJobDetailRow | null> {
        const result = await this.db.query<EdgeJobDetailRow>(
            `SELECT id, edge_node_id, job_type, payload, signature, nonce, expires_at, status
             FROM edge_jobs
             WHERE id = $1`,
            [jobId]
        )
        return result.rows[0] ?? null
    }

    async markJobsRunning(jobIds: string[]): Promise<void> {
        if (jobIds.length === 0) return
        await this.db.query(
            `UPDATE edge_jobs
             SET status = 'running'
             WHERE id = ANY($1::uuid[])`,
            [jobIds]
        )
    }

    async createJob(
        tenantId: string,
        edgeNodeId: string,
        jobType: string,
        payload: Record<string, unknown>,
        signature: string,
        nonce: string,
        expiresAt: Date
    ): Promise<string> {
        const result = await this.db.query<{ id: string }>(
            `INSERT INTO edge_jobs (tenant_id, edge_node_id, job_type, payload, signature, nonce, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [tenantId, edgeNodeId, jobType, payload, signature, nonce, expiresAt]
        )
        return result.rows[0].id
    }

    async updateJobStatus(jobId: string, status: string): Promise<void> {
        await this.db.query(
            `UPDATE edge_jobs SET status = $2 WHERE id = $1`,
            [jobId, status]
        )
    }

    async createJobResult(jobId: string, status: string, output: Record<string, unknown>, logs?: string): Promise<void> {
        await this.db.query(
            `INSERT INTO edge_job_results (job_id, status, output, logs)
             VALUES ($1, $2, $3, $4)`,
            [jobId, status, output, logs ?? null]
        )
    }
}
