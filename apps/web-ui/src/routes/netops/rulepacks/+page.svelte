<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Alert, Spinner, Modal, Badge } from 'flowbite-svelte';
  import { Plus, RefreshCw, FileText, Check } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { rulepacksApi } from '$lib/netops/api/netopsApi';
  import type { Rulepack } from '$lib/netops/types';
  import JsonViewer from '$lib/netops/components/JsonViewer.svelte';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  import { formatDate } from '$lib/netops/utils/format';
  
  let rulepacks: Rulepack[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  let showViewModal = $state(false);
  let selectedRulepack: Rulepack | null = $state(null);
  let activating = $state(false);
  
  async function loadRulepacks() {
    try {
      loading = true;
      error = '';
      rulepacks = await rulepacksApi.list();
    } catch (e) {
      error = e instanceof Error ? e.message : $_('netops.rulepacksPage.errors.loadFailed');
    } finally {
      loading = false;
    }
  }
  
  async function handleActivate(id: string) {
    try {
      activating = true;
      await rulepacksApi.activate(id);
      await loadRulepacks();
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('netops.rulepacksPage.errors.activateFailed'));
    } finally {
      activating = false;
    }
  }
  
  function viewRulepack(rulepack: Rulepack) {
    selectedRulepack = rulepack;
    showViewModal = true;
  }
  
  $effect(() => {
    void loadRulepacks();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Rulepacks' : $_('netops.rulepacks')}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {$isLoading ? `${rulepacks.length} rulepacks` : $_('netops.rulepacksPage.total', { values: { count: rulepacks.length } })}
          {#if rulepacks.some(r => r.active)}
            - {$isLoading ? `${rulepacks.find(r => r.active)?.name} is active` : $_('netops.rulepacksPage.activeLabel', { values: { name: rulepacks.find(r => r.active)?.name ?? '' } })}
          {/if}
        </p>
      </div>
      
      <div class="flex gap-2">
        <Button color="alternative" on:click={loadRulepacks}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
  
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  
  <!-- Rulepacks Table -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if rulepacks.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">{$isLoading ? 'No rulepacks found' : $_('netops.rulepacksPage.emptyTitle')}</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {$isLoading ? 'Rulepacks define lint rules for configuration validation.' : $_('netops.rulepacksPage.emptySubtitle')}
      </p>
    </div>
  {:else}
    <div class="grid gap-4">
      {#each rulepacks as rulepack}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-lg font-semibold">{rulepack.name}</h3>
                {#if rulepack.active}
                  <Badge color="green">
                    <Check class="w-3 h-3 mr-1" />
                    {$isLoading ? 'Active' : $_('common.active')}
                  </Badge>
                {/if}
              </div>
              
              <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>{$isLoading ? 'Version' : $_('netops.rulepacksPage.version')}: <span class="font-mono">{rulepack.version}</span></p>
                {#if rulepack.vendor_scope}
                  <p>
                    {$isLoading ? 'Vendor Scope' : $_('netops.rulepacksPage.vendorScope')}:
                    <StatusBadge type="vendor" value={rulepack.vendor_scope} />
                  </p>
                {/if}
                <p>{$isLoading ? 'Rules' : $_('netops.rulepacksPage.rules')}: {rulepack.rules.length}</p>
                <p>{$isLoading ? 'Created' : $_('netops.rulepacksPage.created')}: {formatDate(rulepack.created_at)}</p>
              </div>
              
              {#if rulepack.rules.length > 0}
                <div class="mt-3">
                  <p class="text-sm font-medium mb-2">{$isLoading ? 'Rule Summary' : $_('netops.rulepacksPage.summary')}:</p>
                  <div class="flex flex-wrap gap-2 text-sm">
                    {#if rulepack.rules.filter(r => r.severity === 'critical').length > 0}
                      <Badge color="red">
                        {$isLoading ? 'Critical' : $_('netops.rulepacksPage.severity.critical')}: {rulepack.rules.filter(r => r.severity === 'critical').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'high').length > 0}
                      <Badge color="yellow">
                        {$isLoading ? 'High' : $_('netops.rulepacksPage.severity.high')}: {rulepack.rules.filter(r => r.severity === 'high').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'med').length > 0}
                      <Badge color="yellow">
                        {$isLoading ? 'Med' : $_('netops.rulepacksPage.severity.med')}: {rulepack.rules.filter(r => r.severity === 'med').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'low').length > 0}
                      <Badge color="dark">
                        {$isLoading ? 'Low' : $_('netops.rulepacksPage.severity.low')}: {rulepack.rules.filter(r => r.severity === 'low').length}
                      </Badge>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            
            <div class="flex gap-2">
              <Button size="sm" color="alternative" on:click={() => viewRulepack(rulepack)}>
                <FileText class="w-4 h-4 mr-2" />
                {$isLoading ? 'View JSON' : $_('netops.rulepacksPage.viewJson')}
              </Button>
              {#if !rulepack.active}
                <Button 
                  size="sm" 
                  on:click={() => handleActivate(rulepack.id)}
                  disabled={activating}
                >
                  {activating ? ($isLoading ? 'Activating...' : $_('netops.rulepacksPage.activating')) : ($isLoading ? 'Activate' : $_('netops.rulepacksPage.activate'))}
                </Button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- View Rulepack Modal -->
<Modal bind:open={showViewModal} size="xl">
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">
      {selectedRulepack?.name} v{selectedRulepack?.version}
    </h3>
  </svelte:fragment>
  
  {#if selectedRulepack}
    <JsonViewer data={selectedRulepack} />
  {/if}
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end">
      <Button color="alternative" on:click={() => showViewModal = false}>{$isLoading ? 'Close' : $_('common.close')}</Button>
    </div>
  </svelte:fragment>
</Modal>

