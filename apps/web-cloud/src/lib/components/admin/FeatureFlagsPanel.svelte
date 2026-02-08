<script lang="ts">
    import { Card, Button } from 'flowbite-svelte'
    import { readLocal, writeLocal } from '$lib/admin/storage'

    type FeatureFlag = {
        id: string
        label: string
        description: string
        enabled: boolean
    }

    const STORAGE_KEY = 'admin.featureFlags.v1'

    const defaultFlags: FeatureFlag[] = [
        { id: 'admin.health', label: 'Health Panel', description: 'Enable service health checks', enabled: true },
        { id: 'admin.audit', label: 'Advanced Audit', description: 'Search + export for audit logs', enabled: true },
        { id: 'admin.bulk', label: 'Bulk Actions', description: 'Allow bulk updates for users', enabled: true },
        { id: 'admin.providers', label: 'Provider Dashboard', description: 'Show provider health metrics', enabled: true },
        { id: 'admin.security', label: 'Security Policies', description: 'Manage MFA/SSO and retention', enabled: true },
        { id: 'admin.ops', label: 'Ops Metrics', description: 'Operational metrics dashboard', enabled: true }
    ]

    let flags = $state<FeatureFlag[]>(readLocal<FeatureFlag[]>(STORAGE_KEY, defaultFlags))

    function toggleFlag(id: string) {
        flags = flags.map((flag) => flag.id === id ? { ...flag, enabled: !flag.enabled } : flag)
        writeLocal(STORAGE_KEY, flags)
    }

    function resetFlags() {
        flags = [...defaultFlags]
        writeLocal(STORAGE_KEY, flags)
    }
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Feature Flags</h3>
            <p class="text-sm text-slate-500">Control rollout safely by toggling admin features.</p>
        </div>
        <Button size="sm" color="light" onclick={resetFlags}>Reset to defaults</Button>
    </div>

    <div class="mt-4 grid gap-3">
        {#each flags as flag}
            <div class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div>
                    <p class="text-sm font-semibold text-slate-900 dark:text-white">{flag.label}</p>
                    <p class="text-xs text-slate-500">{flag.description}</p>
                </div>
                <label class="flex items-center gap-2 text-sm text-slate-500">
                    <input
                        type="checkbox"
                        class="rounded border-gray-300"
                        checked={flag.enabled}
                        onchange={() => toggleFlag(flag.id)}
                    />
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                </label>
            </div>
        {/each}
    </div>
</Card>
