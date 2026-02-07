<script lang="ts">
  import { Alert, Spinner, Tabs, TabItem } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import CategoryCatalog from '$lib/assets/components/catalogs/CategoryCatalog.svelte';
  import VendorCatalog from '$lib/assets/components/catalogs/VendorCatalog.svelte';
  import ModelCatalog from '$lib/assets/components/catalogs/ModelCatalog.svelte';
  import LocationCatalog from '$lib/assets/components/catalogs/LocationCatalog.svelte';
  import StatusCatalog from '$lib/assets/components/catalogs/StatusCatalog.svelte';
  import { getAssetCatalogs, type Catalogs } from '$lib/api/assetCatalogs';

  let catalogs = $state<Catalogs | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state('categories');

  async function loadCatalogs() {
    try {
      loading = true;
      error = '';
      const response = await getAssetCatalogs();
      catalogs = response.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.loadCatalogsFailed');
    } finally {
      loading = false;
    }
  }

  function handleError(msg: string) {
    error = msg;
  }

  $effect(() => {
    void loadCatalogs();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6">
    <h1 class="text-2xl font-semibold">{$isLoading ? 'Asset Catalogs' : $_('assets.catalogsTitle')}</h1>
    <p class="text-sm text-gray-500">{$isLoading ? 'Manage categories, vendors, models, locations, and status definitions' : $_('assets.catalogsSubtitle')}</p>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <Tabs>
      <TabItem open={activeTab === 'categories'} onclick={() => activeTab = 'categories'} title={$isLoading ? 'Categories' : $_('assets.categories')}>
        <CategoryCatalog
          categories={catalogs?.categories ?? []}
          onupdated={loadCatalogs}
          onerror={handleError}
        />
      </TabItem>
      <TabItem open={activeTab === 'vendors'} onclick={() => activeTab = 'vendors'} title={$isLoading ? 'Vendors' : $_('assets.vendors')}>
        <VendorCatalog
          vendors={catalogs?.vendors ?? []}
          onupdated={loadCatalogs}
          onerror={handleError}
        />
      </TabItem>
      <TabItem open={activeTab === 'models'} onclick={() => activeTab = 'models'} title={$isLoading ? 'Models' : $_('assets.models')}>
        <ModelCatalog
          models={catalogs?.models ?? []}
          categories={catalogs?.categories ?? []}
          vendors={catalogs?.vendors ?? []}
          onupdated={loadCatalogs}
          onerror={handleError}
        />
      </TabItem>
      <TabItem open={activeTab === 'locations'} onclick={() => activeTab = 'locations'} title={$isLoading ? 'Locations' : $_('assets.locations')}>
        <LocationCatalog
          locations={catalogs?.locations ?? []}
          onupdated={loadCatalogs}
          onerror={handleError}
        />
      </TabItem>
      <TabItem open={activeTab === 'status'} onclick={() => activeTab = 'status'} title={$isLoading ? 'Statuses' : $_('assets.statuses')}>
        <StatusCatalog />
      </TabItem>
    </Tabs>
  {/if}
</div>
