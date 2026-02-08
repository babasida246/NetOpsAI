<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import DataTable from '$lib/components/DataTable.svelte';
  import type { AssetCategory, AssetModel, Vendor } from '$lib/api/assetCatalogs';

  let {
    models = [],
    categories = [],
    vendors = [],
    disabled = false,
    onedit,
    onremove
  } = $props<{
    models?: AssetModel[];
    categories?: AssetCategory[];
    vendors?: Vendor[];
    disabled?: boolean;
    onedit?: (model: AssetModel) => void;
    onremove?: (id: string) => void;
  }>();

  // Ensure all props are always arrays
  const safeModels = $derived(Array.isArray(models) ? models : []);
  const safeCategories = $derived(Array.isArray(categories) ? categories : []);
  const safeVendors = $derived(Array.isArray(vendors) ? vendors : []);

  const columns = [
    { key: 'model' as const, label: $isLoading ? 'Model' : $_('assets.model'), sortable: true, filterable: true },
    { key: 'brand' as const, label: $isLoading ? 'Brand' : $_('assets.brand'), sortable: true, filterable: true, render: (row: AssetModel) => row.brand || '-' },
    { 
      key: 'categoryId' as const, 
      label: $isLoading ? 'Category' : $_('assets.category'), 
      sortable: true, 
      filterable: true,
      render: (row: AssetModel) => safeCategories.find((cat: AssetCategory) => cat.id === row.categoryId)?.name || '-'
    },
    { 
      key: 'vendorId' as const, 
      label: $isLoading ? 'Vendor' : $_('assets.vendor'), 
      sortable: true, 
      filterable: true,
      render: (row: AssetModel) => safeVendors.find((vendor: Vendor) => vendor.id === row.vendorId)?.name || '-'
    }
  ];

  async function handleEdit(row: AssetModel) {
    onedit?.(row);
  }

  async function handleDelete(rows: AssetModel[]) {
    for (const row of rows) {
      onremove?.(row.id);
    }
  }
</script>

<DataTable
  data={safeModels}
  {columns}
  rowKey="id"
  selectable={!disabled}
  loading={false}
  onEdit={disabled ? undefined : handleEdit}
  onDelete={disabled ? undefined : handleDelete}
/>
