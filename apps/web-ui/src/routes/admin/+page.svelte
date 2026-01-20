<script lang="ts">
  import { Card, Button, Badge, Input, Label, Select, Alert } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listUsers, createUser, updateUser, resetPassword, deleteUser, listAuditLogs, type AdminUser, type AuditLogEntry } from '$lib/api/admin';

  let users = $state<AdminUser[]>([]);
  let auditLogs = $state<AuditLogEntry[]>([]);
  let loading = $state(false);
  let auditLoading = $state(false);
  let errorMsg = $state('');
  let showCreate = $state(false);
  let newUser = $state({ email: '', name: '', password: '', role: 'user' });

  $effect(() => {
    void Promise.all([loadUsers(), loadAuditLogs()]);
  });

  async function loadUsers() {
    loading = true;
    try {
      const res = await listUsers();
      users = res.data;
    } catch (error) {
      console.error('Failed to load users', error);
      errorMsg = $_('admin.failedToLoadUsers');
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
      errorMsg = $_('admin.failedToLoadAuditLogs');
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
      errorMsg = $_('admin.createUserFailed');
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
    const newPass = prompt($_('admin.resetPasswordPrompt', { values: { email: user.email } }));
    if (!newPass) return;
    await resetPassword(user.id, newPass);
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm($_('admin.deleteUserConfirm', { values: { email: user.email } }))) return;
    await deleteUser(user.id);
    await loadUsers();
  }
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{$isLoading ? 'Admin Users' : $_('admin.title')}</h1>
      <p class="text-sm text-slate-500">{$isLoading ? 'Manage accounts, roles, and access status' : $_('admin.subtitle')}</p>
    </div>
    <Button on:click={() => showCreate = !showCreate}>{showCreate ? ($isLoading ? 'Close' : $_('admin.closeForm')) : ($isLoading ? 'Add user' : $_('admin.addUser'))}</Button>
  </div>

  {#if errorMsg}
    <Alert color="red">{errorMsg}</Alert>
  {/if}

  {#if showCreate}
    <Card class="border border-slate-200 dark:border-slate-800">
      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <Label>{$isLoading ? 'Email' : $_('admin.email')}</Label>
          <Input bind:value={newUser.email} />
        </div>
        <div>
          <Label>{$isLoading ? 'Name' : $_('admin.name')}</Label>
          <Input bind:value={newUser.name} />
        </div>
        <div>
          <Label>{$isLoading ? 'Password' : $_('admin.password')}</Label>
          <Input type="password" bind:value={newUser.password} />
        </div>
        <div>
          <Label>{$isLoading ? 'Role' : $_('admin.role')}</Label>
          <Select bind:value={newUser.role}>
            <option value="user">{$isLoading ? 'User' : $_('admin.user')}</option>
            <option value="admin">{$isLoading ? 'Admin' : $_('admin.admin')}</option>
            <option value="super_admin">{$isLoading ? 'Super Admin' : $_('admin.superAdmin')}</option>
          </Select>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <Button on:click={handleCreate} disabled={!newUser.email || !newUser.password}>{$isLoading ? 'Create' : $_('admin.createUser')}</Button>
        <Button color="light" on:click={() => showCreate = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
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
              <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? $_('admin.active') : $_('admin.disabled')}</Badge>
            </div>
            <p class="text-sm text-slate-500">{user.email}</p>
            {#if user.lastLogin}
              <p class="text-xs text-slate-400">{$isLoading ? 'Last login' : $_('admin.lastLogin')}: {new Date(user.lastLogin).toLocaleString()}</p>
            {/if}
          </div>
          <div class="flex gap-2 flex-wrap">
            <Select size="sm" value={user.role} on:change={(e) => changeRole(user, (e.target as HTMLSelectElement).value)}>
              <option value="user">{$isLoading ? 'User' : $_('admin.user')}</option>
              <option value="admin">{$isLoading ? 'Admin' : $_('admin.admin')}</option>
              <option value="super_admin">{$isLoading ? 'Super Admin' : $_('admin.superAdmin')}</option>
            </Select>
            <Button size="sm" color={user.isActive ? 'red' : 'green'} on:click={() => toggleActive(user)}>
              {user.isActive ? ($isLoading ? 'Lock' : $_('admin.lock')) : ($isLoading ? 'Unlock' : $_('admin.unlock'))}
            </Button>
            <Button size="sm" color="light" on:click={() => handleResetPassword(user)}>{$isLoading ? 'Reset password' : $_('admin.resetPassword')}</Button>
            <Button size="sm" color="red" on:click={() => handleDelete(user)}>{$isLoading ? 'Delete' : $_('admin.delete')}</Button>
          </div>
        </div>
      </Card>
    {/each}
  </div>

  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">{$isLoading ? 'Audit Logs' : $_('admin.auditLogs')}</h2>
        <p class="text-sm text-slate-500">{$isLoading ? 'Recent admin actions' : $_('admin.recentActions')}</p>
      </div>
      <Button size="sm" color="light" on:click={loadAuditLogs} disabled={auditLoading}>{$isLoading ? 'Refresh' : $_('common.refresh')}</Button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th class="px-6 py-3">{$isLoading ? 'Time' : $_('admin.time')}</th>
            <th class="px-6 py-3">{$isLoading ? 'Action' : $_('admin.action')}</th>
            <th class="px-6 py-3">{$isLoading ? 'Resource' : $_('admin.resource')}</th>
            <th class="px-6 py-3">{$isLoading ? 'Actor' : $_('admin.actor')}</th>
            <th class="px-6 py-3">{$isLoading ? 'IP' : $_('admin.ip')}</th>
          </tr>
        </thead>
        <tbody>
          {#if auditLogs.length === 0}
            <tr><td colspan="5" class="px-6 py-4 text-center text-slate-500">{$isLoading ? 'No audit entries' : $_('admin.noAuditEntries')}</td></tr>
          {:else}
            {#each auditLogs as log}
              <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td class="px-6 py-4">{log.action}</td>
                <td class="px-6 py-4">{log.resource} {log.resourceId ? `(${log.resourceId})` : ''}</td>
                <td class="px-6 py-4">{log.userId || ($_('common.system'))}</td>
                <td class="px-6 py-4">{log.ipAddress || '-'}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
