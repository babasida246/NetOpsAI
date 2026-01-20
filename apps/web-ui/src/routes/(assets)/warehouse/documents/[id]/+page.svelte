<script lang="ts">
  import { Alert, Button, Input, Select, Spinner } from 'flowbite-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { _, isLoading } from '$lib/i18n';
  import StockDocumentLines from '$lib/warehouse/StockDocumentLines.svelte';
  import {
    cancelStockDocument,
    getStockDocument,
    listSpareParts,
    listWarehouses,
    postStockDocument,
    updateStockDocument,
    type SparePartRecord,
    type StockDocumentLine,
    type StockDocumentRecord,
    type WarehouseRecord
  } from '$lib/api/warehouse';

  let docId = $derived($page.params.id);

  let document = $state<StockDocumentRecord | null>(null);
  let lines = $state<StockDocumentLine[]>([]);
  let warehouses = $state<WarehouseRecord[]>([]);
  let parts = $state<SparePartRecord[]>([]);

  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  let warehouseId = $state('');
  let targetWarehouseId = $state('');
  let docDate = $state('');
  let note = $state('');

  const isDraft = $derived(document?.status === 'draft');

  async function loadDetail() {
    try {
      loading = true;
      error = '';
      const [detailResponse, warehouseResponse, partsResponse] = await Promise.all([
        getStockDocument(docId),
        listWarehouses(),
        listSpareParts({ page: 1, limit: 200 })
      ]);
      document = detailResponse.data.document;
      lines = detailResponse.data.lines ?? [];
      warehouses = warehouseResponse.data ?? [];
      parts = partsResponse.data ?? [];
      warehouseId = document.warehouseId ?? '';
      targetWarehouseId = document.targetWarehouseId ?? '';
      docDate = document.docDate;
      note = document.note ?? '';
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadDocumentFailed');
    } finally {
      loading = false;
    }
  }

  async function save() {
    if (!document) return;
    try {
      saving = true;
      error = '';
      const response = await updateStockDocument(document.id, {
        docDate,
        note: note || null,
        warehouseId: warehouseId || null,
        targetWarehouseId: document.docType === 'transfer' ? (targetWarehouseId || null) : null,
        lines
      });
      document = response.data.document;
      lines = response.data.lines ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.updateDocumentFailed');
    } finally {
      saving = false;
    }
  }

  async function postDoc() {
    if (!document) return;
    try {
      saving = true;
      const response = await postStockDocument(document.id);
      document = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.postDocumentFailed');
    } finally {
      saving = false;
    }
  }

  async function cancelDoc() {
    if (!document) return;
    try {
      saving = true;
      const response = await cancelStockDocument(document.id);
      document = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.cancelDocumentFailed');
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void loadDetail();
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Stock Document' : $_('warehouse.documentDetail')}</h2>
      <p class="text-sm text-slate-500">{document?.code ?? ''}</p>
    </div>
    <Button color="alternative" onclick={() => goto('/warehouse/documents')}>{$isLoading ? 'Back' : $_('common.back')}</Button>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading || !document}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="doc-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Type' : $_('common.type')}</label>
        <Input id="doc-type" value={document.docType} disabled />
      </div>
      <div>
        <label for="doc-status" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Status' : $_('assets.status')}</label>
        <Input id="doc-status" value={document.status} disabled />
      </div>
      <div>
        <label for="doc-date" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Document Date' : $_('warehouse.documentDate')}
        </label>
        <Input id="doc-date" type="date" bind:value={docDate} disabled={!isDraft} />
      </div>
      <div>
        <label for="doc-warehouse" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {$isLoading ? 'Warehouse' : $_('warehouse.warehouse')}
        </label>
        <Select id="doc-warehouse" bind:value={warehouseId} disabled={!isDraft}>
          <option value="">{$isLoading ? 'Select warehouse' : $_('warehouse.selectWarehouse')}</option>
          {#each warehouses as wh}
            <option value={wh.id}>{wh.name} ({wh.code})</option>
          {/each}
        </Select>
      </div>
      {#if document.docType === 'transfer'}
        <div>
          <label for="doc-target" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {$isLoading ? 'Target Warehouse' : $_('warehouse.targetWarehouse')}
          </label>
          <Select id="doc-target" bind:value={targetWarehouseId} disabled={!isDraft}>
            <option value="">{$isLoading ? 'Select warehouse' : $_('warehouse.selectWarehouse')}</option>
            {#each warehouses as wh}
              <option value={wh.id}>{wh.name} ({wh.code})</option>
            {/each}
          </Select>
        </div>
      {/if}
      <div class="md:col-span-2">
        <label for="doc-note" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Note' : $_('common.notes')}</label>
        <Input id="doc-note" bind:value={note} disabled={!isDraft} />
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Lines' : $_('warehouse.lines')}</h3>
      <StockDocumentLines bind:lines={lines} parts={parts} docType={document.docType} readonly={!isDraft} />
    </div>

    <div class="flex flex-wrap justify-end gap-2">
      {#if isDraft}
        <Button color="alternative" disabled={saving} onclick={cancelDoc}>
          {$isLoading ? 'Cancel Document' : $_('warehouse.cancelDocument')}
        </Button>
        <Button color="alternative" disabled={saving} onclick={save}>
          {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : ($isLoading ? 'Save Draft' : $_('warehouse.saveDraft'))}
        </Button>
        <Button disabled={saving} onclick={postDoc}>
          {saving ? ($isLoading ? 'Posting...' : $_('warehouse.posting')) : ($isLoading ? 'Post' : $_('warehouse.post'))}
        </Button>
      {/if}
    </div>
  {/if}
</div>
