export interface EntitlementSnapshot {
    tenantId: string
    plan: {
        code: string
        name: string
        status: string
        endsAt?: string | null
    }
    features: string[]
    limits: Record<string, number>
    issuedAt?: string
    expiresAt?: string
}

export interface EntitlementTokenResult {
    token: string
    expiresAt: string
    snapshot: EntitlementSnapshot
}
