/*
 * Lightweight edge connector mock for local development.
 */

const API_BASE = process.env.EDGE_API_BASE || 'http://localhost:3000/api'
const EDGE_NAME = process.env.EDGE_NAME || 'edge-mock'
const EDGE_FINGERPRINT = process.env.EDGE_FINGERPRINT || 'edge-mock-1'
const ADMIN_EMAIL = process.env.EDGE_ADMIN_EMAIL || 'admin@gateway.local'
const ADMIN_PASSWORD = process.env.EDGE_ADMIN_PASSWORD || 'Admin@123'

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init)
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
    }
    return await response.json() as T
}

async function login(): Promise<string> {
    const payload = await jsonRequest<{ data?: { accessToken: string } }>(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    })
    const token = payload.data?.accessToken
    if (!token) {
        throw new Error('Missing access token from login')
    }
    return token
}

async function createPairingCode(accessToken: string): Promise<string> {
    const payload = await jsonRequest<{ pairingCode: string }>(`${API_BASE}/edge/pairing-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ ttlMinutes: 10 })
    })
    return payload.pairingCode
}

async function pairEdge(pairingCode: string): Promise<{ authToken: string }> {
    return await jsonRequest<{ authToken: string }>(`${API_BASE}/edge/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pairingCode,
            instanceFingerprint: EDGE_FINGERPRINT,
            name: EDGE_NAME
        })
    })
}

async function pullJobs(edgeToken: string): Promise<Array<{ id: string; jobType: string }>> {
    const payload = await jsonRequest<{ jobs: Array<{ id: string; jobType: string }> }>(`${API_BASE}/edge/jobs/pull`, {
        headers: { 'x-edge-token': edgeToken }
    })
    return payload.jobs
}

async function submitResult(edgeToken: string, jobId: string, jobType: string): Promise<void> {
    await jsonRequest(`${API_BASE}/edge/jobs/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-edge-token': edgeToken },
        body: JSON.stringify({
            jobId,
            status: 'success',
            output: { ok: true, jobType },
            logs: 'edge-mock: completed'
        })
    })
}

async function main() {
    const accessToken = await login()
    const pairingCode = await createPairingCode(accessToken)
    const paired = await pairEdge(pairingCode)

    console.log('Edge paired. Waiting for jobs...')

    while (true) {
        const jobs = await pullJobs(paired.authToken)
        for (const job of jobs) {
            await submitResult(paired.authToken, job.id, job.jobType)
            console.log(`Job ${job.id} (${job.jobType}) completed.`)
        }
        await new Promise((resolve) => setTimeout(resolve, 3000))
    }
}

main().catch((error) => {
    console.error('Edge mock failed:', error)
    process.exit(1)
})
