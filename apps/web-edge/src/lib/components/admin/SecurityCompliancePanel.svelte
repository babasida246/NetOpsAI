<script lang="ts">
    import { Card, Button, Input, Select, Textarea } from 'flowbite-svelte'
    import { readLocal, writeLocal } from '$lib/admin/storage'

    type SecurityPolicy = {
        mfa: {
            requireAdmin: boolean
            requireSuperAdmin: boolean
            graceDays: number
        }
        sso: {
            enabled: boolean
            provider: string
            issuerUrl: string
            clientId: string
        }
        ipAllowlist: {
            enabled: boolean
            entries: string
        }
        geoRestriction: {
            enabled: boolean
            countries: string
        }
        retention: {
            auditDays: number
            chatDays: number
            activityDays: number
        }
        savedAt?: string
    }

    const STORAGE_KEY = 'admin.securityPolicy.v1'

    const defaultPolicy: SecurityPolicy = {
        mfa: { requireAdmin: true, requireSuperAdmin: true, graceDays: 7 },
        sso: { enabled: false, provider: 'oidc', issuerUrl: '', clientId: '' },
        ipAllowlist: { enabled: false, entries: '' },
        geoRestriction: { enabled: false, countries: '' },
        retention: { auditDays: 365, chatDays: 180, activityDays: 90 }
    }

    let policy = $state<SecurityPolicy>(readLocal<SecurityPolicy>(STORAGE_KEY, defaultPolicy))

    const mfaGraceId = 'mfa-grace-days'
    const ssoProviderId = 'sso-provider'
    const ssoIssuerId = 'sso-issuer'
    const ssoClientId = 'sso-client'
    const ipAllowlistId = 'ip-allowlist'
    const geoRestrictionId = 'geo-restriction'
    const retentionAuditId = 'retention-audit'
    const retentionChatId = 'retention-chat'
    const retentionActivityId = 'retention-activity'

    function savePolicy() {
        policy = { ...policy, savedAt: new Date().toISOString() }
        writeLocal(STORAGE_KEY, policy)
    }
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Security & Compliance</h3>
            <p class="text-sm text-slate-500">Define MFA, SSO, IP restrictions, and retention policy.</p>
        </div>
        <div class="flex items-center gap-2">
            {#if policy.savedAt}
                <span class="text-xs text-slate-500">Saved {new Date(policy.savedAt).toLocaleString()}</span>
            {/if}
            <Button size="sm" onclick={savePolicy}>Save policy</Button>
        </div>
    </div>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">MFA Requirements</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.mfa.requireAdmin} />
                    Require MFA for Admin
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.mfa.requireSuperAdmin} />
                    Require MFA for Super Admin
                </label>
                <div>
                    <label class="text-sm text-slate-500" for={mfaGraceId}>Grace period (days)</label>
                    <Input id={mfaGraceId} type="number" bind:value={policy.mfa.graceDays} />
                </div>
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">SSO Configuration</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.sso.enabled} />
                    Enable SSO
                </label>
                <div>
                    <label class="text-sm text-slate-500" for={ssoProviderId}>Provider</label>
                    <Select id={ssoProviderId} bind:value={policy.sso.provider}>
                        <option value="oidc">OIDC</option>
                        <option value="saml">SAML</option>
                    </Select>
                </div>
                <div>
                    <label class="text-sm text-slate-500" for={ssoIssuerId}>Issuer URL</label>
                    <Input id={ssoIssuerId} bind:value={policy.sso.issuerUrl} placeholder="https://issuer.example.com" />
                </div>
                <div>
                    <label class="text-sm text-slate-500" for={ssoClientId}>Client ID</label>
                    <Input id={ssoClientId} bind:value={policy.sso.clientId} />
                </div>
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">IP Allowlist</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.ipAllowlist.enabled} />
                    Enable IP allowlist
                </label>
                <Textarea id={ipAllowlistId} rows={4} bind:value={policy.ipAllowlist.entries} placeholder="One CIDR per line" />
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">Geo Restriction</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.geoRestriction.enabled} />
                    Enable geo restriction
                </label>
                <Input id={geoRestrictionId} bind:value={policy.geoRestriction.countries} placeholder="Comma-separated country codes (e.g. US, VN)" />
            </div>
        </Card>
    </div>

    <Card class="w-full max-w-none mt-4 border border-slate-200 dark:border-slate-800">
        <h4 class="text-md font-semibold text-slate-900 dark:text-white">Data Retention Policy</h4>
        <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div>
                <label class="text-sm text-slate-500" for={retentionAuditId}>Audit logs (days)</label>
                <Input id={retentionAuditId} type="number" bind:value={policy.retention.auditDays} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={retentionChatId}>Chat history (days)</label>
                <Input id={retentionChatId} type="number" bind:value={policy.retention.chatDays} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={retentionActivityId}>Admin activity (days)</label>
                <Input id={retentionActivityId} type="number" bind:value={policy.retention.activityDays} />
            </div>
        </div>
    </Card>
</Card>
