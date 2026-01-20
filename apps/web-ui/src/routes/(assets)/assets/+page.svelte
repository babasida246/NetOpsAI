<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Button, Spinner } from 'flowbite-svelte';
  import { Download, Plus, RefreshCw, Upload } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import AssetFilters from '$lib/assets/components/AssetFilters.svelte';
  import AssetTable from '$lib/assets/components/AssetTable.svelte';
  import AddAssetModal from '$lib/assets/components/AddAssetModal.svelte';
  import ImportWizard from '$lib/assets/components/ImportWizard.svelte';
  import {
    createAsset,
    exportAssetsCsv,
    listAssets,
    type Asset,
    type AssetStatus
  } from '$lib/api/assets';
  import { getAssetCatalogs, type Catalogs } from '$lib/api/assetCatalogs';

  let assets = $state<Asset[]>([]);
  let catalogs = $state<Catalogs | null>(null);
  let loading = $state(true);
  let error = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  let query = $state('');
  let status = $state<AssetStatus | ''>('');
  let categoryId = $state('');
  let locationId = $state('');
  let vendorId = $state('');
  let modelId = $state('');

  let showCreateModal = $state(false);
  let showImportModal = $state(false);
  let createError = $state('');

  const categories = $derived(catalogs?.categories ?? []);
  const locations = $derived(catalogs?.locations ?? []);
  const vendors = $derived(catalogs?.vendors ?? []);
  const models = $derived((catalogs?.models ?? []).map(model => ({
    id: model.id,
    label: [model.brand, model.model].filter(Boolean).join(' ') || model.model
  })));

  async function loadCatalogs() {
    try {
      const response = await getAssetCatalogs();
      catalogs = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.loadCatalogsFailed');
    }
  }

  async function loadAssets(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listAssets({
        query: query || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        vendorId: vendorId || undefined,
        modelId: modelId || undefined,
        page,
        limit: meta.limit
      });
      assets = response.data;
      meta = {
        total: response.meta?.total ?? response.data.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.loadAssetsFailed');
    } finally {
      loading = false;
    }
  }

  async function handleCreateAsset(event: CustomEvent<Parameters<typeof createAsset>[0]>) {
    try {
      createError = '';
      await createAsset(event.detail);
      showCreateModal = false;
      await loadAssets(1);
    } catch (err) {
      createError = err instanceof Error ? err.message : $_('assets.errors.createFailed');
    }
  }

  async function handleExport() {
    try {
      const csv = await exportAssetsCsv({
        query: query || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        vendorId: vendorId || undefined,
        modelId: modelId || undefined
      });
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = $_('assets.exportFilename');
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.exportFailed');
    }
  }

  onMount(() => {
    void loadCatalogs();
    void loadAssets(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6 flex flex-col gap-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Assets' : $_('assets.title')}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {meta.total} {$isLoading ? 'assets' : $_('assets.assets')}
        </p>
      </div>
    <div class="flex gap-2">
      <Button color="alternative" on:click={handleExport}>
        <Download class="w-4 h-4 mr-2" /> {$isLoading ? 'Export' : $_('common.export')} CSV
      </Button>
      <Button color="alternative" on:click={() => showImportModal = true}>
        <Upload class="w-4 h-4 mr-2" /> {$isLoading ? 'Import' : $_('common.import')}
      </Button>
      <Button on:click={() => showCreateModal = true}>
        <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'Add Asset' : $_('assets.addAsset')}
      </Button>
        <Button color="alternative" on:click={() => loadAssets(meta.page)}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <AssetFilters
      bind:query
      bind:status
      bind:categoryId
      bind:locationId
      bind:vendorId
      bind:modelId
      {categories}
      {locations}
      {vendors}
      models={models.map(item => ({ id: item.id, name: item.label }))}
      on:apply={() => loadAssets(1)}
      on:clear={() => loadAssets(1)}
    />
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if assets.length === 0}
    <div class="text-center py-12 text-gray-500">{$isLoading ? 'No data' : $_('table.noData')}</div>
  {:else}
    <AssetTable {assets} />
  {/if}

  <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
    <span>{$isLoading ? 'Page' : $_('table.page')} {meta.page}</span>
    <div class="flex gap-2">
      <Button size="xs" color="alternative" disabled={meta.page <= 1} on:click={() => loadAssets(meta.page - 1)}>
        {$isLoading ? 'Previous' : $_('common.previous')}
      </Button>
      <Button size="xs" color="alternative" disabled={(meta.page * meta.limit) >= meta.total} on:click={() => loadAssets(meta.page + 1)}>
        {$isLoading ? 'Next' : $_('common.next')}
      </Button>
    </div>
  </div>
</div>

<AddAssetModal
  bind:open={showCreateModal}
  {models}
  {vendors}
  {locations}
  error={createError}
  on:create={handleCreateAsset}
/>

<ImportWizard bind:open={showImportModal} on:imported={() => loadAssets(1)} />
