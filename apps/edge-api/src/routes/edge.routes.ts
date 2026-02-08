import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes } from 'crypto'
import { env as defaultEnv, type EdgeEnv } from '../config/env.js'
import { httpEmpty, httpJson } from '../utils/http.js'
import { isAllowedTarget } from '../utils/allowlist.js'
import { verifyJobSignature } from '../security/job-signature.js'
import type { NonceStore } from '../security/nonce-store.js'
import type { EdgeSecretsStore } from '../storage/edge-secrets.js'
import type { EdgeJobsStore } from '../storage/edge-jobs.js'
import type { EdgeConnectorsStore } from '../storage/edge-connectors.js'
import { redactLogDetails } from '@security/core'

type PairResponse = {
    edgeId: string
    authToken: string
    policyBundle: {
        allowedConnectors: string[]
        maxConcurrency: number
        allowTargets: string[]
        allowedTemplates: string[]
        blockedCommands: string[]
    }
}

type JobPayload = {
    id: string
    jobType: string
    payload: Record<string, unknown>
    signature: string
    nonce: string
    expiresAt: string
}

type EdgeRouteDeps = {
    env?: EdgeEnv
    secretsStore: EdgeSecretsStore
    jobsStore: EdgeJobsStore
    connectorsStore: EdgeConnectorsStore
    nonceStore: NonceStore
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

export async function edgeRoutes(app: FastifyInstance, deps: EdgeRouteDeps): Promise<void> {
    const config = deps.env ?? defaultEnv

    app.get('/api/edge/status', async () => {
        const secrets = await deps.secretsStore.load()
        return { paired: Boolean(secrets), edgeId: secrets?.edgeId ?? null }
    })

    app.post('/api/edge/pair', async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as { pairingCode: string; name: string; instanceFingerprint?: string }
        if (!body?.pairingCode || !body?.name) {
            return reply.code(400).send({ error: 'pairingCode and name are required' })
        }

        const instanceFingerprint = body.instanceFingerprint ?? randomBytes(16).toString('hex')
        const response = await httpJson<PairResponse>(`${config.CLOUD_BASE_URL}/api/edge/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pairingCode: body.pairingCode,
                instanceFingerprint,
                name: body.name
            })
        })

        await deps.secretsStore.save({
            edgeId: response.edgeId,
            authToken: response.authToken,
            policyBundle: response.policyBundle
        })

        return reply.send({ edgeId: response.edgeId })
    })

    app.get('/api/edge/connectors', async () => {
        const connectors = await deps.connectorsStore.list()
        return {
            connectors: connectors.map((item) => ({
                name: item.name,
                config: redactLogDetails(item.config),
                updatedAt: item.updatedAt
            }))
        }
    })

    app.put('/api/edge/connectors/:name', async (request: FastifyRequest, reply: FastifyReply) => {
        const name = (request.params as { name?: string }).name
        if (!name) {
            return reply.code(400).send({ error: 'connector name is required' })
        }
        const body = (request.body ?? {}) as { config?: Record<string, unknown> }
        await deps.connectorsStore.upsert(name, body.config ?? {})
        return reply.send({ ok: true })
    })

    app.get('/api/edge/connectors/allowed', async () => {
        const secrets = await deps.secretsStore.load()
        return {
            allowed: config.EDGE_CONNECTORS_ALLOWED,
            policy: secrets?.policyBundle.allowedConnectors ?? []
        }
    })

    app.post('/api/edge/jobs/poll', async (_request: FastifyRequest, reply: FastifyReply) => {
        const secrets = await deps.secretsStore.load()
        if (!secrets) {
            return reply.code(400).send({ error: 'Edge not paired' })
        }

        const jobs = await httpJson<{ jobs: JobPayload[] }>(`${config.CLOUD_BASE_URL}/api/edge/jobs/pull`, {
            method: 'GET',
            headers: { 'x-edge-token': secrets.authToken }
        })

        const results = [] as Array<{ jobId: string; status: 'success' | 'failed'; reason?: string }>

        for (const job of jobs.jobs ?? []) {
            let status: 'success' | 'failed' = 'success'
            let reason: string | undefined

            try {
                await deps.jobsStore.recordReceived({
                    id: job.id,
                    jobType: job.jobType,
                    payload: job.payload,
                    signature: job.signature,
                    nonce: job.nonce,
                    expiresAt: job.expiresAt
                })

                const replayed = await deps.nonceStore.isNonceUsed(job.nonce)
                if (replayed) {
                    throw new Error('Replay detected')
                }

                const signed = verifyJobSignature(job.signature, config.EDGE_JOB_SIGNING_PUBLIC_KEY)
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
                if (config.EDGE_TARGET_ALLOWLIST.length > 0 && !isAllowedTarget(targetIp, config.EDGE_TARGET_ALLOWLIST)) {
                    throw new Error('Target not allowed by edge allowlist')
                }
                if (secrets.policyBundle.allowTargets.length > 0 && !isAllowedTarget(targetIp, secrets.policyBundle.allowTargets)) {
                    throw new Error('Target not allowed by policy bundle')
                }

                const connector = getConnector(job.payload)
                if (config.EDGE_CONNECTORS_ALLOWED.length > 0) {
                    if (!connector || !config.EDGE_CONNECTORS_ALLOWED.includes(connector)) {
                        throw new Error('Connector not allowed')
                    }
                }
                if (secrets.policyBundle.allowedConnectors.length > 0) {
                    if (!connector || !secrets.policyBundle.allowedConnectors.includes(connector)) {
                        throw new Error('Connector not allowed by policy')
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

                const stored = await deps.nonceStore.storeNonce(job.nonce, job.expiresAt)
                if (!stored) {
                    throw new Error('Replay detected')
                }

                const output = {
                    ok: true,
                    jobType: job.jobType,
                    templateId,
                    dryRun: job.payload.dryRun !== false,
                    executedAt: nowIso()
                }

                let submissionError: string | undefined
                try {
                    await httpEmpty(`${config.CLOUD_BASE_URL}/api/edge/jobs/result`, {
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
                    submissionError = error instanceof Error ? error.message : 'Result submission failed'
                }

                if (submissionError) {
                    status = 'failed'
                    reason = submissionError
                    await deps.jobsStore.recordResult(job.id, 'failed', { ok: false, error: submissionError }, submissionError)
                } else {
                    await deps.jobsStore.recordResult(job.id, 'success', output)
                }
            } catch (error) {
                status = 'failed'
                reason = error instanceof Error ? error.message : 'Unknown error'

                try {
                    await httpEmpty(`${config.CLOUD_BASE_URL}/api/edge/jobs/result`, {
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
                } catch {
                    // Ignore result submission failures for now.
                }

                await deps.jobsStore.recordResult(job.id, 'failed', { ok: false, error: reason }, reason)
            }

            results.push({ jobId: job.id, status, reason })
        }

        return reply.send({ processed: results.length, results })
    })
}
