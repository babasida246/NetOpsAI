<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Alert, Spinner } from 'flowbite-svelte';
  import {
    deleteModel,
    searchAssetModels,
    type AssetCategory,
    type AssetModel,
    type Vendor
  } from '$lib/api/assetCatalogs';
  import ModelForm from './ModelForm.svelte';
  import ModelFilters from './ModelFilters.svelte';
  import ModelTable from './ModelTable.svelte';

  let {
    models = [],
    categories = [],
    vendors = []
  } = $props<{
    models?: AssetModel[];
    categories?: AssetCategory[];
    vendors?: Vendor[];
  }>();

  const dispatch = createEventDispatcher<{ updated: void; error: string }>();

  let list = $state<AssetModel[]>([]);
  let filterActive = $state(false);
  let filterLoading = $state(false);
  let lastFilters = $state<{ categoryId: string; specFilters: Record<string, unknown> } | null>(null);
  let selectedModel = $state<AssetModel | null>(null);
  let error = $state('');

  $effect(() => {
    if (!filterActive) {
      list = models;
    }
  });

  async function runSearch(filters: { categoryId: string; specFilters: Record<string, unknown> }) {
    try {
      filterLoading = true;
      error = '';
      const response = await searchAssetModels({
        categoryId: filters.categoryId || undefined,
        specFilters: filters.specFilters
      });
      list = response.data;
      filterActive = true;
      lastFilters = filters;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load models';
      error = message;
      dispatch('error', message);
    } finally {
      filterLoading = false;
    }
  }

  function clearFilters() {
    filterActive = false;
    lastFilters = null;
    list = models;
    error = '';
  }

  async function refreshFilters() {
    if (!lastFilters) return;
    await runSearch(lastFilters);
  }

  async function handleUpdated() {
    selectedModel = null;
    if (filterActive) {
      await refreshFilters();
    }
    dispatch('updated');
  }

  function handleEdit(model: AssetModel) {
    selectedModel = model;
  }

  async function remove(id: string) {
    if (!confirm('Delete this model?')) return;
    try {
      await deleteModel(id);
      await handleUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete model';
      error = message;
      dispatch('error', message);
    }
  }
</script>

<div class="py-4 space-y-4">
  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <ModelForm
    categories={categories}
    vendors={vendors}
    selectedModel={selectedModel}
    on:updated={handleUpdated}
    on:cleared={() => selectedModel = null}
    on:error={(event) => dispatch('error', event.detail)}
  />

  <ModelFilters
    categories={categories}
    on:apply={(event) => runSearch(event.detail)}
    on:clear={clearFilters}
    on:error={(event) => dispatch('error', event.detail)}
  />

  {#if filterLoading}
    <div class="flex justify-center py-4">
      <Spinner size="6" />
    </div>
  {/if}

  <ModelTable
    models={list}
    categories={categories}
    vendors={vendors}
    disabled={filterLoading}
    on:edit={(event) => handleEdit(event.detail)}
    on:remove={(event) => remove(event.detail)}
  />
</div>
