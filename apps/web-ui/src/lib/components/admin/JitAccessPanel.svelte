<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Input, Label } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
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
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('jitAccess.title')}</h3>
      <p class="text-sm text-slate-500">{$_('jitAccess.subtitle')}</p>
    </div>
    <Badge color="blue">{$_('jitAccess.coreBadge')}</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-3">
    <div class="space-y-2">
      <Label>{$_('jitAccess.userId')}</Label>
      <Input bind:value={userId} placeholder="user-123" />
      <Label>{$_('common.role')}</Label>
      <Input bind:value={role} placeholder="admin" />
    </div>
    <div class="space-y-2">
      <Label>{$_('jitAccess.expiresAt')}</Label>
      <Input type="datetime-local" bind:value={expiresAt} />
      <Label>{$_('common.reason')}</Label>
      <Input bind:value={reason} placeholder={$_('jitAccess.reasonPlaceholder')} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createGrant} disabled={!userId.trim() || !expiresAt}>{$_('jitAccess.grantAccess')}</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if grants.length === 0}
      <p class="text-sm text-slate-500">{$_('jitAccess.noGrants')}</p>
    {:else}
      {#each grants as grant}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="text-sm font-semibold">{grant.userId} → {grant.role}</div>
          <div class="text-xs text-slate-500">{$_('common.expires')}: {new Date(grant.expiresAt).toLocaleString()}</div>
          <div class="text-xs text-slate-500">{$_('common.reason')}: {grant.reason}</div>
        </div>
      {/each}
    {/if}
  </div>
</Card>
