<script lang="ts">
  import { Alert, Button, Input, Select, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listStockView, listWarehouses, type StockViewRecord, type WarehouseRecord } from '$lib/api/warehouse';

  let warehouses = $state<WarehouseRecord[]>([]);
  let items = $state<StockViewRecord[]>([]);
  let loading = $state(true);
  let error = $state('');

  let warehouseId = $state('');
  let query = $state('');
  let belowMin = $state(false);

  let meta = $state({ total: 0, page: 1, limit: 20 });

  async function loadWarehouses() {
    const response = await listWarehouses();
    warehouses = response.data ?? [];
  }

  async function loadStock(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listStockView({
        warehouseId: warehouseId || undefined,
        q: query || undefined,
        belowMin: belowMin || undefined,
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
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadStockFailed');
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    void loadStock(1);
  }

  function clearFilters() {
    warehouseId = '';
    query = '';
    belowMin = false;
    void loadStock(1);
  }

  $effect(() => {
    void loadWarehouses();
    void loadStock(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end">
    <div class="w-full lg:w-64">
      <label for="stock-warehouse" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</label>
      <Select id="stock-warehouse" bind:value={warehouseId}>
        <option value="">{$isLoading ? 'All warehouses' : $_('common.allWarehouses')}</option>
        {#each warehouses as wh}
          <option value={wh.id}>{wh.name} ({wh.code})</option>
        {/each}
      </Select>
    </div>
    <div class="flex-1">
      <label for="stock-search" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Search' : $_('common.search')}</label>
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <Input id="stock-search" class="pl-9" bind:value={query} placeholder={$isLoading ? 'Part code, name...' : $_('warehouse.partSearchPlaceholder')} />
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        class="rounded border-slate-300"
        checked={belowMin}
        onchange={(event) => belowMin = (event.currentTarget as HTMLInputElement).checked}
      />
      {$isLoading ? 'Below min only' : $_('common.belowMinOnly')}
    </label>
    <div class="flex gap-2">
      <Button onclick={applyFilters}>{$isLoading ? 'Apply' : $_('common.apply')}</Button>
      <Button color="alternative" onclick={clearFilters}>{$isLoading ? 'Clear' : $_('common.clear')}</Button>
      <Button color="alternative" onclick={() => loadStock(meta.page)}>
        <RefreshCw class="w-4 h-4" />
      </Button>
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
          <TableHeadCell>{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'On hand' : $_('inventory.onHand')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Reserved' : $_('inventory.reserved')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Available' : $_('inventory.available')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Min level' : $_('common.minLevel')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if items.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="6" class="text-center text-slate-500">{$isLoading ? 'No stock records' : $_('warehouse.noStockRecords')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each items as item}
              <TableBodyRow>
                <TableBodyCell>{item.warehouseName}</TableBodyCell>
                <TableBodyCell>
                  <div class="font-medium">{item.partName}</div>
                  <div class="text-xs text-slate-500">{item.partCode}</div>
                </TableBodyCell>
                <TableBodyCell class="text-right">{item.onHand}</TableBodyCell>
                <TableBodyCell class="text-right">{item.reserved}</TableBodyCell>
                <TableBodyCell class="text-right">{item.available}</TableBodyCell>
                <TableBodyCell class="text-right">{item.minLevel}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    </div>

    <div class="flex items-center justify-between text-sm text-slate-500">
      <span>{$isLoading ? 'Page' : $_('table.page')} {meta.page}</span>
      <div class="flex gap-2">
        <Button color="alternative" size="xs" disabled={meta.page <= 1} onclick={() => loadStock(meta.page - 1)}>{$isLoading ? 'Prev' : $_('common.previous')}</Button>
        <Button
          color="alternative"
          size="xs"
          disabled={meta.page * meta.limit >= meta.total}
          onclick={() => loadStock(meta.page + 1)}
        >
          {$isLoading ? 'Next' : $_('common.next')}
        </Button>
      </div>
    </div>
  {/if}
</div>
