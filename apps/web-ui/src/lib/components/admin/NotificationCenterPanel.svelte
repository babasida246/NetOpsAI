<script lang="ts">
    import { Card, Button, Badge, Select } from 'flowbite-svelte'
    import { _ } from '$lib/i18n'
    import { onMount } from 'svelte'
    import { loadNotifications, acknowledgeNotification, clearNotifications, type AdminNotification } from '$lib/admin/notifications'

    let notifications = $state<AdminNotification[]>([])
    let filter = $state<'all' | 'info' | 'warning' | 'critical'>('all')

    const filtered = $derived.by(() => {
        if (filter === 'all') return notifications
        return notifications.filter((item) => item.severity === filter)
    })

    function refresh() {
        notifications = loadNotifications()
    }

    function handleAcknowledge(id: string) {
        acknowledgeNotification(id)
        refresh()
    }

    function handleClear() {
        clearNotifications()
        refresh()
    }

    function severityColor(severity: AdminNotification['severity']) {
        if (severity === 'critical') return 'red'
        if (severity === 'warning') return 'yellow'
        return 'blue'
    }

    onMount(() => {
        refresh()
    })
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('notifCenter.title')}</h3>
            <p class="text-sm text-slate-500">{$_('notifCenter.subtitle')}</p>
        </div>
        <div class="flex items-center gap-2">
            <Select size="sm" bind:value={filter}>
                <option value="all">{$_('common.all')}</option>
                <option value="info">{$_('notifCenter.filterInfo')}</option>
                <option value="warning">{$_('notifCenter.filterWarning')}</option>
                <option value="critical">{$_('notifCenter.filterCritical')}</option>
            </Select>
            <Button size="sm" color="light" onclick={refresh}>{$_('common.refresh')}</Button>
            <Button size="sm" color="light" onclick={handleClear} disabled={notifications.length === 0}>{$_('notifCenter.clear')}</Button>
        </div>
    </div>

    <div class="mt-4 grid gap-3">
        {#if filtered.length === 0}
            <p class="text-sm text-slate-500">{$_('notifCenter.noNotifications')}</p>
        {:else}
            {#each filtered as item}
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <Badge color={severityColor(item.severity)}>{item.severity}</Badge>
                            <span class="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>
                        </div>
                        <Button size="sm" color="light" onclick={() => handleAcknowledge(item.id)} disabled={item.acknowledged}>
                            {item.acknowledged ? $_('notifCenter.acknowledged') : $_('notifCenter.acknowledge')}
                        </Button>
                    </div>
                    <p class="text-sm text-slate-500 mt-2">{item.message}</p>
                    <div class="text-xs text-slate-400 mt-1">
                        {item.source ? `${item.source} • ` : ''}{new Date(item.createdAt).toLocaleString()}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</Card>
