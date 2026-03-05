<script lang="ts">
    import { Card, Button, Input, Select, Textarea } from 'flowbite-svelte'
    import { _ } from '$lib/i18n'
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
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('securityComp.title')}</h3>
            <p class="text-sm text-slate-500">{$_('securityComp.subtitle')}</p>
        </div>
        <div class="flex items-center gap-2">
            {#if policy.savedAt}
                <span class="text-xs text-slate-500">Saved {new Date(policy.savedAt).toLocaleString()}</span>
            {/if}
            <Button size="sm" onclick={savePolicy}>{$_('securityComp.savePolicy')}</Button>
        </div>
    </div>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">{$_('securityComp.mfaRequirements')}</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.mfa.requireAdmin} />
                    {$_('securityComp.requireMfaAdmin')}
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.mfa.requireSuperAdmin} />
                    {$_('securityComp.requireMfaSuperAdmin')}
                </label>
                <div>
                    <label class="text-sm text-slate-500" for={mfaGraceId}>{$_('securityComp.gracePeriod')}</label>
                    <Input id={mfaGraceId} type="number" bind:value={policy.mfa.graceDays} />
                </div>
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">{$_('securityComp.ssoConfig')}</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.sso.enabled} />
                    {$_('securityComp.enableSso')}
                </label>
                <div>
                    <label class="text-sm text-slate-500" for={ssoProviderId}>{$_('securityComp.provider')}</label>
                    <Select id={ssoProviderId} bind:value={policy.sso.provider}>
                        <option value="oidc">OIDC</option>
                        <option value="saml">SAML</option>
                    </Select>
                </div>
                <div>
                    <label class="text-sm text-slate-500" for={ssoIssuerId}>{$_('securityComp.issuerUrl')}</label>
                    <Input id={ssoIssuerId} bind:value={policy.sso.issuerUrl} placeholder="https://issuer.example.com" />
                </div>
                <div>
                    <label class="text-sm text-slate-500" for={ssoClientId}>{$_('securityComp.clientId')}</label>
                    <Input id={ssoClientId} bind:value={policy.sso.clientId} />
                </div>
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">{$_('securityComp.ipAllowlist')}</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.ipAllowlist.enabled} />
                    {$_('securityComp.enableIpAllowlist')}
                </label>
                <Textarea id={ipAllowlistId} rows={4} bind:value={policy.ipAllowlist.entries} placeholder={$_('securityComp.cidrPlaceholder')} />
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <h4 class="text-md font-semibold text-slate-900 dark:text-white">{$_('securityComp.geoRestriction')}</h4>
            <div class="mt-3 grid gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" class="rounded border-gray-300" bind:checked={policy.geoRestriction.enabled} />
                    {$_('securityComp.enableGeoRestriction')}
                </label>
                <Input id={geoRestrictionId} bind:value={policy.geoRestriction.countries} placeholder="Comma-separated country codes (e.g. US, VN)" />
            </div>
        </Card>
    </div>

    <Card class="w-full max-w-none mt-4 border border-slate-200 dark:border-slate-800">
        <h4 class="text-md font-semibold text-slate-900 dark:text-white">{$_('securityComp.dataRetentionPolicy')}</h4>
        <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div>
                <label class="text-sm text-slate-500" for={retentionAuditId}>{$_('securityComp.retentionAudit')}</label>
                <Input id={retentionAuditId} type="number" bind:value={policy.retention.auditDays} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={retentionChatId}>{$_('securityComp.retentionChat')}</label>
                <Input id={retentionChatId} type="number" bind:value={policy.retention.chatDays} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={retentionActivityId}>{$_('securityComp.retentionActivity')}</label>
                <Input id={retentionActivityId} type="number" bind:value={policy.retention.activityDays} />
            </div>
        </div>
    </Card>
</Card>
