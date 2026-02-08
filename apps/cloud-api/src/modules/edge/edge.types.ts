export interface PairingCodeResponse {
    pairingCode: string
    expiresAt: string
}

export interface EdgePairResponse {
    edgeId: string
    authToken: string
    policyBundle: Record<string, unknown>
}

export interface EdgeJobPayload {
    id: string
    jobType: string
    payload: Record<string, unknown>
    signature: string
    nonce: string
    expiresAt: string
}
