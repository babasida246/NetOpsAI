<script lang="ts">
  import { Alert, Button, Select, Spinner } from 'flowbite-svelte';
  import { Plus } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { _, isLoading } from '$lib/i18n';
  import { listStockDocuments, type StockDocumentRecord } from '$lib/api/warehouse';
  import DataTable from '$lib/components/DataTable.svelte';

  let documents = $state<StockDocumentRecord[]>([]);
  let loading = $state(true);
  let error = $state('');

  let docType = $state('');
  let status = $state('');
  let from = $state('');
  let to = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  async function loadDocuments(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listStockDocuments({
        docType: docType || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: meta.limit
      });
      documents = response.data ?? [];
      meta = {
        total: response.meta?.total ?? documents.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadDocumentsFailed');
    } finally {
      loading = false;
    }
  }

  const columns = [
    { key: 'code' as const, label: $isLoading ? 'Code' : $_('common.code'), sortable: true, filterable: true, render: (row: StockDocumentRecord) => `<span class="font-medium">${row.code}</span>` },
    { key: 'docType' as const, label: $isLoading ? 'Type' : $_('common.type'), sortable: true, filterable: true },
    { key: 'status' as const, label: $isLoading ? 'Status' : $_('assets.status'), sortable: true, filterable: true },
    { key: 'docDate' as const, label: $isLoading ? 'Date' : $_('common.date'), sortable: true, filterable: true }
  ];

  async function handleRowClick(row: StockDocumentRecord) {
    goto(`/warehouse/documents/${row.id}`);
  }

  $effect(() => {
    void loadDocuments(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Stock Documents' : $_('warehouse.documents')}</h2>
      <p class="text-sm text-slate-500">
        {$isLoading ? `${meta.total} documents` : $_('warehouse.documentsTotal', { values: { count: meta.total } })}
      </p>
    </div>
    <Button onclick={() => goto('/warehouse/documents/new')}>
      <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Document' : $_('warehouse.newDocument')}
    </Button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
    <div>
      <label for="doc-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Type' : $_('common.type')}</label>
      <Select id="doc-type" bind:value={docType} onchange={() => loadDocuments(1)}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="receipt">{$isLoading ? 'Receipt' : $_('warehouse.docTypes.receipt')}</option>
        <option value="issue">{$isLoading ? 'Issue' : $_('warehouse.docTypes.issue')}</option>
        <option value="adjust">{$isLoading ? 'Adjust' : $_('warehouse.docTypes.adjust')}</option>
        <option value="transfer">{$isLoading ? 'Transfer' : $_('warehouse.docTypes.transfer')}</option>
      </Select>
    </div>
    <div>
      <label for="doc-status" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Status' : $_('assets.status')}</label>
      <Select id="doc-status" bind:value={status} onchange={() => loadDocuments(1)}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="draft">{$isLoading ? 'Draft' : $_('warehouse.docStatus.draft')}</option>
        <option value="posted">{$isLoading ? 'Posted' : $_('warehouse.docStatus.posted')}</option>
        <option value="canceled">{$isLoading ? 'Canceled' : $_('warehouse.docStatus.canceled')}</option>
      </Select>
    </div>
    <div>
      <label for="doc-from" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'From' : $_('common.from')}</label>
      <input
        type="date"
        id="doc-from"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600"
        value={from}
        oninput={(event) => from = (event.currentTarget as HTMLInputElement).value}
      />
    </div>
    <div>
      <label for="doc-to" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'To' : $_('common.to')}</label>
      <input
        type="date"
        id="doc-to"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600"
        value={to}
        oninput={(event) => to = (event.currentTarget as HTMLInputElement).value}
      />
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <DataTable
    data={documents}
    {columns}
    rowKey="id"
    selectable={false}
    {loading}
  />
</div>
