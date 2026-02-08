<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Input, Select, Label, Alert, Spinner } from 'flowbite-svelte';
  import { Plus, RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { changesApi } from '$lib/netops/api/netopsApi';
  import type { ChangeRequest, ChangeStatus, RiskTier } from '$lib/netops/types';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  import { formatDate, formatRelativeTime } from '$lib/netops/utils/format';
  
  let changes: ChangeRequest[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  // Filters
  let searchQuery = $state('');
  let filterStatus = $state<ChangeStatus | ''>('');
  let filterRisk = $state<RiskTier | ''>('');
  
  const filteredChanges = $derived(() => {
    return changes.filter(change => {
      if (searchQuery && !change.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterStatus && change.status !== filterStatus) {
        return false;
      }
      if (filterRisk && change.risk_tier !== filterRisk) {
        return false;
      }
      return true;
    });
  });
  
  const statusCounts = $derived(() => {
    const counts: Record<string, number> = {};
    changes.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  });
  
  async function loadChanges() {
    try {
      loading = true;
      error = '';
      changes = await changesApi.list();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load changes';
    } finally {
      loading = false;
    }
  }
  
  function clearFilters() {
    searchQuery = '';
    filterStatus = '';
    filterRisk = '';
  }
  
  $effect(() => {
    void loadChanges();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Change Requests' : $_('netops.changesPage.title')}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {$isLoading ? `${changes.length} changes` : $_('netops.changesPage.summary', { values: { count: changes.length } })}
          {#if Object.keys(statusCounts()).length > 0}
            - {Object.entries(statusCounts()).slice(0, 3).map(([s, c]) => `${c} ${$isLoading ? s : $_(`netops.changesPage.statuses.${s}`)}`).join(' - ')}
          {/if}
        </p>
      </div>
      
      <div class="flex gap-2">
        <Button href="/netops/changes/new">
          <Plus class="w-4 h-4 mr-2" />
          {$isLoading ? 'New Change' : $_('netops.changesPage.actions.newChange')}
        </Button>
        <Button color="alternative" onclick={loadChanges}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label class="mb-2">{$isLoading ? 'Search' : $_('netops.changesPage.filters.search')}</Label>
          <Input
            bind:value={searchQuery}
            placeholder={$isLoading ? 'Search title...' : $_('netops.changesPage.filters.searchPlaceholder')}
          >
            <svelte:fragment slot="left">
                        <Search  class="w-4 h-4" />
                      </svelte:fragment>
          </Input>
        </div>
        
        <div>
          <Label class="mb-2">{$isLoading ? 'Status' : $_('netops.changesPage.filters.status')}</Label>
          <Select bind:value={filterStatus}>
            <option value="">{$isLoading ? 'All Statuses' : $_('netops.changesPage.filters.allStatuses')}</option>
            <option value="draft">{$isLoading ? 'Draft' : $_('netops.changesPage.statuses.draft')}</option>
            <option value="planned">{$isLoading ? 'Planned' : $_('netops.changesPage.statuses.planned')}</option>
            <option value="candidate_ready">{$isLoading ? 'Candidate Ready' : $_('netops.changesPage.statuses.candidate_ready')}</option>
            <option value="verified">{$isLoading ? 'Verified' : $_('netops.changesPage.statuses.verified')}</option>
            <option value="waiting_approval">{$isLoading ? 'Waiting Approval' : $_('netops.changesPage.statuses.waiting_approval')}</option>
            <option value="approved">{$isLoading ? 'Approved' : $_('netops.changesPage.statuses.approved')}</option>
            <option value="deploying">{$isLoading ? 'Deploying' : $_('netops.changesPage.statuses.deploying')}</option>
            <option value="deployed">{$isLoading ? 'Deployed' : $_('netops.changesPage.statuses.deployed')}</option>
            <option value="closed">{$isLoading ? 'Closed' : $_('netops.changesPage.statuses.closed')}</option>
            <option value="rejected">{$isLoading ? 'Rejected' : $_('netops.changesPage.statuses.rejected')}</option>
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">{$isLoading ? 'Risk Tier' : $_('netops.changesPage.filters.risk')}</Label>
          <Select bind:value={filterRisk}>
            <option value="">{$isLoading ? 'All Risk Levels' : $_('netops.changesPage.filters.allRiskLevels')}</option>
            <option value="low">{$isLoading ? 'Low' : $_('netops.changesPage.risks.low')}</option>
            <option value="med">{$isLoading ? 'Medium' : $_('netops.changesPage.risks.med')}</option>
            <option value="high">{$isLoading ? 'High' : $_('netops.changesPage.risks.high')}</option>
          </Select>
        </div>
      </div>
      
      {#if searchQuery || filterStatus || filterRisk}
        <div class="mt-3">
          <Button size="xs" color="alternative" onclick={clearFilters}>
            {$isLoading ? 'Clear Filters' : $_('netops.changesPage.actions.clearFilters')}
          </Button>
        </div>
      {/if}
    </div>
  </div>
  
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  
  <!-- Changes Table -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if filteredChanges().length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">{$isLoading ? 'No change requests found' : $_('netops.changesPage.empty')}</p>
      {#if changes.length === 0}
        <Button class="mt-4" href="/netops/changes/new">
          <Plus class="w-4 h-4 mr-2" />
          {$isLoading ? 'Create your first change' : $_('netops.changesPage.actions.createFirst')}
        </Button>
      {/if}
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Title' : $_('netops.changesPage.table.title')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('netops.changesPage.table.status')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Risk' : $_('netops.changesPage.table.risk')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Intent Type' : $_('netops.changesPage.table.intentType')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Devices' : $_('netops.changesPage.table.devices')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Created' : $_('netops.changesPage.table.created')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Actions' : $_('netops.changesPage.table.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each filteredChanges() as change}
            <TableBodyRow>
              <TableBodyCell>
                <a href="/netops/changes/{change.id}" class="font-medium text-primary-600 hover:underline">
                  {change.title}
                </a>
                {#if change.created_by}
                  <p class="text-xs text-gray-500 mt-1">{change.created_by}</p>
                {/if}
              </TableBodyCell>
              <TableBodyCell>
                <StatusBadge type="status" value={change.status} />
              </TableBodyCell>
              <TableBodyCell>
                <StatusBadge type="risk" value={change.risk_tier} />
              </TableBodyCell>
              <TableBodyCell class="text-sm">{change.intent_type}</TableBodyCell>
              <TableBodyCell class="text-sm">
                {change.device_scope.length} {$isLoading ? 'devices' : $_('netops.devices')}
              </TableBodyCell>
              <TableBodyCell class="text-sm">
                {formatDate(change.created_at)}
                <span class="text-xs text-gray-500 block">
                  {formatRelativeTime(change.created_at)}
                </span>
              </TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="alternative" href="/netops/changes/{change.id}">
                  {$isLoading ? 'View' : $_('netops.changesPage.actions.view')}
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>


