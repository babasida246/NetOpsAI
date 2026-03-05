<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Input, Label, Select } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { governanceApi, type MaintenanceWindow } from '$lib/netops/api/governanceApi';

  let windows = $state<MaintenanceWindow[]>([]);
  let title = $state('');
  let environment = $state<'dev' | 'staging' | 'prod' | 'all'>('all');
  let startAt = $state('');
  let endAt = $state('');
  let status = $state('');

  async function loadWindows() {
    windows = await governanceApi.listMaintenanceWindows();
  }

  async function createWindow() {
    status = '';
    const window = await governanceApi.createMaintenanceWindow({
      title,
      environment,
      startAt,
      endAt
    });
    windows = [window, ...windows];
    title = '';
    status = 'Maintenance window created.';
  }

  onMount(() => {
    void loadWindows();
  });
</script>

<Card class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('changeCal.title')}</h3>
      <p class="text-sm text-slate-500">{$_('changeCal.subtitle')}</p>
    </div>
    <Badge color="blue">{$_('changeCal.opsBadge')}</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-3">
    <div class="space-y-2">
      <Label>{$_('changeCal.titleLabel')}</Label>
      <Input bind:value={title} placeholder={$_('changeCal.titlePlaceholder')} />
      <Label>{$_('changeCal.environment')}</Label>
      <Select bind:value={environment}>
        <option value="all">{$_('common.all')}</option>
        <option value="dev">{$_('common.envDev')}</option>
        <option value="staging">{$_('common.envStaging')}</option>
        <option value="prod">{$_('common.envProd')}</option>
      </Select>
    </div>
    <div class="space-y-2">
      <Label>{$_('changeCal.start')}</Label>
      <Input type="datetime-local" bind:value={startAt} />
      <Label>{$_('changeCal.end')}</Label>
      <Input type="datetime-local" bind:value={endAt} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createWindow} disabled={!title.trim() || !startAt || !endAt}>{$_('changeCal.createWindow')}</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if windows.length === 0}
      <p class="text-sm text-slate-500">{$_('changeCal.noWindows')}</p>
    {:else}
      {#each windows as window}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">{window.title}</div>
              <div class="text-xs text-slate-500">{new Date(window.startAt).toLocaleString()} → {new Date(window.endAt).toLocaleString()}</div>
            </div>
            <Badge color="blue">{window.environment.toUpperCase()}</Badge>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</Card>
