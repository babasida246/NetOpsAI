<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Badge, Input, Label, Select, Alert } from 'flowbite-svelte';
  import { listUsers, createUser, updateUser, resetPassword, deleteUser, listAuditLogs, type AdminUser, type AuditLogEntry } from '$lib/api/admin';

  let users = $state<AdminUser[]>([]);
  let auditLogs = $state<AuditLogEntry[]>([]);
  let loading = $state(false);
  let auditLoading = $state(false);
  let errorMsg = $state('');
  let showCreate = $state(false);
  let newUser = $state({ email: '', name: '', password: '', role: 'user' });

  onMount(async () => {
    await Promise.all([loadUsers(), loadAuditLogs()]);
  });

  async function loadUsers() {
    loading = true;
    try {
      const res = await listUsers();
      users = res.data;
    } catch (error) {
      console.error('Failed to load users', error);
      errorMsg = 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  async function loadAuditLogs() {
    auditLoading = true;
    try {
      const res = await listAuditLogs({ limit: 20 });
      auditLogs = res.data;
    } catch (error) {
      console.error('Failed to load audit logs', error);
      errorMsg = 'Failed to load audit logs';
    } finally {
      auditLoading = false;
    }
  }

  async function handleCreate() {
    try {
      await createUser(newUser);
      showCreate = false;
      newUser = { email: '', name: '', password: '', role: 'user' };
      await loadUsers();
    } catch (error) {
      console.error('Create user failed', error);
      errorMsg = 'Create user failed';
    }
  }

  async function toggleActive(user: AdminUser) {
    await updateUser(user.id, { isActive: !user.isActive });
    await loadUsers();
  }

  async function changeRole(user: AdminUser, role: string) {
    await updateUser(user.id, { role });
    await loadUsers();
  }

  async function handleResetPassword(user: AdminUser) {
    const newPass = prompt(`New password for ${user.email}:`);
    if (!newPass) return;
    await resetPassword(user.id, newPass);
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Delete user ${user.email}?`)) return;
    await deleteUser(user.id);
    await loadUsers();
  }
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Admin Users</h1>
      <p class="text-sm text-slate-500">Manage accounts, roles, and access status.</p>
    </div>
    <Button on:click={() => showCreate = !showCreate}>{showCreate ? 'Close' : 'Add user'}</Button>
  </div>

  {#if errorMsg}
    <Alert color="red">{errorMsg}</Alert>
  {/if}

  {#if showCreate}
    <Card class="border border-slate-200 dark:border-slate-800">
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
        <Button on:click={handleCreate} disabled={!newUser.email || !newUser.password}>Create</Button>
        <Button color="light" on:click={() => showCreate = false}>Cancel</Button>
      </div>
    </Card>
  {/if}

  <div class="grid gap-3">
    {#each users as user}
      <Card class="border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{user.name}</h3>
              <Badge color="blue">{user.role}</Badge>
              <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Active' : 'Disabled'}</Badge>
            </div>
            <p class="text-sm text-slate-500">{user.email}</p>
            {#if user.lastLogin}
              <p class="text-xs text-slate-400">Last login: {new Date(user.lastLogin).toLocaleString()}</p>
            {/if}
          </div>
          <div class="flex gap-2 flex-wrap">
            <Select size="sm" value={user.role} on:change={(e) => changeRole(user, (e.target as HTMLSelectElement).value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
            <Button size="sm" color={user.isActive ? 'red' : 'green'} on:click={() => toggleActive(user)}>
              {user.isActive ? 'Lock' : 'Unlock'}
            </Button>
            <Button size="sm" color="light" on:click={() => handleResetPassword(user)}>Reset password</Button>
            <Button size="sm" color="red" on:click={() => handleDelete(user)}>Delete</Button>
          </div>
        </div>
      </Card>
    {/each}
  </div>

  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Audit Logs</h2>
        <p class="text-sm text-slate-500">Recent admin actions</p>
      </div>
      <Button size="sm" color="light" on:click={loadAuditLogs} disabled={auditLoading}>Refresh</Button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th class="px-6 py-3">Time</th>
            <th class="px-6 py-3">Action</th>
            <th class="px-6 py-3">Resource</th>
            <th class="px-6 py-3">Actor</th>
            <th class="px-6 py-3">IP</th>
          </tr>
        </thead>
        <tbody>
          {#if auditLogs.length === 0}
            <tr><td colspan="5" class="px-6 py-4 text-center text-slate-500">No audit entries</td></tr>
          {:else}
            {#each auditLogs as log}
              <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td class="px-6 py-4">{log.action}</td>
                <td class="px-6 py-4">{log.resource} {log.resourceId ? `(${log.resourceId})` : ''}</td>
                <td class="px-6 py-4">{log.userId || 'system'}</td>
                <td class="px-6 py-4">{log.ipAddress || '-'}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
