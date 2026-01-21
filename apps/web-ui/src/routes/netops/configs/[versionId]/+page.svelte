<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { page } from '$app/stores';
  import { Button, Alert, Spinner, Modal, Label, Select } from 'flowbite-svelte';
  import { ArrowLeft, FileCode, Play, GitCompare } from 'lucide-svelte';
  import { configsApi, rulepacksApi, lintApi, devicesApi } from '$lib/netops/api/netopsApi';
  import type { ConfigVersion, Rulepack, LintRun, Device } from '$lib/netops/types';
  import CodeViewer from '$lib/netops/components/CodeViewer.svelte';
  import JsonViewer from '$lib/netops/components/JsonViewer.svelte';
  import LintFindingsList from '$lib/netops/components/LintFindingsList.svelte';
  import { formatDate } from '$lib/netops/utils/format';
  
  let versionId = $derived($page.params.versionId);
  
  let config: ConfigVersion | null = $state(null);
  let device: Device | null = $state(null);
  let rawConfig = $state('');
  let rulepacks: Rulepack[] = $state([]);
  let allConfigs: ConfigVersion[] = $state([]);
  let lintRuns: LintRun[] = $state([]);
  let diff = $state('');
  
  let loading = $state(true);
  let error = $state('');
  
  // Actions
  let parsing = $state(false);
  let showLintModal = $state(false);
  let selectedRulepackId = $state('');
  let linting = $state(false);
  let lintError = $state('');
  
  let showDiffModal = $state(false);
  let compareWithId = $state('');
  let diffing = $state(false);
  let diffError = $state('');
  
  async function loadConfig() {
    try {
      loading = true;
      error = '';
      
      config = await configsApi.get(versionId);
      rawConfig = await configsApi.getRaw(versionId);
      
      // Load device info
      if (config.device_id) {
        device = await devicesApi.get(config.device_id);
        // Load other configs from same device for comparison
        allConfigs = await devicesApi.getConfigs(config.device_id);
      }
      
      // Load lint history
      try {
        lintRuns = await lintApi.getHistory('config_version', versionId);
      } catch (e) {
        console.error('Failed to load lint history:', e);
      }
      
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load config';
    } finally {
      loading = false;
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
  
  async function handleParseNormalize() {
    try {
      parsing = true;
      config = await configsApi.parseNormalize(versionId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to parse config');
    } finally {
      parsing = false;
    }
  }
  
  async function handleRunLint() {
    if (!selectedRulepackId) return;
    
    try {
      linting = true;
      lintError = '';
      const result = await lintApi.run('config_version', versionId, selectedRulepackId);
      lintRuns = [result, ...lintRuns];
      showLintModal = false;
    } catch (e) {
      lintError = e instanceof Error ? e.message : 'Failed to run lint';
    } finally {
      linting = false;
    }
  }
  
  async function handleDiff() {
    if (!compareWithId) return;
    
    try {
      diffing = true;
      diffError = '';
      diff = await configsApi.diff(versionId, compareWithId);
      showDiffModal = false;
    } catch (e) {
      diffError = e instanceof Error ? e.message : 'Failed to get diff';
      diff = '';
    } finally {
      diffing = false;
    }
  }
  
  $effect(() => {
    void loadConfig();
    void loadRulepacks();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Back button -->
  <div class="mb-4">
    <Button 
      href={device ? `/netops/devices/${device.id}` : '/netops/devices'} 
      color="alternative" 
      size="sm"
    >
      <ArrowLeft class="w-4 h-4 mr-2" />
      {$isLoading ? 'Back to' : $_('netops.backTo')} {device ? device.name : ($isLoading ? 'Devices' : $_('netops.devices'))}
    </Button>
  </div>
  
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if error}
    <Alert color="red">{error}</Alert>
  {:else if config}
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold mb-2">
            Config Version
            {#if device}
              for {device.name}
            {/if}
          </h1>
          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>Collected: {formatDate(config.collected_at)}</p>
            <p>Source: {config.source}</p>
            {#if config.created_by}
              <p>Created by: {config.created_by}</p>
            {/if}
          </div>
        </div>
        
        <div class="flex gap-2">
          <Button on:click={handleParseNormalize} disabled={parsing}>
            <FileCode class="w-4 h-4 mr-2" />
            {parsing ? ($isLoading ? 'Parsing...' : $_('netops.parsing')) : ($isLoading ? 'Parse & Normalize' : $_('netops.parseNormalize'))}
          </Button>
          <Button color="alternative" on:click={() => showLintModal = true}>
            <Play class="w-4 h-4 mr-2" />
            {$isLoading ? 'Run Lint' : $_('netops.runLint')}
          </Button>
          <Button color="alternative" on:click={() => showDiffModal = true}>
            <GitCompare class="w-4 h-4 mr-2" />
            {$isLoading ? 'Compare' : $_('netops.compare')}
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Raw Config -->
      <div>
        <h2 class="text-lg font-semibold mb-3">{$isLoading ? 'Raw Configuration' : $_('netops.configsDetail.rawConfiguration')}</h2>
        <CodeViewer code={rawConfig} language={config.source === 'pull' ? 'config' : 'text'} />
      </div>
      
      <!-- Normalized Config -->
      <div>
        <h2 class="text-lg font-semibold mb-3">{$isLoading ? 'Normalized Configuration' : $_('netops.configsDetail.normalizedConfiguration')}</h2>
        {#if config.normalized_config}
          <JsonViewer data={config.normalized_config} />
        {:else}
          <Alert color="blue">
            Config not yet normalized. Click "Parse & Normalize" to convert to unified schema.
          </Alert>
        {/if}
      </div>
    </div>
    
    <!-- Lint Results -->
    {#if lintRuns.length > 0}
      <div class="mt-6">
        <h2 class="text-lg font-semibold mb-3">{$isLoading ? 'Lint Results' : $_('netops.configsDetail.lintResults')}</h2>
        <div class="space-y-4">
          {#each lintRuns as run}
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="font-medium">
                    {run.summary.total} {run.summary.total === 1 ? 'issue' : 'issues'} found
                  </p>
                  <p class="text-sm text-gray-500">
                    Run at: {formatDate(run.run_at)}
                  </p>
                </div>
                <div class="flex gap-2 text-sm">
                  {#if run.summary.critical > 0}
                    <span class="text-red-600">Critical: {run.summary.critical}</span>
                  {/if}
                  {#if run.summary.high > 0}
                    <span class="text-orange-600">High: {run.summary.high}</span>
                  {/if}
                  {#if run.summary.med > 0}
                    <span class="text-yellow-600">Med: {run.summary.med}</span>
                  {/if}
                  {#if run.summary.low > 0}
                    <span class="text-gray-600">Low: {run.summary.low}</span>
                  {/if}
                </div>
              </div>
              <LintFindingsList findings={run.findings} />
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Diff Results -->
    {#if diff}
      <div class="mt-6">
        <h2 class="text-lg font-semibold mb-3">{$isLoading ? 'Configuration Diff' : $_('netops.configsDetail.configurationDiff')}</h2>
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
          <pre class="p-4 overflow-auto text-xs text-gray-100 font-mono max-h-96">{@html diff.split('\n').map(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              return `<span class="bg-green-900/30 text-green-300">${line}</span>`;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              return `<span class="bg-red-900/30 text-red-300">${line}</span>`;
            } else if (line.startsWith('@@')) {
              return `<span class="text-blue-400">${line}</span>`;
            }
            return line;
          }).join('\n')}</pre>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Lint Modal -->
<Modal bind:open={showLintModal}>
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">{$isLoading ? 'Run Lint Check' : $_('netops.configsDetail.runLintCheck')}</h3>
  </svelte:fragment>
  
  {#if lintError}
    <Alert color="red" class="mb-4">{lintError}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="rulepack" class="mb-2">{$isLoading ? 'Select Rulepack' : $_('netops.configsDetail.selectRulepack')}</Label>
      <Select id="rulepack" bind:value={selectedRulepackId}>
        {#each rulepacks as rulepack}
          <option value={rulepack.id}>
            {rulepack.name} v{rulepack.version}
            {#if rulepack.active}(Active){/if}
          </option>
        {/each}
      </Select>
    </div>
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showLintModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button on:click={handleRunLint} disabled={linting || !selectedRulepackId}>
        {linting ? ($isLoading ? 'Running...' : $_('netops.running')) : ($isLoading ? 'Run Lint' : $_('netops.runLint'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Diff Modal -->
<Modal bind:open={showDiffModal}>
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">{$isLoading ? 'Compare Configurations' : $_('netops.compareConfigs')}</h3>
  </svelte:fragment>
  
  {#if diffError}
    <Alert color="red" class="mb-4">{diffError}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="compare-with" class="mb-2">{$isLoading ? 'Compare with' : $_('netops.compareWith')}</Label>
      <Select id="compare-with" bind:value={compareWithId}>
        <option value="">{$isLoading ? 'Select a config version...' : $_('netops.selectConfigVersion')}</option>
        {#each allConfigs.filter(c => c.id !== versionId) as cfg}
          <option value={cfg.id}>
            {formatDate(cfg.collected_at)} - {cfg.source}
          </option>
        {/each}
      </Select>
    </div>
    
    {#if allConfigs.filter(c => c.id !== versionId).length === 0}
      <Alert color="blue">
        {$isLoading ? 'No other config versions available for comparison.' : $_('netops.noOtherConfigs')}
      </Alert>
    {/if}
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showDiffModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button on:click={handleDiff} disabled={diffing || !compareWithId}>
        {diffing ? ($isLoading ? 'Comparing...' : $_('netops.comparing')) : ($isLoading ? 'Compare' : $_('netops.compare'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
