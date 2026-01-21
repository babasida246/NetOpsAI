<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _, isLoading } from '$lib/i18n';
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Pencil, Trash2 } from 'lucide-svelte';
  import type { AssetCategory, AssetModel, Vendor } from '$lib/api/assetCatalogs';

  let {
    models = [],
    categories = [],
    vendors = [],
    disabled = false
  } = $props<{
    models?: AssetModel[];
    categories?: AssetCategory[];
    vendors?: Vendor[];
    disabled?: boolean;
  }>();

  const dispatch = createEventDispatcher<{ edit: AssetModel; remove: string }>();
</script>

<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
  <Table>
    <TableHead>
      <TableHeadCell>{$isLoading ? 'Model' : $_('assets.model')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Brand' : $_('assets.brand')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Category' : $_('assets.category')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Vendor' : $_('assets.vendor')}</TableHeadCell>
      <TableHeadCell class="w-32">{$isLoading ? 'Actions' : $_('common.actions')}</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each models as model}
        <TableBodyRow>
          <TableBodyCell>{model.model}</TableBodyCell>
          <TableBodyCell>{model.brand || '-'}</TableBodyCell>
          <TableBodyCell>{categories.find(cat => cat.id === model.categoryId)?.name || '-'}</TableBodyCell>
          <TableBodyCell>{vendors.find(vendor => vendor.id === model.vendorId)?.name || '-'}</TableBodyCell>
          <TableBodyCell>
            <div class="flex gap-2">
              <Button size="xs" color="alternative" on:click={() => dispatch('edit', model)} disabled={disabled}>
                <Pencil class="w-3 h-3" />
              </Button>
              <Button size="xs" color="alternative" on:click={() => dispatch('remove', model.id)} disabled={disabled}>
                <Trash2 class="w-3 h-3" />
              </Button>
            </div>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
</div>
