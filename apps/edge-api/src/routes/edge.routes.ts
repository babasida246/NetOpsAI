import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes } from 'crypto'
import { env } from '../config/env.js'
import { httpEmpty, httpJson } from '../utils/http.js'
import { isAllowedTarget } from '../utils/allowlist.js'
import { loadEdgeSecrets, saveEdgeSecrets, type EdgeSecrets } from '../storage/edge-secrets.js'
import { cleanupNonces, isNonceUsed, storeNonce } from '../security/nonce-store.js'
import { verifyJobSignature } from '../security/job-signature.js'

type PairResponse = {
    edgeId: string
    authToken: string
    policyBundle: EdgeSecrets['policyBundle']
}

type JobPayload = {
    id: string
    jobType: string
    payload: Record<string, unknown>
    signature: string
    nonce: string
    expiresAt: string
}

function nowIso(): string {
    return new Date().toISOString()
}

function hasBlockedCommand(commands: string[], blocked: string[]): string | null {
    const blockedLower = blocked.map((entry) => entry.toLowerCase())
    for (const command of commands) {
        const lower = command.toLowerCase()
        if (blockedLower.some((entry) => lower.includes(entry))) {
            return command
        }
    }
    return null
}

function getTargetIp(payload: Record<string, unknown>): string | undefined {
    const target = payload.target as { host?: string; ip?: string } | undefined
    return target?.ip ?? target?.host
}

function getConnector(payload: Record<string, unknown>): string | undefined {
    const connector = payload.connector
    if (typeof connector === 'string') return connector
    const connectorType = payload.connectorType
    if (typeof connectorType === 'string') return connectorType
    return undefined
}

export async function edgeRoutes(app: FastifyInstance): Promise<void> {
    app.get('/api/edge/status', async () => {
        const secrets = await loadEdgeSecrets()
        return { paired: Boolean(secrets), edgeId: secrets?.edgeId ?? null }
    })

    app.post('/api/edge/pair', async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as { pairingCode: string; name: string; instanceFingerprint?: string }
        if (!body?.pairingCode || !body?.name) {
            return reply.code(400).send({ error: 'pairingCode and name are required' })
        }

        const instanceFingerprint = body.instanceFingerprint ?? randomBytes(16).toString('hex')
        const response = await httpJson<PairResponse>(`${env.CLOUD_BASE_URL}/api/edge/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pairingCode: body.pairingCode,
                instanceFingerprint,
                name: body.name
            })
        })

        await saveEdgeSecrets({
            edgeId: response.edgeId,
            authToken: response.authToken,
            policyBundle: response.policyBundle
        })

        return reply.send({ edgeId: response.edgeId })
    })

    app.post('/api/edge/jobs/poll', async (_request: FastifyRequest, reply: FastifyReply) => {
        cleanupNonces()
        const secrets = await loadEdgeSecrets()
        if (!secrets) {
            return reply.code(400).send({ error: 'Edge not paired' })
        }

        const jobs = await httpJson<{ jobs: JobPayload[] }>(`${env.CLOUD_BASE_URL}/api/edge/jobs/pull`, {
            method: 'GET',
            headers: { 'x-edge-token': secrets.authToken }
        })

        const results = [] as Array<{ jobId: string; status: 'success' | 'failed'; reason?: string }>

        for (const job of jobs.jobs ?? []) {
            let status: 'success' | 'failed' = 'success'
            let reason: string | undefined

            try {
                if (isNonceUsed(job.nonce)) {
                    throw new Error('Replay detected')
                }

                const signed = verifyJobSignature(job.signature, env.EDGE_JOB_SIGNING_PUBLIC_KEY)
                if (signed.edgeNodeId !== secrets.edgeId) {
                    throw new Error('Edge mismatch')
                }
                if (signed.jobType !== job.jobType || signed.nonce !== job.nonce) {
                    throw new Error('Job payload mismatch')
                }
                if (signed.expiresAt !== job.expiresAt) {
                    throw new Error('Expiry mismatch')
                }
                if (new Date(job.expiresAt) <= new Date()) {
                    throw new Error('Job expired')
                }

                const templateId = job.payload.templateId
                if (typeof templateId !== 'string') {
                    throw new Error('templateId missing')
                }
                if (secrets.policyBundle.allowedTemplates.length > 0 && !secrets.policyBundle.allowedTemplates.includes(templateId)) {
                    throw new Error('Template not allowed')
                }

                const targetIp = getTargetIp(job.payload)
                if (env.EDGE_TARGET_ALLOWLIST.length > 0 && !isAllowedTarget(targetIp, env.EDGE_TARGET_ALLOWLIST)) {
                    throw new Error('Target not allowed by edge allowlist')
                }
                if (secrets.policyBundle.allowTargets.length > 0 && !isAllowedTarget(targetIp, secrets.policyBundle.allowTargets)) {
                    throw new Error('Target not allowed by policy bundle')
                }

                const connector = getConnector(job.payload)
                if (env.EDGE_CONNECTORS_ALLOWED.length > 0) {
                    if (!connector || !env.EDGE_CONNECTORS_ALLOWED.includes(connector)) {
                        throw new Error('Connector not allowed')
                    }
                }

                const rendered = job.payload.renderedCommands
                if (Array.isArray(rendered)) {
                    const blocked = hasBlockedCommand(rendered.map(String), secrets.policyBundle.blockedCommands)
                    if (blocked) {
                        throw new Error('Blocked command detected')
                    }
                }

                if (typeof job.payload.command === 'string') {
                    throw new Error('Raw commands are not allowed')
                }

                const riskLevel = String(job.payload.riskLevel ?? 'R0_READ')
                if ((riskLevel === 'R2_CHANGE' || riskLevel === 'R3_DANGEROUS') && job.payload.approvalGranted !== true) {
                    throw new Error('Approval required')
                }

                storeNonce(job.nonce, job.expiresAt)

                const output = {
                    ok: true,
                    jobType: job.jobType,
                    templateId,
                    dryRun: job.payload.dryRun !== false,
                    executedAt: nowIso()
                }

                await httpEmpty(`${env.CLOUD_BASE_URL}/api/edge/jobs/result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-edge-token': secrets.authToken
                    },
                    body: JSON.stringify({
                        jobId: job.id,
                        status: 'success',
                        output,
                        logs: 'mock execution'
                    })
                })
            } catch (error) {
                status = 'failed'
                reason = error instanceof Error ? error.message : 'Unknown error'

                await httpEmpty(`${env.CLOUD_BASE_URL}/api/edge/jobs/result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-edge-token': secrets.authToken
                    },
                    body: JSON.stringify({
                        jobId: job.id,
                        status: 'failed',
                        output: { ok: false, error: reason },
                        logs: reason
                    })
                })
            }

            results.push({ jobId: job.id, status, reason })
        }

        return reply.send({ processed: results.length, results })
    })
}
