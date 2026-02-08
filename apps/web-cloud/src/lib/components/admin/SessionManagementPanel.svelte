<script lang="ts">
    import { Card, Button, Badge } from 'flowbite-svelte'
    import { onMount } from 'svelte'
    import { getCurrentUser, logout } from '$lib/api/auth'
    import { formatAdminError } from '$lib/admin/errors'

    type SessionInfo = {
        id: string
        device: string
        ipAddress: string
        lastActive: string
        status: 'active' | 'revoked'
    }

    let currentUser = $state<{ id: string; email: string; name: string; role: string } | null>(null)
    let sessions = $state<SessionInfo[]>([])
    let loading = $state(false)
    let error = $state('')

    async function loadSession() {
        loading = true
        error = ''
        try {
            const user = await getCurrentUser()
            currentUser = user
            sessions = [
                {
                    id: 'current',
                    device: navigator.userAgent,
                    ipAddress: 'Current session',
                    lastActive: new Date().toISOString(),
                    status: 'active'
                }
            ]
        } catch (err) {
            error = formatAdminError(err)
        } finally {
            loading = false
        }
    }

    async function revokeCurrentSession() {
        if (!confirm('Revoke the current session and sign out?')) return
        await logout()
        window.location.href = '/login'
    }

    onMount(() => {
        void loadSession()
    })
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Session Management</h3>
            <p class="text-sm text-slate-500">Review and revoke active login sessions.</p>
        </div>
        <Button size="sm" color="light" onclick={loadSession} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
    </div>

    {#if error}
        <div class="mt-3 text-sm text-rose-600 break-words">{error}</div>
    {/if}

    <div class="mt-4 text-sm text-slate-500">
        Current user: {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Unknown'}
    </div>

    <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                    <th class="px-4 py-3">Session</th>
                    <th class="px-4 py-3">Device</th>
                    <th class="px-4 py-3">Last Active</th>
                    <th class="px-4 py-3">Status</th>
                </tr>
            </thead>
            <tbody>
                {#each sessions as session}
                    <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
                        <td class="px-4 py-3">{session.ipAddress}</td>
                        <td class="px-4 py-3 truncate max-w-[240px]">{session.device}</td>
                        <td class="px-4 py-3">{new Date(session.lastActive).toLocaleString()}</td>
                        <td class="px-4 py-3">
                            <Badge color={session.status === 'active' ? 'green' : 'red'}>
                                {session.status === 'active' ? 'Active' : 'Revoked'}
                            </Badge>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" color="red" onclick={revokeCurrentSession}>Revoke current session</Button>
        <Button size="sm" color="light" disabled>Revoke other sessions (backend required)</Button>
    </div>
</Card>
