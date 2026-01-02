<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Alert, Spinner, Modal, Badge } from 'flowbite-svelte';
  import { Plus, RefreshCw, FileText, Check } from 'lucide-svelte';
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
      error = e instanceof Error ? e.message : 'Failed to load rulepacks';
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
      alert(e instanceof Error ? e.message : 'Failed to activate rulepack');
    } finally {
      activating = false;
    }
  }
  
  function viewRulepack(rulepack: Rulepack) {
    selectedRulepack = rulepack;
    showViewModal = true;
  }
  
  onMount(() => {
    loadRulepacks();
  });
</script>

<div class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Rulepacks</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {rulepacks.length} {rulepacks.length === 1 ? 'rulepack' : 'rulepacks'}
          {#if rulepacks.some(r => r.active)}
            • {rulepacks.find(r => r.active)?.name} is active
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
      <p class="text-gray-500 dark:text-gray-400">No rulepacks found</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Rulepacks define lint rules for configuration validation.
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
                    Active
                  </Badge>
                {/if}
              </div>
              
              <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Version: <span class="font-mono">{rulepack.version}</span></p>
                {#if rulepack.vendor_scope}
                  <p>
                    Vendor Scope: 
                    <StatusBadge type="vendor" value={rulepack.vendor_scope} />
                  </p>
                {/if}
                <p>Rules: {rulepack.rules.length}</p>
                <p>Created: {formatDate(rulepack.created_at)}</p>
              </div>
              
              {#if rulepack.rules.length > 0}
                <div class="mt-3">
                  <p class="text-sm font-medium mb-2">Rule Summary:</p>
                  <div class="flex flex-wrap gap-2 text-sm">
                    {#if rulepack.rules.filter(r => r.severity === 'critical').length > 0}
                      <Badge color="red">
                        Critical: {rulepack.rules.filter(r => r.severity === 'critical').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'high').length > 0}
                      <Badge color="yellow">
                        High: {rulepack.rules.filter(r => r.severity === 'high').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'med').length > 0}
                      <Badge color="yellow">
                        Med: {rulepack.rules.filter(r => r.severity === 'med').length}
                      </Badge>
                    {/if}
                    {#if rulepack.rules.filter(r => r.severity === 'low').length > 0}
                      <Badge color="dark">
                        Low: {rulepack.rules.filter(r => r.severity === 'low').length}
                      </Badge>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            
            <div class="flex gap-2">
              <Button size="sm" color="alternative" on:click={() => viewRulepack(rulepack)}>
                <FileText class="w-4 h-4 mr-2" />
                View JSON
              </Button>
              {#if !rulepack.active}
                <Button 
                  size="sm" 
                  on:click={() => handleActivate(rulepack.id)}
                  disabled={activating}
                >
                  {activating ? 'Activating...' : 'Activate'}
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
      <Button color="alternative" on:click={() => showViewModal = false}>Close</Button>
    </div>
  </svelte:fragment>
</Modal>
