<script lang="ts">
  import { Alert, Badge, Button, Select, Spinner } from 'flowbite-svelte';
  import { Download, Plus, RefreshCw, Upload } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import AssetFilters from '$lib/assets/components/AssetFilters.svelte';
  import AssetTable from '$lib/assets/components/AssetTable.svelte';
  import AddAssetModal from '$lib/assets/components/AddAssetModal.svelte';
  import ImportWizard from '$lib/assets/components/ImportWizard.svelte';
  import {
    createAsset,
    exportAssetsCsv,
    getAssetStatusCounts,
    listAssets,
    moveAsset,
    updateAsset,
    type Asset,
    type AssetSearchParams,
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
  let warrantyExpiringDays = $state('');
  let sort = $state<AssetSearchParams['sort'] | ''>('');
  let categoryId = $state('');
  let locationId = $state('');
  let vendorId = $state('');
  let modelId = $state('');
  let selectedAssets = $state<Asset[]>([]);
  let bulkStatus = $state<AssetStatus | ''>('');
  let bulkLocationId = $state('');
  let bulkActionError = $state('');
  let bulkActionLoading = $state(false);
  let selectionResetKey = $state(0);
  let statusCounts = $state<Record<AssetStatus, number>>({
    in_stock: 0,
    in_use: 0,
    in_repair: 0,
    retired: 0,
    disposed: 0,
    lost: 0
  });
  let countsLoading = $state(false);
  let statusCountsEndpointSupported = $state<boolean | null>(null);

  let showCreateModal = $state(false);
  let showImportModal = $state(false);
  let createError = $state('');

  const categories = $derived(catalogs?.categories ?? []);
  const locations = $derived(catalogs?.locations ?? []);
  const vendors = $derived(catalogs?.vendors ?? []);
  const models = $derived(catalogs?.models ?? []);
  const modelOptions = $derived(models.map(model => ({
    id: model.id,
    name: [model.brand, model.model].filter(Boolean).join(' ') || model.model
  })));

  async function loadCatalogs() {
    try {
      const response = await getAssetCatalogs();
      catalogs = response.data ?? null;
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
        warrantyExpiringDays: warrantyExpiringDays ? Number(warrantyExpiringDays) : undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        vendorId: vendorId || undefined,
        modelId: modelId || undefined,
        sort: sort || undefined,
        page,
        limit: meta.limit
      });
      assets = response.data ?? [];
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

  async function loadStatusCounts() {
    try {
      countsLoading = true;
      let shouldFallback = true;

      if (statusCountsEndpointSupported !== false) {
        try {
          const summary = await getAssetStatusCounts();
          if (summary?.data) {
            statusCounts = { ...statusCounts, ...summary.data };
            statusCountsEndpointSupported = true;
            shouldFallback = false;
          } else {
            statusCountsEndpointSupported = false;
          }
        } catch {
          statusCountsEndpointSupported = false;
        }
      }

      if (shouldFallback) {
        const statuses: AssetStatus[] = ['in_stock', 'in_use', 'in_repair', 'retired', 'disposed', 'lost'];
        const results = await Promise.all(
          statuses.map((statusItem) =>
            listAssets({
              status: statusItem,
              limit: 1
            }).then((response) => response.meta?.total ?? response.data?.length ?? 0)
          )
        );
        statusCounts = statuses.reduce((acc, statusItem, index) => {
          acc[statusItem] = results[index] ?? 0;
          return acc;
        }, { ...statusCounts });
      }
    } catch (err) {
      console.error('Failed to load status counts', err);
    } finally {
      countsLoading = false;
    }
  }

  async function handleCreateAsset(data: Parameters<typeof createAsset>[0]) {
    try {
      createError = '';
      await createAsset(data);
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
        warrantyExpiringDays: warrantyExpiringDays ? Number(warrantyExpiringDays) : undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        vendorId: vendorId || undefined,
        modelId: modelId || undefined,
        sort: sort || undefined
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

  async function applyBulkStatus() {
    if (!bulkStatus || selectedAssets.length === 0) return;
    try {
      bulkActionLoading = true;
      bulkActionError = '';
      const statusValue = bulkStatus as AssetStatus;
      await Promise.all(selectedAssets.map((asset) => updateAsset(asset.id, { status: statusValue })));
      bulkStatus = '';
      selectedAssets = [];
      selectionResetKey += 1;
      await loadAssets(meta.page);
      await loadStatusCounts();
    } catch (err) {
      bulkActionError = err instanceof Error ? err.message : $_('assets.errors.bulkUpdateFailed');
    } finally {
      bulkActionLoading = false;
    }
  }

  async function applyBulkLocation() {
    if (!bulkLocationId || selectedAssets.length === 0) return;
    try {
      bulkActionLoading = true;
      bulkActionError = '';
      await Promise.all(selectedAssets.map((asset) => moveAsset(asset.id, bulkLocationId)));
      bulkLocationId = '';
      selectedAssets = [];
      selectionResetKey += 1;
      await loadAssets(meta.page);
      await loadStatusCounts();
    } catch (err) {
      bulkActionError = err instanceof Error ? err.message : $_('assets.errors.bulkMoveFailed');
    } finally {
      bulkActionLoading = false;
    }
  }

  $effect(() => {
    void loadCatalogs();
    void loadAssets(1);
    void loadStatusCounts();
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
      <Button color="alternative" onclick={handleExport}>
        <Download class="w-4 h-4 mr-2" /> {$isLoading ? 'Export' : $_('common.export')} CSV
      </Button>
      <Button color="alternative" onclick={() => showImportModal = true}>
        <Upload class="w-4 h-4 mr-2" /> {$isLoading ? 'Import' : $_('common.import')}
      </Button>
      <Button onclick={() => showCreateModal = true}>
        <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'Add Asset' : $_('assets.addAsset')}
      </Button>
        <Button color="alternative" onclick={() => loadAssets(meta.page)}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {#each Object.entries(statusCounts) as [statusKey, count]}
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">{$_(`assets.statuses.${statusKey}`)}</span>
            <Badge color="blue">{countsLoading ? '...' : count}</Badge>
          </div>
        </div>
      {/each}
    </div>

    <AssetFilters
      bind:query
      bind:status
      bind:warrantyExpiringDays
      bind:sort
      bind:categoryId
      bind:locationId
      bind:vendorId
      bind:modelId
      {categories}
      {locations}
      {vendors}
      models={modelOptions}
      onapply={() => loadAssets(1)}
      onclear={() => loadAssets(1)}
    />
  </div>

  {#if selectedAssets.length > 0}
    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20">
      <span class="font-medium text-blue-800 dark:text-blue-200">
        {selectedAssets.length} {$isLoading ? 'selected' : $_('common.selected')}
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <Select bind:value={bulkStatus} size="sm">
          <option value="">{$_('assets.bulk.statusPlaceholder')}</option>
          <option value="in_stock">{$_('assets.filters.inStock')}</option>
          <option value="in_use">{$_('assets.filters.inUse')}</option>
          <option value="in_repair">{$_('assets.filters.inRepair')}</option>
          <option value="retired">{$_('assets.filters.retired')}</option>
          <option value="disposed">{$_('assets.filters.disposed')}</option>
          <option value="lost">{$_('assets.filters.lost')}</option>
        </Select>
        <Button size="xs" onclick={applyBulkStatus} disabled={!bulkStatus || bulkActionLoading}>
          {$isLoading ? 'Update Status' : $_('assets.bulk.updateStatus')}
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Select bind:value={bulkLocationId} size="sm">
          <option value="">{$_('assets.bulk.locationPlaceholder')}</option>
          {#each locations as location}
            <option value={location.id}>{location.name}</option>
          {/each}
        </Select>
        <Button size="xs" color="alternative" onclick={applyBulkLocation} disabled={!bulkLocationId || bulkActionLoading}>
          {$isLoading ? 'Move' : $_('assets.bulk.move')}
        </Button>
      </div>
      <Button size="xs" color="light" onclick={() => { selectedAssets = []; selectionResetKey += 1; }}>
        {$isLoading ? 'Clear' : $_('common.clear')}
      </Button>
      {#if bulkActionError}
        <span class="text-red-600">{bulkActionError}</span>
      {/if}
    </div>
  {/if}

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
    <AssetTable
      {assets}
      selectionResetKey={selectionResetKey}
      onupdated={() => loadAssets(meta.page)}
      onselect={(rows) => (selectedAssets = rows)}
    />
  {/if}

  <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
    <span>{$isLoading ? 'Page' : $_('table.page')} {meta.page}</span>
    <div class="flex gap-2">
      <Button size="xs" color="alternative" disabled={meta.page <= 1} onclick={() => loadAssets(meta.page - 1)}>
        {$isLoading ? 'Previous' : $_('common.previous')}
      </Button>
      <Button size="xs" color="alternative" disabled={(meta.page * meta.limit) >= meta.total} onclick={() => loadAssets(meta.page + 1)}>
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
  oncreate={handleCreateAsset}
/>

<ImportWizard bind:open={showImportModal} onimported={() => loadAssets(1)} />
