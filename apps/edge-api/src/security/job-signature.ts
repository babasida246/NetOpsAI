import jwt from 'jsonwebtoken'

export type SignedJobPayload = {
    edgeNodeId: string
    jobType: string
    nonce: string
    expiresAt: string
    payload: Record<string, unknown>
}

export function verifyJobSignature(signature: string, publicKey: string): SignedJobPayload {
    const decoded = jwt.verify(signature, publicKey) as SignedJobPayload
    return decoded
}
