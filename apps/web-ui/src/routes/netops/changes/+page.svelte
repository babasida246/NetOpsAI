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
        <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Change Requests' : $_('netops.changes')}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {changes.length} {changes.length === 1 ? ($isLoading ? 'change' : $_('netops.changes')) : ($isLoading ? 'changes' : $_('netops.changes'))}
          {#if Object.keys(statusCounts()).length > 0}
            - {Object.entries(statusCounts()).slice(0, 3).map(([s, c]) => `${c} ${s}`).join(' - ')}
          {/if}
        </p>
      </div>
      
      <div class="flex gap-2">
        <Button href="/netops/changes/new">
          <Plus class="w-4 h-4 mr-2" />
          New Change
        </Button>
        <Button color="alternative" on:click={loadChanges}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label class="mb-2">Search</Label>
          <Input
            bind:value={searchQuery}
            placeholder="Search title..."
          >
            <Search slot="left" class="w-4 h-4" />
          </Input>
        </div>
        
        <div>
          <Label class="mb-2">Status</Label>
          <Select bind:value={filterStatus}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="candidate_ready">Candidate Ready</option>
            <option value="verified">Verified</option>
            <option value="waiting_approval">Waiting Approval</option>
            <option value="approved">Approved</option>
            <option value="deploying">Deploying</option>
            <option value="deployed">Deployed</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">Risk Tier</Label>
          <Select bind:value={filterRisk}>
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </div>
      
      {#if searchQuery || filterStatus || filterRisk}
        <div class="mt-3">
          <Button size="xs" color="alternative" on:click={clearFilters}>
            Clear Filters
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
      <p class="text-gray-500 dark:text-gray-400">No change requests found</p>
      {#if changes.length === 0}
        <Button class="mt-4" href="/netops/changes/new">
          <Plus class="w-4 h-4 mr-2" />
          Create your first change
        </Button>
      {/if}
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>Title</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Risk</TableHeadCell>
          <TableHeadCell>Intent Type</TableHeadCell>
          <TableHeadCell>Devices</TableHeadCell>
          <TableHeadCell>Created</TableHeadCell>
          <TableHeadCell>Actions</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each filteredChanges() as change}
            <TableBodyRow>
              <TableBodyCell>
                <a href="/netops/changes/{change.id}" class="font-medium text-primary-600 hover:underline">
                  {change.title}
                </a>
                {#if change.created_by}
                  <p class="text-xs text-gray-500 mt-1">by {change.created_by}</p>
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
                {change.device_scope.length} {change.device_scope.length === 1 ? 'device' : 'devices'}
              </TableBodyCell>
              <TableBodyCell class="text-sm">
                {formatDate(change.created_at)}
                <span class="text-xs text-gray-500 block">
                  {formatRelativeTime(change.created_at)}
                </span>
              </TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="alternative" href="/netops/changes/{change.id}">
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

