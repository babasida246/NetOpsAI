import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { EdgeJobPayload, EdgePairResponse, PairingCodeResponse } from './edge.types.js'
import { EdgeRepository } from './edge.repository.js'
import { env } from '../../config/env.js'
import {
    enforceChangeControls,
    enforceReason,
    isWriteRisk,
    normalizeRiskLevel
} from '../../shared/security/netops-guard.js'

export class EdgeService {
    constructor(private repository: EdgeRepository) { }

    async createPairingCode(tenantId: string, ttlMinutes = 10): Promise<PairingCodeResponse> {
        const pairingCode = crypto.randomBytes(4).toString('hex').toUpperCase()
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
        await this.repository.createPairingCode(tenantId, pairingCode, expiresAt)

        return { pairingCode, expiresAt: expiresAt.toISOString() }
    }

    async pairEdge(pairingCode: string, instanceFingerprint: string, name: string): Promise<EdgePairResponse> {
        const pairing = await this.repository.consumePairingCode(pairingCode)
        if (!pairing || pairing.consumed_at) {
            throw new Error('Pairing code invalid or already used')
        }
        if (pairing.expires_at <= new Date()) {
            throw new Error('Pairing code expired')
        }

        const authToken = crypto.randomBytes(32).toString('hex')
        const policyBundle = {
            allowedConnectors: ['ssh', 'snmp', 'zabbix', 'syslog'],
            maxConcurrency: 3,
            allowTargets: [],
            allowedTemplates: [],
            blockedCommands: ['reset', 'reload', 'format', 'erase']
        }

        const edgeNode = await this.repository.createEdgeNode(
            pairing.tenant_id,
            name,
            instanceFingerprint,
            authToken,
            policyBundle
        )

        await this.repository.markPairingConsumed(pairing.id, edgeNode.id)

        return {
            edgeId: edgeNode.id,
            authToken: edgeNode.auth_token,
            policyBundle: edgeNode.policy_bundle
        }
    }

    async pullJobs(edgeToken: string, limit = 5): Promise<EdgeJobPayload[]> {
        const edgeNode = await this.repository.getEdgeNodeByToken(edgeToken)
        if (!edgeNode) {
            throw new Error('Edge token invalid')
        }

        const jobs = await this.repository.listQueuedJobs(edgeNode.id, limit)
        await this.repository.markJobsRunning(jobs.map((job) => job.id))

        return jobs.map((job) => ({
            id: job.id,
            jobType: job.job_type,
            payload: job.payload,
            signature: job.signature,
            nonce: job.nonce,
            expiresAt: job.expires_at.toISOString()
        }))
    }

    async submitResult(
        edgeToken: string,
        jobId: string,
        status: 'success' | 'failed',
        output: Record<string, unknown>,
        logs?: string
    ): Promise<void> {
        const edgeNode = await this.repository.getEdgeNodeByToken(edgeToken)
        if (!edgeNode) {
            throw new Error('Edge token invalid')
        }

        const job = await this.repository.getJobById(jobId)
        if (!job) {
            throw new Error('Job not found')
        }
        if (job.edge_node_id !== edgeNode.id) {
            throw new Error('Job does not belong to edge node')
        }
        if (job.expires_at <= new Date()) {
            throw new Error('Job expired')
        }
        if (!this.verifySignature(job.edge_node_id, job.job_type, job.payload, job.nonce, job.expires_at, job.signature)) {
            throw new Error('Job signature invalid')
        }

        await this.repository.updateJobStatus(jobId, status === 'success' ? 'completed' : 'failed')
        await this.repository.createJobResult(jobId, status, output, logs)
    }

    async createJob(
        tenantId: string,
        edgeNodeId: string,
        jobType: string,
        payload: Record<string, unknown>,
        expiresInSeconds = 60
    ): Promise<string> {
        this.assertSafePayload(payload)
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
        const nonce = crypto.randomBytes(10).toString('hex')
        const signature = this.signJob(edgeNodeId, jobType, payload, nonce, expiresAt)

        return this.repository.createJob(tenantId, edgeNodeId, jobType, payload, signature, nonce, expiresAt)
    }

    private signJob(
        edgeNodeId: string,
        jobType: string,
        payload: Record<string, unknown>,
        nonce: string,
        expiresAt: Date
    ): string {
        return jwt.sign(
            {
                edgeNodeId,
                jobType,
                nonce,
                expiresAt: expiresAt.toISOString(),
                payload
            },
            env.EDGE_JOB_SIGNING_PRIVATE_KEY,
            { algorithm: 'RS256' }
        )
    }

    private verifySignature(
        edgeNodeId: string,
        jobType: string,
        payload: Record<string, unknown>,
        nonce: string,
        expiresAt: Date,
        signature: string
    ): boolean {
        try {
            const decoded = jwt.verify(signature, env.EDGE_JOB_SIGNING_PUBLIC_KEY, { algorithms: ['RS256'] }) as {
                edgeNodeId: string
                jobType: string
                nonce: string
                expiresAt: string
                payload: Record<string, unknown>
            }

            return (
                decoded.edgeNodeId === edgeNodeId &&
                decoded.jobType === jobType &&
                decoded.nonce === nonce &&
                decoded.expiresAt === expiresAt.toISOString() &&
                JSON.stringify(decoded.payload) === JSON.stringify(payload)
            )
        } catch {
            return false
        }
    }

    private assertSafePayload(payload: Record<string, unknown>): void {
        if (typeof payload.command === 'string') {
            throw new Error('Raw commands are not allowed; use templateId + params')
        }

        const templateId = payload.templateId
        if (!templateId || typeof templateId !== 'string') {
            throw new Error('templateId is required for edge jobs')
        }

        const params = payload.params
        if (params && typeof params !== 'object') {
            throw new Error('params must be an object')
        }

        const riskLevel = normalizeRiskLevel(String(payload.riskLevel ?? 'R0_READ'))
        enforceReason(riskLevel, typeof payload.reason === 'string' ? payload.reason : undefined)

        enforceChangeControls({
            level: riskLevel,
            changeRequestId: typeof payload.changeRequestId === 'string' ? payload.changeRequestId : undefined,
            approvalGranted: Boolean(payload.approvalGranted),
            dryRun: payload.dryRun === true,
            rollbackPlan: typeof payload.rollbackPlan === 'string' ? payload.rollbackPlan : undefined,
            precheck: Array.isArray(payload.precheck) ? payload.precheck.map(String) : undefined,
            postcheck: Array.isArray(payload.postcheck) ? payload.postcheck.map(String) : undefined,
            maintenanceWindowId: typeof payload.maintenanceWindowId === 'string' ? payload.maintenanceWindowId : undefined,
            breakGlass: payload.breakGlass === true,
            requireMaintenanceWindow: false,
            breakGlassAllowed: payload.breakGlass === true
        })

        if (isWriteRisk(riskLevel) && payload.readonly === true) {
            throw new Error('Write risk level cannot be marked as readonly')
        }
    }
}
