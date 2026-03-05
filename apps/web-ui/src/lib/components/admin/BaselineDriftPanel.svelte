<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from '$lib/i18n';
  import { Alert, Badge, Button, Card, Input, Textarea } from 'flowbite-svelte';
  import { governanceApi, type Baseline, type DriftEvent } from '$lib/netops/api/governanceApi';

  let baselines = $state<Baseline[]>([]);
  let drifts = $state<DriftEvent[]>([]);
  let deviceId = $state('');
  let name = $state('');
  let config = $state('');
  let status = $state('');

  async function loadBaselines() {
    baselines = await governanceApi.listBaselines();
    drifts = await governanceApi.listDrifts();
  }

  async function createBaseline() {
    status = '';
    const baseline = await governanceApi.createBaseline({ deviceId, name, config });
    baselines = [baseline, ...baselines];
    status = 'Baseline saved.';
    name = '';
    config = '';
  }

  onMount(() => {
    void loadBaselines();
  });
</script>

<Card class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('baseline.title')}</h3>
      <p class="text-sm text-slate-500">{$_('baseline.subtitle')}</p>
    </div>
    <Badge color="blue">{$_('common.badgeOps')}</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-3">
    <div class="space-y-2">
      <Input bind:value={deviceId} placeholder={$_('baseline.deviceIdPlaceholder')} />
      <Input bind:value={name} placeholder={$_('baseline.namePlaceholder')} />
    </div>
    <div class="space-y-2">
      <Textarea rows={3} bind:value={config} placeholder={$_('baseline.configPlaceholder')} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createBaseline} disabled={!deviceId.trim() || !name.trim()}>{$_('baseline.save')}</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    <h4 class="text-sm font-semibold text-slate-900 dark:text-white">{$_('baseline.baselines')}</h4>
    {#if baselines.length === 0}
      <p class="text-sm text-slate-500">{$_('baseline.noBaselines')}</p>
    {:else}
      {#each baselines as baseline}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="text-sm font-semibold">{baseline.name}</div>
          <div class="text-xs text-slate-500">Device {baseline.deviceId}</div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="space-y-2">
    <h4 class="text-sm font-semibold text-slate-900 dark:text-white">{$_('baseline.driftEvents')}</h4>
    {#if drifts.length === 0}
      <p class="text-sm text-slate-500">{$_('baseline.noDrifts')}</p>
    {:else}
      {#each drifts as drift}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="text-sm font-semibold">Device {drift.deviceId}</div>
          <div class="text-xs text-slate-500">Severity {drift.severity}</div>
          <pre class="text-xs bg-slate-900 text-slate-100 rounded-md p-2 whitespace-pre-wrap">{drift.diff}</pre>
        </div>
      {/each}
    {/if}
  </div>
</Card>
