<script lang="ts">
  import { Alert, Button, Input, Select, Spinner } from 'flowbite-svelte';
  import { RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { deleteCi, listCis, listCmdbTypes, updateCi, type CiRecord, type CmdbType } from '$lib/api/cmdb';
  import DataTable from '$lib/components/DataTable.svelte';

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

  async function handleEdit(ci: CiRecord, changes: Partial<CiRecord>) {
    try {
      await updateCi(ci.id, {
        name: changes.name,
        status: changes.status,
        environment: changes.environment
      });
      await loadCis(meta.page);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update CI';
    }
  }

  async function handleDelete(rows: CiRecord[]) {
    try {
      for (const row of rows) {
        await deleteCi(row.id);
      }
      await loadCis(meta.page);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete CI';
    }
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

  <DataTable
    data={items}
    columns={[
      { key: 'ciCode', label: $isLoading ? 'CI Code' : $_('cmdb.ciCode'), sortable: true, filterable: true, editable: true, width: 'w-40' },
      { key: 'name', label: $isLoading ? 'Name' : $_('common.name'), sortable: true, filterable: true, editable: true },
      { key: 'typeId', label: $isLoading ? 'Type' : $_('common.type'), sortable: true, filterable: false, editable: false, render: (val) => typeLabel(val) },
      { key: 'status', label: $isLoading ? 'Status' : $_('common.status'), sortable: true, filterable: true, editable: true, width: 'w-32' },
      { key: 'environment', label: $isLoading ? 'Environment' : $_('cmdb.environment'), sortable: true, filterable: true, editable: true, width: 'w-32' },
      { 
        key: 'id', 
        label: $isLoading ? 'Actions' : $_('common.actions'), 
        sortable: false, 
        filterable: false, 
        editable: false, 
        width: 'w-24',
        render: (val) => `<a href="/cmdb/cis/${val}" class="text-blue-600 hover:underline">View</a>`
      }
    ]}
    selectable={true}
    rowKey="id"
    loading={loading}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />

  {#if !loading && items.length > 0}
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
