<script lang="ts">
  import { Alert, Button, Input, Select, Spinner } from 'flowbite-svelte';
  import { RefreshCw } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listSpareParts, listStockMovements, listWarehouses, type SparePartRecord, type StockMovementRecord, type WarehouseRecord } from '$lib/api/warehouse';
  import DataTable from '$lib/components/DataTable.svelte';

  let warehouses = $state<WarehouseRecord[]>([]);
  let parts = $state<SparePartRecord[]>([]);
  let movements = $state<StockMovementRecord[]>([]);
  let loading = $state(true);
  let error = $state('');

  let warehouseId = $state('');
  let partId = $state('');
  let from = $state('');
  let to = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  async function loadCatalogs() {
    const [warehousesResponse, partsResponse] = await Promise.all([
      listWarehouses(),
      listSpareParts({ page: 1, limit: 200 })
    ]);
    warehouses = warehousesResponse.data ?? [];
    parts = partsResponse.data ?? [];
  }

  async function loadLedger(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listStockMovements({
        warehouseId: warehouseId || undefined,
        partId: partId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: meta.limit
      });
      movements = response.data ?? [];
      meta = {
        total: response.meta?.total ?? movements.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadLedgerFailed');
    } finally {
      loading = false;
    }
  }

  function partLabel(id: string) {
    const match = parts.find((part) => part.id === id);
    return match ? `${match.partCode} - ${match.name}` : id;
  }

  function warehouseLabel(id: string) {
    const match = warehouses.find((warehouse) => warehouse.id === id);
    return match ? `${match.name} (${match.code})` : id;
  }

  const columns = [
    { key: 'createdAt' as const, label: $isLoading ? 'Date' : $_('common.date'), sortable: true, filterable: true, render: (row: StockMovementRecord) => new Date(row.createdAt).toLocaleString() },
    { key: 'warehouseId' as const, label: $isLoading ? 'Warehouse' : $_('warehouse.warehouse'), sortable: true, filterable: true, render: (row: StockMovementRecord) => warehouseLabel(row.warehouseId) },
    { key: 'partId' as const, label: $isLoading ? 'Part' : $_('warehouse.part'), sortable: true, filterable: true, render: (row: StockMovementRecord) => partLabel(row.partId) },
    { key: 'movementType' as const, label: $isLoading ? 'Type' : $_('common.type'), sortable: true, filterable: true },
    { key: 'qty' as const, label: $isLoading ? 'Qty' : $_('warehouse.quantity'), sortable: true, render: (row: StockMovementRecord) => `<span class="text-right">${row.qty}</span>` },
    { key: 'unitCost' as const, label: $isLoading ? 'Unit Cost' : $_('warehouse.unitCost'), sortable: true, render: (row: StockMovementRecord) => `<span class="text-right">${row.unitCost ?? '-'}</span>` }
  ];

  $effect(() => {
    void loadCatalogs();
    void loadLedger(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end">
    <div class="w-full lg:w-60">
      <label for="ledger-warehouse" class="text-sm font-medium text-slate-700 dark:text-slate-300">
        {$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}
      </label>
      <Select id="ledger-warehouse" bind:value={warehouseId} onchange={() => loadLedger(1)}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each warehouses as wh}
          <option value={wh.id}>{wh.name} ({wh.code})</option>
        {/each}
      </Select>
    </div>
    <div class="w-full lg:w-72">
      <label for="ledger-part" class="text-sm font-medium text-slate-700 dark:text-slate-300">
        {$isLoading ? 'Part' : $_('warehouse.part')}
      </label>
      <Select id="ledger-part" bind:value={partId} onchange={() => loadLedger(1)}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each parts as part}
          <option value={part.id}>{part.partCode} - {part.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <label for="ledger-from" class="text-sm font-medium text-slate-700 dark:text-slate-300">
        {$isLoading ? 'From' : $_('common.from')}
      </label>
      <Input id="ledger-from" type="date" bind:value={from} />
    </div>
    <div>
      <label for="ledger-to" class="text-sm font-medium text-slate-700 dark:text-slate-300">
        {$isLoading ? 'To' : $_('common.to')}
      </label>
      <Input id="ledger-to" type="date" bind:value={to} />
    </div>
    <Button color="alternative" onclick={() => loadLedger(1)}>
      <RefreshCw class="w-4 h-4" />
    </Button>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <DataTable
    data={movements}
    {columns}
    rowKey="id"
    selectable={false}
    {loading}
  />
</div>
