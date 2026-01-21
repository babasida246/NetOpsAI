<script lang="ts">
  import { Alert, Button, Input, Select, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listCis, listCmdbTypes, type CiRecord, type CmdbType } from '$lib/api/cmdb';

  let items = $state<CiRecord[]>([]);
  let types = $state<CmdbType[]>([]);
  let loading = $state(true);
  let error = $state('');

  let query = $state('');
  let status = $state('');
  let environment = $state('');
  let typeId = $state('');

  let meta = $state({ total: 0, page: 1, limit: 20 });

  async function loadTypes() {
    try {
      const response = await listCmdbTypes();
      types = response.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load CMDB types';
    }
  }

  async function loadCis(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listCis({
        q: query || undefined,
        status: status || undefined,
        environment: environment || undefined,
        typeId: typeId || undefined,
        page,
        limit: meta.limit
      });
      items = response.data ?? [];
      meta = {
        total: response.meta?.total ?? items.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load CIs';
    } finally {
      loading = false;
    }
  }

  function typeLabel(id: string) {
    return types.find((type) => type.id === id)?.name ?? id;
  }

  function applyFilters() {
    void loadCis(1);
  }

  function clearFilters() {
    query = '';
    status = '';
    environment = '';
    typeId = '';
    void loadCis(1);
  }

  $effect(() => {
    void loadTypes();
    void loadCis(1);
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Configuration Items' : $_('cmdb.cis')}</h2>
      <p class="text-sm text-slate-500">{meta.total} {$isLoading ? 'items' : $_('inventory.items').toLowerCase()}</p>
    </div>
    <Button color="alternative" onclick={() => loadCis(meta.page)}>
      <RefreshCw class="w-4 h-4" />
    </Button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
    <div class="lg:col-span-2">
      <label for="ci-search" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Search' : $_('common.search')}</label>
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <Input id="ci-search" class="pl-9" bind:value={query} placeholder={$isLoading ? 'CI code or name' : $_('cmdb.searchPlaceholder')} />
      </div>
    </div>
    <div>
      <label for="ci-status" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Status' : $_('common.status')}</label>
      <Select id="ci-status" bind:value={status}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="active">{$isLoading ? 'Active' : $_('cmdb.active')}</option>
        <option value="planned">{$isLoading ? 'Planned' : $_('cmdb.planned')}</option>
        <option value="maintenance">{$isLoading ? 'Maintenance' : $_('cmdb.maintenance')}</option>
        <option value="retired">{$isLoading ? 'Retired' : $_('cmdb.retired')}</option>
      </Select>
    </div>
    <div>
      <label for="ci-env" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Environment' : $_('cmdb.environment')}</label>
      <Select id="ci-env" bind:value={environment}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="prod">{$isLoading ? 'Prod' : $_('cmdb.prod')}</option>
        <option value="uat">{$isLoading ? 'UAT' : $_('cmdb.uat')}</option>
        <option value="dev">{$isLoading ? 'Dev' : $_('cmdb.dev')}</option>
      </Select>
    </div>
    <div>
      <label for="ci-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Type' : $_('common.type')}</label>
      <Select id="ci-type" bind:value={typeId}>
        <option value="">{$isLoading ? 'All types' : $_('cmdb.allTypes')}</option>
        {#each types as type}
          <option value={type.id}>{type.name}</option>
        {/each}
      </Select>
    </div>
    <div class="flex gap-2 items-end">
      <Button onclick={applyFilters}>{$isLoading ? 'Apply' : $_('common.apply')}</Button>
      <Button color="alternative" onclick={clearFilters}>{$isLoading ? 'Clear' : $_('common.clear')}</Button>
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'CI Code' : $_('cmdb.ciCode')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Name' : $_('common.name')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Type' : $_('common.type')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('common.status')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Environment' : $_('cmdb.environment')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if items.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="5" class="text-center text-slate-500">{$isLoading ? 'No items found.' : $_('cmdb.noItems')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each items as ci}
              <TableBodyRow>
                <TableBodyCell class="font-medium">{ci.ciCode}</TableBodyCell>
                <TableBodyCell>{ci.name}</TableBodyCell>
                <TableBodyCell>{typeLabel(ci.typeId)}</TableBodyCell>
                <TableBodyCell>{ci.status}</TableBodyCell>
                <TableBodyCell>{ci.environment}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    </div>

    <div class="flex items-center justify-between text-sm text-slate-500">
      <span>Page {meta.page}</span>
      <div class="flex gap-2">
        <Button color="alternative" size="xs" disabled={meta.page <= 1} onclick={() => loadCis(meta.page - 1)}>Prev</Button>
        <Button
          color="alternative"
          size="xs"
          disabled={meta.page * meta.limit >= meta.total}
          onclick={() => loadCis(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  {/if}
</div>
