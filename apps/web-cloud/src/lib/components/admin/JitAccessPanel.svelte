<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Input, Label } from 'flowbite-svelte';
  import { governanceApi, type JitGrant } from '$lib/netops/api/governanceApi';

  let grants = $state<JitGrant[]>([]);
  let userId = $state('');
  let role = $state('admin');
  let expiresAt = $state('');
  let reason = $state('');
  let status = $state('');

  async function loadGrants() {
    grants = await governanceApi.listJitGrants();
  }

  async function createGrant() {
    status = '';
    const grant = await governanceApi.createJitGrant({ userId, role, expiresAt, reason });
    grants = [grant, ...grants];
    status = `JIT granted to ${grant.userId}`;
    userId = '';
    reason = '';
  }

  onMount(() => {
    void loadGrants();
  });
</script>

<Card class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">JIT Access</h3>
      <p class="text-sm text-slate-500">Grant temporary elevated access with expiry.</p>
    </div>
    <Badge color="blue">Core</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-3">
    <div class="space-y-2">
      <Label>User ID</Label>
      <Input bind:value={userId} placeholder="user-123" />
      <Label>Role</Label>
      <Input bind:value={role} placeholder="admin" />
    </div>
    <div class="space-y-2">
      <Label>Expires At</Label>
      <Input type="datetime-local" bind:value={expiresAt} />
      <Label>Reason</Label>
      <Input bind:value={reason} placeholder="Urgent troubleshooting" />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createGrant} disabled={!userId.trim() || !expiresAt}>Grant access</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if grants.length === 0}
      <p class="text-sm text-slate-500">No active JIT grants.</p>
    {:else}
      {#each grants as grant}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="text-sm font-semibold">{grant.userId} → {grant.role}</div>
          <div class="text-xs text-slate-500">Expires: {new Date(grant.expiresAt).toLocaleString()}</div>
          <div class="text-xs text-slate-500">Reason: {grant.reason}</div>
        </div>
      {/each}
    {/if}
  </div>
</Card>
