<script lang="ts">
  import { Alert, Button, Select, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    listWarehouses,
    reportFefoLots,
    reportReorderAlerts,
    reportStockAvailable,
    reportStockOnHand,
    reportValuation,
    type FefoLotRow,
    type ReorderAlertRow,
    type StockAvailableRow,
    type StockOnHandRow,
    type ValuationResult,
    type WarehouseRecord
  } from '$lib/api/warehouse';

  type ReportType = 'stockOnHand' | 'stockAvailable' | 'reorderAlerts' | 'fefoLots' | 'valuation';

  let reportType = $state<ReportType>('stockOnHand');
  let warehouses = $state<WarehouseRecord[]>([]);
  let warehouseId = $state('');
  let loading = $state(false);
  let error = $state('');

  let stockOnHandRows = $state<StockOnHandRow[]>([]);
  let stockAvailableRows = $state<StockAvailableRow[]>([]);
  let reorderRows = $state<ReorderAlertRow[]>([]);
  let fefoRows = $state<FefoLotRow[]>([]);
  let valuation = $state<ValuationResult | null>(null);

  async function loadWarehouses() {
    const response = await listWarehouses();
    warehouses = response.data ?? [];
  }

  async function loadReport() {
    try {
      loading = true;
      error = '';
      if (reportType === 'stockOnHand') {
        stockOnHandRows = await reportStockOnHand({ warehouseId: warehouseId || undefined, limit: 200 });
      } else if (reportType === 'stockAvailable') {
        stockAvailableRows = await reportStockAvailable({ warehouseId: warehouseId || undefined, limit: 200 });
      } else if (reportType === 'reorderAlerts') {
        reorderRows = await reportReorderAlerts({ warehouseId: warehouseId || undefined, limit: 200 });
      } else if (reportType === 'fefoLots') {
        fefoRows = await reportFefoLots({ warehouseId: warehouseId || undefined, daysThreshold: 30, limit: 200 });
      } else if (reportType === 'valuation') {
        valuation = await reportValuation({ warehouseId: warehouseId || undefined, limit: 200 });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadReportFailed');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void loadWarehouses();
    void loadReport();
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Stock Reports' : $_('warehouse.reports')}</h2>
      <p class="text-sm text-slate-500">
        {$isLoading ? 'Quick insight into stock and valuation' : $_('warehouse.reportsSubtitle')}
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <div>
        <label for="report-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Report' : $_('warehouse.reportType')}</label>
        <Select id="report-type" bind:value={reportType} onchange={() => loadReport()}>
          <option value="stockOnHand">{$isLoading ? 'Stock on hand' : $_('warehouse.reportOptions.stockOnHand')}</option>
          <option value="stockAvailable">{$isLoading ? 'Stock available' : $_('warehouse.reportOptions.stockAvailable')}</option>
          <option value="reorderAlerts">{$isLoading ? 'Reorder alerts' : $_('warehouse.reportOptions.reorderAlerts')}</option>
          <option value="fefoLots">{$isLoading ? 'FEFO lots' : $_('warehouse.reportOptions.fefoLots')}</option>
          <option value="valuation">{$isLoading ? 'Valuation' : $_('warehouse.reportOptions.valuation')}</option>
        </Select>
      </div>
      <div>
        <label for="report-warehouse" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</label>
        <Select id="report-warehouse" bind:value={warehouseId} onchange={() => loadReport()}>
          <option value="">{$isLoading ? 'All warehouses' : $_('common.allWarehouses')}</option>
          {#each warehouses as wh}
            <option value={wh.id}>{wh.name} ({wh.code})</option>
          {/each}
        </Select>
      </div>
      <Button color="alternative" onclick={loadReport}>{$isLoading ? 'Refresh' : $_('common.refresh')}</Button>
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
    {#if reportType === 'stockOnHand'}
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'On hand' : $_('inventory.onHand')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Min level' : $_('common.minLevel')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if stockOnHandRows.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="4" class="text-center text-slate-500">{$isLoading ? 'No data.' : $_('common.noDataAvailable')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each stockOnHandRows as row}
              <TableBodyRow>
                <TableBodyCell>{row.warehouseName}</TableBodyCell>
                <TableBodyCell>{row.partCode} - {row.partName}</TableBodyCell>
                <TableBodyCell class="text-right">{row.onHand}</TableBodyCell>
                <TableBodyCell class="text-right">{row.minLevel}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    {:else if reportType === 'stockAvailable'}
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'On hand' : $_('inventory.onHand')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Reserved' : $_('inventory.reserved')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Available' : $_('inventory.available')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if stockAvailableRows.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="5" class="text-center text-slate-500">{$isLoading ? 'No data.' : $_('common.noDataAvailable')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each stockAvailableRows as row}
              <TableBodyRow>
                <TableBodyCell>{row.warehouseName}</TableBodyCell>
                <TableBodyCell>{row.partCode} - {row.partName}</TableBodyCell>
                <TableBodyCell class="text-right">{row.onHand}</TableBodyCell>
                <TableBodyCell class="text-right">{row.reserved}</TableBodyCell>
                <TableBodyCell class="text-right">{row.available}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    {:else if reportType === 'reorderAlerts'}
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'On hand' : $_('inventory.onHand')}</TableHeadCell>
          <TableHeadCell class="text-right">{$isLoading ? 'Min level' : $_('common.minLevel')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if reorderRows.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="4" class="text-center text-slate-500">{$isLoading ? 'No alerts.' : $_('warehouse.noReorderAlerts')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each reorderRows as row}
              <TableBodyRow>
                <TableBodyCell>{row.warehouseName}</TableBodyCell>
                <TableBodyCell>{row.partCode} - {row.partName}</TableBodyCell>
                <TableBodyCell class="text-right">{row.onHand}</TableBodyCell>
                <TableBodyCell class="text-right">{row.minLevel}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    {:else if reportType === 'fefoLots'}
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Lot' : $_('warehouse.lot')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Expiry' : $_('warehouse.expiry')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if fefoRows.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="5" class="text-center text-slate-500">{$isLoading ? 'No lots.' : $_('warehouse.noLots')}</TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each fefoRows as row}
              <TableBodyRow>
                <TableBodyCell>{row.warehouseName}</TableBodyCell>
                <TableBodyCell>{row.partCode} - {row.partName}</TableBodyCell>
                <TableBodyCell>{row.lotNumber}</TableBodyCell>
                <TableBodyCell>{row.expiryDate ?? '-'}</TableBodyCell>
                <TableBodyCell>{row.status}</TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    {:else if reportType === 'valuation'}
      <div class="space-y-3">
        <div class="text-sm text-slate-600">
          {$isLoading ? 'Total value:' : $_('warehouse.totalValue')}
          <span class="font-semibold">{valuation?.currency ?? ''} {valuation?.total ?? 0}</span>
        </div>
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Part' : $_('warehouse.part')}</TableHeadCell>
            <TableHeadCell class="text-right">{$isLoading ? 'On hand' : $_('inventory.onHand')}</TableHeadCell>
            <TableHeadCell class="text-right">{$isLoading ? 'Avg cost' : $_('warehouse.avgCost')}</TableHeadCell>
            <TableHeadCell class="text-right">{$isLoading ? 'Value' : $_('warehouse.value')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if !valuation || valuation.items.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan="4" class="text-center text-slate-500">{$isLoading ? 'No valuation data.' : $_('warehouse.noValuation')}</TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each valuation.items as row}
                <TableBodyRow>
                  <TableBodyCell>{row.partCode} - {row.partName}</TableBodyCell>
                  <TableBodyCell class="text-right">{row.onHand}</TableBodyCell>
                  <TableBodyCell class="text-right">{row.avgCost}</TableBodyCell>
                  <TableBodyCell class="text-right">{row.value}</TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      </div>
    {/if}
  {/if}
</div>
