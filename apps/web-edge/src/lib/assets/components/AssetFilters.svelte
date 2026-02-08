<script lang="ts">
  import { Button, Input, Label, Select } from 'flowbite-svelte';
  import { Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';

  type CatalogOption = { id: string; name: string };

  let {
    query = $bindable(''),
    status = $bindable(''),
    warrantyExpiringDays = $bindable(''),
    sort = $bindable(''),
    categoryId = $bindable(''),
    vendorId = $bindable(''),
    modelId = $bindable(''),
    locationId = $bindable(''),
    categories = [],
    vendors = [],
    models = [],
    locations = [],
    onapply,
    onclear
  } = $props<{
    query?: string;
    status?: string;
    warrantyExpiringDays?: string;
    sort?: string;
    categoryId?: string;
    vendorId?: string;
    modelId?: string;
    locationId?: string;
    categories?: CatalogOption[];
    vendors?: CatalogOption[];
    models?: CatalogOption[];
    locations?: CatalogOption[];
    onapply?: () => void;
    onclear?: () => void;
  }>();

  function applyFilters() {
    onapply?.();
  }

  function clearFilters() {
    query = '';
    status = '';
    warrantyExpiringDays = '';
    sort = '';
    categoryId = '';
    vendorId = '';
    modelId = '';
    locationId = '';
    onclear?.();
  }
</script>

<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
  <div class="grid grid-cols-1 md:grid-cols-8 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Search' : $_('common.search')}</Label>
      <Input bind:value={query} placeholder={$isLoading ? 'Asset code, hostname, IP...' : $_('assets.searchPlaceholder')}>
        <svelte:fragment slot="left">
                <Search  class="w-4 h-4" />
              </svelte:fragment>
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
      <Label class="mb-2">{$isLoading ? 'Warranty' : $_('assets.filters.warranty')}</Label>
      <Select bind:value={warrantyExpiringDays}>
        <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
        <option value="30">{$isLoading ? 'Expiring in 30 days' : $_('assets.filters.warranty30')}</option>
        <option value="60">{$isLoading ? 'Expiring in 60 days' : $_('assets.filters.warranty60')}</option>
        <option value="90">{$isLoading ? 'Expiring in 90 days' : $_('assets.filters.warranty90')}</option>
      </Select>
    </div>

    <div>
      <Label class="mb-2">{$isLoading ? 'Sort' : $_('assets.filters.sort')}</Label>
      <Select bind:value={sort}>
        <option value="">{$isLoading ? 'Newest' : $_('assets.filters.sortNewest')}</option>
        <option value="asset_code_asc">{$isLoading ? 'Asset code (A-Z)' : $_('assets.filters.sortCodeAsc')}</option>
        <option value="asset_code_desc">{$isLoading ? 'Asset code (Z-A)' : $_('assets.filters.sortCodeDesc')}</option>
        <option value="warranty_end_asc">{$isLoading ? 'Warranty end' : $_('assets.filters.sortWarranty')}</option>
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
    <Button size="xs" onclick={applyFilters}>{$isLoading ? 'Apply' : $_('common.apply')}</Button>
    <Button size="xs" color="alternative" onclick={clearFilters}>{$isLoading ? 'Clear' : $_('common.clear')}</Button>
  </div>
</div>

