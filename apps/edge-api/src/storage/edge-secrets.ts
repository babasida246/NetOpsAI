import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { env } from '../config/env.js'

export type EdgeSecrets = {
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

const STATE_DIR = path.join(process.cwd(), '.edge')
const STATE_FILE = path.join(STATE_DIR, 'edge-secrets.json.enc')

function deriveKey(raw: string): Buffer {
    return createHash('sha256').update(raw).digest()
}

function encrypt(content: string, key: Buffer): Buffer {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, ciphertext])
}

function decrypt(payload: Buffer, key: Buffer): string {
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const data = payload.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()])
    return plaintext.toString('utf8')
}

export async function loadEdgeSecrets(): Promise<EdgeSecrets | null> {
    try {
        const key = deriveKey(env.EDGE_LOCAL_VAULT_KEY)
        const payload = await fs.readFile(STATE_FILE)
        const json = decrypt(payload, key)
        return JSON.parse(json) as EdgeSecrets
    } catch {
        return null
    }
}

export async function saveEdgeSecrets(secrets: EdgeSecrets): Promise<void> {
    await fs.mkdir(STATE_DIR, { recursive: true })
    const key = deriveKey(env.EDGE_LOCAL_VAULT_KEY)
    const payload = encrypt(JSON.stringify(secrets), key)
    await fs.writeFile(STATE_FILE, payload)
}
