<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Input, Label, Select } from 'flowbite-svelte';
  import { Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';

  type CatalogOption = { id: string; name: string };

  let {
    query = $bindable(''),
    status = $bindable(''),
    categoryId = $bindable(''),
    vendorId = $bindable(''),
    modelId = $bindable(''),
    locationId = $bindable(''),
    categories = [],
    vendors = [],
    models = [],
    locations = []
  } = $props<{
    query?: string;
    status?: string;
    categoryId?: string;
    vendorId?: string;
    modelId?: string;
    locationId?: string;
    categories?: CatalogOption[];
    vendors?: CatalogOption[];
    models?: CatalogOption[];
    locations?: CatalogOption[];
  }>();

  const dispatch = createEventDispatcher();

  function applyFilters() {
    dispatch('apply');
  }

  function clearFilters() {
    query = '';
    status = '';
    categoryId = '';
    vendorId = '';
    modelId = '';
    locationId = '';
    dispatch('clear');
  }
</script>

<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
  <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Search' : $_('common.search')}</Label>
      <Input bind:value={query} placeholder={$isLoading ? 'Asset code, hostname, IP...' : $_('assets.searchPlaceholder')}>
        <Search slot="left" class="w-4 h-4" />
      </Input>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Status' : $_('assets.filters.status')}</Label>
      <Select bind:value={status}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="in_stock">{$isLoading ? 'In stock' : $_('assets.filters.inStock')}</option>
        <option value="in_use">{$isLoading ? 'In use' : $_('assets.filters.inUse')}</option>
        <option value="in_repair">{$isLoading ? 'In repair' : $_('assets.filters.inRepair')}</option>
        <option value="retired">{$isLoading ? 'Retired' : $_('assets.filters.retired')}</option>
        <option value="disposed">{$isLoading ? 'Disposed' : $_('assets.filters.disposed')}</option>
        <option value="lost">{$isLoading ? 'Lost' : $_('assets.filters.lost')}</option>
      </Select>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Category' : $_('assets.filters.category')}</Label>
      <Select bind:value={categoryId}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each categories as category}
          <option value={category.id}>{category.name}</option>
        {/each}
      </Select>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Vendor' : $_('assets.filters.vendor')}</Label>
      <Select bind:value={vendorId}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each vendors as vendor}
          <option value={vendor.id}>{vendor.name}</option>
        {/each}
      </Select>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Model' : $_('assets.filters.model')}</Label>
      <Select bind:value={modelId}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each models as model}
          <option value={model.id}>{model.name}</option>
        {/each}
      </Select>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Location' : $_('assets.filters.location')}</Label>
      <Select bind:value={locationId}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        {#each locations as location}
          <option value={location.id}>{location.name}</option>
        {/each}
      </Select>
    </div>
  </div>

  <div class="mt-4 flex gap-2">
    <Button size="xs" on:click={applyFilters}>{$isLoading ? 'Apply' : $_('common.apply')}</Button>
    <Button size="xs" color="alternative" on:click={clearFilters}>{$isLoading ? 'Clear' : $_('common.clear')}</Button>
  </div>
</div>
