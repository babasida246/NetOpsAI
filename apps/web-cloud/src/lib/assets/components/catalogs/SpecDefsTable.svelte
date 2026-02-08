<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import DataTable from '$lib/components/DataTable.svelte';
  import type { CategorySpecDef } from '$lib/api/assetCatalogs';

  let { specDefs = [], disabled = false, onedit, onremove } = $props<{
    specDefs?: CategorySpecDef[];
    disabled?: boolean;
    onedit?: (def: CategorySpecDef) => void;
    onremove?: (def: CategorySpecDef) => void;
  }>();

  const columns = [
    { key: 'label' as const, label: $isLoading ? 'Label' : $_('assets.label'), sortable: true, filterable: true },
    { key: 'key' as const, label: $isLoading ? 'Key' : $_('assets.key'), sortable: true, filterable: true },
    { key: 'fieldType' as const, label: $isLoading ? 'Type' : $_('assets.type'), sortable: true, filterable: true },
    { key: 'required' as const, label: $isLoading ? 'Required' : $_('assets.required'), sortable: true, render: (row: CategorySpecDef) => row.required ? ($isLoading ? 'Yes' : $_('common.yes')) : ($isLoading ? 'No' : $_('common.no')) }
  ];

  async function handleEdit(row: CategorySpecDef) {
    onedit?.(row);
  }

  async function handleDelete(rows: CategorySpecDef[]) {
    for (const row of rows) {
      onremove?.(row);
    }
  }
</script>

<DataTable
  data={specDefs}
  {columns}
  rowKey="id"
  selectable={!disabled}
  loading={false}
  onEdit={disabled ? undefined : handleEdit}
  onDelete={disabled ? undefined : handleDelete}
/>
