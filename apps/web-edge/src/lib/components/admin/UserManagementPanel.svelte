<script lang="ts">
    import { Card, Button, Badge, Input, Label, Select, Alert } from 'flowbite-svelte'
    import { onMount } from 'svelte'
    import { listUsers, createUser, updateUser, resetPassword, deleteUser, type AdminUser } from '$lib/api/admin'
    import { formatAdminError } from '$lib/admin/errors'

    let users = $state<AdminUser[]>([])
    let loading = $state(false)
    let bulkLoading = $state(false)
    let errorMsg = $state('')
    let showCreate = $state(false)
    let newUser = $state({ email: '', name: '', password: '', role: 'user' })

    let search = $state('')
    let roleFilter = $state('all')
    let statusFilter = $state('all')
    let selectedIds = $state<Record<string, boolean>>({})
    let bulkRole = $state('user')

    const filteredUsers = $derived.by(() => {
        return users.filter((user) => {
            const query = search.trim().toLowerCase()
            if (query) {
                const target = `${user.name} ${user.email}`.toLowerCase()
                if (!target.includes(query)) return false
            }
            if (roleFilter !== 'all' && user.role !== roleFilter) return false
            if (statusFilter === 'active' && !user.isActive) return false
            if (statusFilter === 'disabled' && user.isActive) return false
            return true
        })
    })

    const selectedUsers = $derived.by(() => filteredUsers.filter((user) => selectedIds[user.id]))

    async function loadUsers() {
        loading = true
        errorMsg = ''
        try {
            const res = await listUsers()
            users = res.data ?? []
        } catch (error) {
            errorMsg = formatAdminError(error)
        } finally {
            loading = false
        }
    }

    async function handleCreate() {
        try {
            await createUser(newUser)
            showCreate = false
            newUser = { email: '', name: '', password: '', role: 'user' }
            await loadUsers()
        } catch (error) {
            errorMsg = formatAdminError(error)
        }
    }

    async function toggleActive(user: AdminUser) {
        await updateUser(user.id, { isActive: !user.isActive })
        await loadUsers()
    }

    async function changeRole(user: AdminUser, role: string) {
        await updateUser(user.id, { role })
        await loadUsers()
    }

    async function handleResetPassword(user: AdminUser) {
        const newPass = prompt(`Reset password for ${user.email}`)
        if (!newPass) return
        await resetPassword(user.id, newPass)
    }

    async function handleDelete(user: AdminUser) {
        if (!confirm(`Delete user ${user.email}?`)) return
        await deleteUser(user.id)
        await loadUsers()
    }

    function toggleSelectAll(checked: boolean) {
        const next: Record<string, boolean> = { ...selectedIds }
        for (const user of filteredUsers) {
            next[user.id] = checked
        }
        selectedIds = next
    }

    async function bulkUpdateStatus(isActive: boolean) {
        if (selectedUsers.length === 0) return
        bulkLoading = true
        try {
            await Promise.all(selectedUsers.map((user) => updateUser(user.id, { isActive })))
            selectedIds = {}
            await loadUsers()
        } finally {
            bulkLoading = false
        }
    }

    async function bulkUpdateRole() {
        if (selectedUsers.length === 0) return
        bulkLoading = true
        try {
            await Promise.all(selectedUsers.map((user) => updateUser(user.id, { role: bulkRole })))
            selectedIds = {}
            await loadUsers()
        } finally {
            bulkLoading = false
        }
    }

    async function bulkDelete() {
        if (selectedUsers.length === 0) return
        if (!confirm(`Delete ${selectedUsers.length} selected users?`)) return
        bulkLoading = true
        try {
            await Promise.all(selectedUsers.map((user) => deleteUser(user.id)))
            selectedIds = {}
            await loadUsers()
        } finally {
            bulkLoading = false
        }
    }

    onMount(() => {
        void loadUsers()
    })
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800" data-testid="admin-users-panel">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">User Management</h3>
            <p class="text-sm text-slate-500">Manage accounts, roles, and access status.</p>
        </div>
        <Button onclick={() => showCreate = !showCreate}>
            {showCreate ? 'Close' : 'Add user'}
        </Button>
    </div>

    {#if errorMsg}
        <Alert color="red" class="mt-3 break-words">{errorMsg}</Alert>
    {/if}

    {#if showCreate}
        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800 mt-4">
            <div class="grid gap-3 md:grid-cols-2">
                <div>
                    <Label>Email</Label>
                    <Input bind:value={newUser.email} />
                </div>
                <div>
                    <Label>Name</Label>
                    <Input bind:value={newUser.name} />
                </div>
                <div>
                    <Label>Password</Label>
                    <Input type="password" bind:value={newUser.password} />
                </div>
                <div>
                    <Label>Role</Label>
                    <Select bind:value={newUser.role}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                    </Select>
                </div>
            </div>
            <div class="mt-3 flex gap-2">
                <Button onclick={handleCreate} disabled={!newUser.email || !newUser.password}>Create</Button>
                <Button color="light" onclick={() => showCreate = false}>Cancel</Button>
            </div>
        </Card>
    {/if}

    <div class="mt-4 grid gap-2 md:grid-cols-3">
        <Input placeholder="Search user" bind:value={search} />
        <Select bind:value={roleFilter}>
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
        </Select>
        <Select bind:value={statusFilter}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
        </Select>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
        <input
            type="checkbox"
            class="rounded border-gray-300"
            checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length}
            onchange={(e) => toggleSelectAll((e.target as HTMLInputElement).checked)}
        />
        <span class="text-sm text-slate-500">Select all</span>
        <Badge color="blue">Selected {selectedUsers.length}</Badge>
        <Button size="sm" color="light" onclick={() => bulkUpdateStatus(false)} disabled={bulkLoading || selectedUsers.length === 0}>
            Lock
        </Button>
        <Button size="sm" color="light" onclick={() => bulkUpdateStatus(true)} disabled={bulkLoading || selectedUsers.length === 0}>
            Unlock
        </Button>
        <Select size="sm" bind:value={bulkRole}>
            <option value="user">Role: User</option>
            <option value="admin">Role: Admin</option>
            <option value="super_admin">Role: Super Admin</option>
        </Select>
        <Button size="sm" color="light" onclick={bulkUpdateRole} disabled={bulkLoading || selectedUsers.length === 0}>
            Apply Role
        </Button>
        <Button size="sm" color="red" onclick={bulkDelete} disabled={bulkLoading || selectedUsers.length === 0}>
            Delete
        </Button>
    </div>

    <div class="mt-4 grid gap-3">
        {#if loading}
            <p class="text-sm text-slate-500">Loading users...</p>
        {:else if filteredUsers.length === 0}
            <p class="text-sm text-slate-500">No users found.</p>
        {:else}
            {#each filteredUsers as user}
                <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-start gap-3">
                            <input
                                type="checkbox"
                                class="mt-1 rounded border-gray-300"
                                checked={selectedIds[user.id] || false}
                                onchange={(e) => selectedIds = { ...selectedIds, [user.id]: (e.target as HTMLInputElement).checked }}
                            />
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{user.name}</h3>
                                    <Badge color="blue">{user.role}</Badge>
                                    <Badge color={user.isActive ? 'green' : 'red'}>
                                        {user.isActive ? 'Active' : 'Disabled'}
                                    </Badge>
                                </div>
                                <p class="text-sm text-slate-500">{user.email}</p>
                                {#if user.lastLogin}
                                    <p class="text-xs text-slate-400">Last login: {new Date(user.lastLogin).toLocaleString()}</p>
                                {/if}
                            </div>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <Select size="sm" value={user.role} onchange={(e) => changeRole(user, (e.target as HTMLSelectElement).value)}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </Select>
                            <Button size="sm" color={user.isActive ? 'red' : 'green'} onclick={() => toggleActive(user)}>
                                {user.isActive ? 'Lock' : 'Unlock'}
                            </Button>
                            <Button size="sm" color="light" onclick={() => handleResetPassword(user)}>Reset password</Button>
                            <Button size="sm" color="red" onclick={() => handleDelete(user)}>Delete</Button>
                        </div>
                    </div>
                </Card>
            {/each}
        {/if}
    </div>
</Card>
