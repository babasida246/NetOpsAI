<script lang="ts">
  import { page } from '$app/stores';
  import { Button, Tabs, TabItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Alert, Spinner, Modal, Label, Select } from 'flowbite-svelte';
  import { ArrowLeft, Download, Play, AlertCircle, FileText } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { devicesApi, configsApi, rulepacksApi, lintApi } from '$lib/netops/api/netopsApi';
  import type { Device, ConfigVersion, Rulepack } from '$lib/netops/types';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  import JsonViewer from '$lib/netops/components/JsonViewer.svelte';
  import { formatDate, formatRelativeTime } from '$lib/netops/utils/format';
  
  let deviceId = $derived($page.params.id);
  
  let device: Device | null = $state(null);
  let configs: ConfigVersion[] = $state([]);
  let facts: Record<string, unknown> | null = $state(null);
  let rulepacks: Rulepack[] = $state([]);
  
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state('facts');
  
  // Actions state
  let pulling = $state(false);
  let collecting = $state(false);
  let showLintModal = $state(false);
  let selectedRulepackId = $state('');
  let linting = $state(false);
  let lintError = $state('');
  
  async function loadDevice() {
    try {
      loading = true;
      error = '';
      device = await devicesApi.get(deviceId);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load device';
    } finally {
      loading = false;
    }
  }
  
  async function loadConfigs() {
    try {
      configs = await devicesApi.getConfigs(deviceId);
    } catch (e) {
      console.error('Failed to load configs:', e);
    }
  }
  
  async function loadFacts() {
    try {
      facts = await devicesApi.collectFacts(deviceId);
    } catch (e) {
      console.error('Failed to load facts:', e);
      facts = null;
    }
  }
  
  async function loadRulepacks() {
    try {
      rulepacks = await rulepacksApi.list();
      const active = rulepacks.find(r => r.active);
      if (active) {
        selectedRulepackId = active.id;
      }
    } catch (e) {
      console.error('Failed to load rulepacks:', e);
    }
  }
  
  async function handlePullConfig() {
    try {
      pulling = true;
      await devicesApi.pullConfig(deviceId);
      await loadConfigs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to pull config');
    } finally {
      pulling = false;
    }
  }
  
  async function handleCollectFacts() {
    try {
      collecting = true;
      facts = await devicesApi.collectFacts(deviceId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to collect facts');
    } finally {
      collecting = false;
    }
  }
  
  async function handleRunLint() {
    if (!selectedRulepackId) return;
    
    try {
      linting = true;
      lintError = '';
      // This would run lint on the latest config
      if (configs.length > 0) {
        await lintApi.run('config_version', configs[0].id, selectedRulepackId);
        alert('Lint completed! Check config detail page for results.');
        showLintModal = false;
      }
    } catch (e) {
      lintError = e instanceof Error ? e.message : 'Failed to run lint';
    } finally {
      linting = false;
    }
  }
  
  $effect(() => {
    void loadDevice();
    void loadConfigs();
    void loadFacts();
    void loadRulepacks();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Back button -->
  <div class="mb-4">
    <Button href="/netops/devices" color="alternative" size="sm">
      <ArrowLeft class="w-4 h-4 mr-2" />
      Back to Devices
    </Button>
  </div>
  
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if error}
    <Alert color="red">{error}</Alert>
  {:else if device}
    <!-- Device Header -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold mb-2">{device.name}</h1>
          <div class="flex flex-wrap gap-2 items-center">
            <StatusBadge type="vendor" value={device.vendor} />
            {#if device.role}
              <StatusBadge type="role" value={device.role} />
            {/if}
            <span class="text-sm text-gray-600 dark:text-gray-400">
              <span class="font-mono">{device.mgmt_ip}</span>
            </span>
            {#if device.site}
              <span class="text-sm text-gray-600 dark:text-gray-400">
                - {device.site}
              </span>
            {/if}
          </div>
          {#if device.model || device.os_version}
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {#if device.model}{device.model}{/if}
              {#if device.model && device.os_version} - {/if}
              {#if device.os_version}{device.os_version}{/if}
            </p>
          {/if}
        </div>
        
        <div class="flex gap-2">
          <Button on:click={handlePullConfig} disabled={pulling}>
            <Download class="w-4 h-4 mr-2" />
            {pulling ? 'Pulling...' : 'Pull Config'}
          </Button>
          <Button color="alternative" on:click={handleCollectFacts} disabled={collecting}>
            <Play class="w-4 h-4 mr-2" />
            {collecting ? 'Collecting...' : 'Collect Facts'}
          </Button>
          <Button color="alternative" on:click={() => showLintModal = true}>
            <AlertCircle class="w-4 h-4 mr-2" />
            Run Lint
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Tabs -->
    <Tabs>
      <TabItem open={activeTab === 'facts'} onclick={() => activeTab = 'facts'} title="Facts">
        <div class="py-4">
          {#if facts}
            <JsonViewer data={facts} />
          {:else}
            <Alert color="blue">
              No facts collected yet. Click "Collect Facts" to gather device information.
            </Alert>
          {/if}
        </div>
      </TabItem>
      
      <TabItem open={activeTab === 'configs'} onclick={() => activeTab = 'configs'} title="Config Versions">
        <div class="py-4">
          {#if configs.length === 0}
            <Alert color="blue">
              No configs found. Click "Pull Config" to fetch the current configuration.
            </Alert>
          {:else}
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHead>
                  <TableHeadCell>Collected At</TableHeadCell>
                  <TableHeadCell>Source</TableHeadCell>
                  <TableHeadCell>Created By</TableHeadCell>
                  <TableHeadCell>Note</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableHead>
                <TableBody>
                  {#each configs as config}
                    <TableBodyRow>
                      <TableBodyCell>
                        {formatDate(config.collected_at)}
                        <span class="text-xs text-gray-500 block">
                          {formatRelativeTime(config.collected_at)}
                        </span>
                      </TableBodyCell>
                      <TableBodyCell>
                        <span class="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-semibold capitalize">
                          {config.source}
                        </span>
                      </TableBodyCell>
                      <TableBodyCell>{config.created_by || '-'}</TableBodyCell>
                      <TableBodyCell class="text-sm">{config.note || '-'}</TableBodyCell>
                      <TableBodyCell>
                        <Button href="/netops/configs/{config.id}" size="xs">
                          <FileText class="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </TableBodyCell>
                    </TableBodyRow>
                  {/each}
                </TableBody>
              </Table>
            </div>
          {/if}
        </div>
      </TabItem>
    </Tabs>
  {/if}
</div>

<!-- Lint Modal -->
<Modal bind:open={showLintModal}>
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">Run Lint Check</h3>
  </svelte:fragment>
  
  {#if lintError}
    <Alert color="red" class="mb-4">{lintError}</Alert>
  {/if}
  
  <div class="space-y-4">
    {#if configs.length === 0}
      <Alert color="yellow">
        No configs available. Pull a config first before running lint.
      </Alert>
    {:else}
      <div>
        <Label for="rulepack" class="mb-2">Select Rulepack</Label>
        <Select id="rulepack" bind:value={selectedRulepackId}>
          {#each rulepacks as rulepack}
            <option value={rulepack.id}>
              {rulepack.name} v{rulepack.version}
              {#if rulepack.active}(Active){/if}
            </option>
          {/each}
        </Select>
      </div>
      
      <Alert color="blue">
        This will run lint checks on the latest config version.
      </Alert>
    {/if}
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showLintModal = false}>Cancel</Button>
      <Button 
        on:click={handleRunLint} 
        disabled={linting || !selectedRulepackId || configs.length === 0}
      >
        {linting ? 'Running...' : 'Run Lint'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
