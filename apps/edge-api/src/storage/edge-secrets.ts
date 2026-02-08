import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { Pool } from 'pg'

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

export type EdgeSecretsStore = {
    load: () => Promise<EdgeSecrets | null>
    save: (secrets: EdgeSecrets) => Promise<void>
}

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

export function createEdgeSecretsStore(pool: Pool, vaultKey: string): EdgeSecretsStore {
    const key = deriveKey(vaultKey)

    return {
        async load(): Promise<EdgeSecrets | null> {
            try {
                const result = await pool.query<{
                    edge_id: string
                    auth_token_enc: Buffer
                    policy_bundle: EdgeSecrets['policyBundle']
                }>('SELECT edge_id, auth_token_enc, policy_bundle FROM edge_state ORDER BY id DESC LIMIT 1')
                const row = result.rows[0]
                if (!row) return null
                const authToken = decrypt(row.auth_token_enc, key)
                return {
                    edgeId: row.edge_id,
                    authToken,
                    policyBundle: row.policy_bundle
                }
            } catch {
                return null
            }
        },
        async save(secrets: EdgeSecrets): Promise<void> {
            const payload = encrypt(secrets.authToken, key)
            await pool.query(
                `INSERT INTO edge_state (id, edge_id, auth_token_enc, policy_bundle, paired_at, updated_at)
                 VALUES (1, $1, $2, $3, NOW(), NOW())
                 ON CONFLICT (id)
                 DO UPDATE SET edge_id = EXCLUDED.edge_id,
                               auth_token_enc = EXCLUDED.auth_token_enc,
                               policy_bundle = EXCLUDED.policy_bundle,
                               updated_at = NOW()`,
                [secrets.edgeId, payload, secrets.policyBundle]
            )
        }
    }
}
