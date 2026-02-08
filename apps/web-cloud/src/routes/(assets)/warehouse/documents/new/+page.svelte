<script lang="ts">
  import { Alert, Button, Input, Select, Spinner } from 'flowbite-svelte';
  import { goto } from '$app/navigation';
  import { _, isLoading } from '$lib/i18n';
  import StockDocumentLines from '$lib/warehouse/StockDocumentLines.svelte';
  import {
    createStockDocument,
    listSpareParts,
    listWarehouses,
    type SparePartRecord,
    type StockDocumentLine,
    type WarehouseRecord
  } from '$lib/api/warehouse';

  let warehouses = $state<WarehouseRecord[]>([]);
  let parts = $state<SparePartRecord[]>([]);
  let lines = $state<StockDocumentLine[]>([]);

  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  let docType = $state<'receipt' | 'issue' | 'adjust' | 'transfer'>('receipt');
  let warehouseId = $state('');
  let targetWarehouseId = $state('');
  let docDate = $state(new Date().toISOString().slice(0, 10));
  let note = $state('');

  async function loadCatalogs() {
    try {
      loading = true;
      const [warehousesResponse, partsResponse] = await Promise.all([
        listWarehouses(),
        listSpareParts({ page: 1, limit: 200 })
      ]);
      warehouses = warehousesResponse.data ?? [];
      parts = partsResponse.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadCatalogsFailed');
    } finally {
      loading = false;
    }
  }

  async function submit() {
    if (lines.length === 0) {
      error = $_('warehouse.errors.linesRequired');
      return;
    }
    try {
      saving = true;
      error = '';
      const response = await createStockDocument({
        docType,
        warehouseId: warehouseId || null,
        targetWarehouseId: docType === 'transfer' ? (targetWarehouseId || null) : null,
        docDate,
        note: note || null,
        lines
      });
      await goto(`/warehouse/documents/${response.data.document.id}`);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.createDocumentFailed');
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void loadCatalogs();
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'New Stock Document' : $_('warehouse.newDocument')}</h2>
      <p class="text-sm text-slate-500">
        {$isLoading ? 'Create a receipt, issue, adjust, or transfer' : $_('warehouse.createDocumentSubtitle')}
      </p>
    </div>
    <Button color="alternative" onclick={() => goto('/warehouse/documents')}>{$isLoading ? 'Back' : $_('common.back')}</Button>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="new-doc-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Document Type' : $_('warehouse.documentType')}
        </label>
        <Select id="new-doc-type" bind:value={docType}>
          <option value="receipt">{$isLoading ? 'Receipt' : $_('warehouse.docTypes.receipt')}</option>
          <option value="issue">{$isLoading ? 'Issue' : $_('warehouse.docTypes.issue')}</option>
          <option value="adjust">{$isLoading ? 'Adjust' : $_('warehouse.docTypes.adjust')}</option>
          <option value="transfer">{$isLoading ? 'Transfer' : $_('warehouse.docTypes.transfer')}</option>
        </Select>
      </div>
      <div>
        <label for="new-doc-date" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Document Date' : $_('warehouse.documentDate')}
        </label>
        <Input id="new-doc-date" type="date" bind:value={docDate} />
      </div>
      <div>
        <label for="new-doc-warehouse" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}
        </label>
        <Select id="new-doc-warehouse" bind:value={warehouseId}>
          <option value="">{$isLoading ? 'Select warehouse' : $_('warehouse.selectWarehouse')}</option>
          {#each warehouses as wh}
            <option value={wh.id}>{wh.name} ({wh.code})</option>
          {/each}
        </Select>
      </div>
      {#if docType === 'transfer'}
        <div>
          <label for="new-doc-target" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {$isLoading ? 'Target Warehouse' : $_('warehouse.targetWarehouse')}
          </label>
          <Select id="new-doc-target" bind:value={targetWarehouseId}>
            <option value="">{$isLoading ? 'Select warehouse' : $_('warehouse.selectWarehouse')}</option>
            {#each warehouses as wh}
              <option value={wh.id}>{wh.name} ({wh.code})</option>
            {/each}
          </Select>
        </div>
      {/if}
      <div class="md:col-span-2">
        <label for="new-doc-note" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Note' : $_('common.notes')}
        </label>
        <Input id="new-doc-note" bind:value={note} placeholder={$isLoading ? 'Optional note' : $_('warehouse.placeholders.note')} />
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Lines' : $_('warehouse.lines')}</h3>
      <StockDocumentLines bind:lines={lines} {parts} {docType} />
    </div>

    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => goto('/warehouse/documents')}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button disabled={saving} onclick={submit}>
        {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : ($isLoading ? 'Create' : $_('common.create'))}
      </Button>
    </div>
  {/if}
</div>
