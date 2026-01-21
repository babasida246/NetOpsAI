<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import type { CmdbAttrDef } from '$lib/api/cmdb';

  let {
    defs = [],
    onEdit = () => {},
    onRemove = () => {}
  } = $props<{
    defs?: CmdbAttrDef[];
    onEdit?: (def: CmdbAttrDef) => void;
    onRemove?: (def: CmdbAttrDef) => void;
  }>();
</script>

<div class="space-y-2">
  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{$isLoading ? 'Attributes' : $_('cmdb.type.attributes')}</h3>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <Table>
      <TableHead>
        <TableHeadCell>{$isLoading ? 'Key' : $_('cmdb.type.key')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Label' : $_('cmdb.type.label')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Type' : $_('cmdb.type.type')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Required' : $_('cmdb.type.required')}</TableHeadCell>
        <TableHeadCell></TableHeadCell>
      </TableHead>
      <TableBody>
        {#if defs.length === 0}
          <TableBodyRow>
            <TableBodyCell colspan="5" class="text-center text-slate-500">{$isLoading ? 'No attributes.' : $_('cmdb.type.noAttributes')}</TableBodyCell>
          </TableBodyRow>
        {:else}
          {#each defs as def}
            <TableBodyRow>
              <TableBodyCell class="font-medium">{def.key}</TableBodyCell>
              <TableBodyCell>{def.label}</TableBodyCell>
              <TableBodyCell>{def.fieldType}</TableBodyCell>
              <TableBodyCell>{def.required ? ($isLoading ? 'Yes' : $_('common.yes')) : ($isLoading ? 'No' : $_('common.no'))}</TableBodyCell>
              <TableBodyCell class="text-right">
                <div class="flex gap-2 justify-end">
                  <Button size="xs" color="alternative" onclick={() => onEdit(def)}>{$isLoading ? 'Edit' : $_('common.edit')}</Button>
                  <Button size="xs" color="red" onclick={() => onRemove(def)}>{$isLoading ? 'Delete' : $_('common.delete')}</Button>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        {/if}
      </TableBody>
    </Table>
  </div>
</div>
