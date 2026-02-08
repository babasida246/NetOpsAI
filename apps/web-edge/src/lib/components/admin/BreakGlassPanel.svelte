<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Textarea } from 'flowbite-svelte';
  import { governanceApi, type BreakGlassEvent } from '$lib/netops/api/governanceApi';

  let events = $state<BreakGlassEvent[]>([]);
  let reason = $state('');
  let status = $state('');

  async function loadEvents() {
    events = await governanceApi.listBreakGlassEvents();
  }

  async function triggerBreakGlass() {
    status = '';
    const event = await governanceApi.createBreakGlassEvent(reason);
    events = [event, ...events];
    status = 'Break-glass recorded.';
    reason = '';
  }

  onMount(() => {
    void loadEvents();
  });
</script>

<Card class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">Break-glass Access</h3>
      <p class="text-sm text-slate-500">Emergency access with mandatory audit trail.</p>
    </div>
    <Badge color="red">Security</Badge>
  </div>

  <Textarea rows={3} bind:value={reason} placeholder="Reason for break-glass action" />
  <div class="flex items-center gap-2">
    <Button size="sm" color="red" onclick={triggerBreakGlass} disabled={!reason.trim()}>Record break-glass</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if events.length === 0}
      <p class="text-sm text-slate-500">No break-glass events.</p>
    {:else}
      {#each events as event}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="text-sm font-semibold">{event.userId}</div>
          <div class="text-xs text-slate-500">{event.reason}</div>
          <div class="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</div>
        </div>
      {/each}
    {/if}
  </div>
</Card>
