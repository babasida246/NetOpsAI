<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _, isLoading } from '$lib/i18n';
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import type { CategorySpecDef } from '$lib/api/assetCatalogs';

  let { specDefs = [], disabled = false } = $props<{
    specDefs?: CategorySpecDef[];
    disabled?: boolean;
  }>();

  const dispatch = createEventDispatcher<{ edit: CategorySpecDef; remove: CategorySpecDef }>();
</script>

<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
  <Table>
    <TableHead>
      <TableHeadCell>{$isLoading ? 'Label' : $_('assets.label')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Key' : $_('assets.key')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Type' : $_('assets.type')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Required' : $_('assets.required')}</TableHeadCell>
      <TableHeadCell class="w-32">{$isLoading ? 'Actions' : $_('common.actions')}</TableHeadCell>
    </TableHead>
    <TableBody>
      {#if specDefs.length === 0}
        <TableBodyRow>
          <TableBodyCell colspan="5">{$isLoading ? 'No spec fields defined.' : $_('assets.noSpecFields')}</TableBodyCell>
        </TableBodyRow>
      {:else}
        {#each specDefs as def}
          <TableBodyRow>
            <TableBodyCell>{def.label}</TableBodyCell>
            <TableBodyCell>{def.key}</TableBodyCell>
            <TableBodyCell>{def.fieldType}</TableBodyCell>
            <TableBodyCell>{def.required ? ($isLoading ? 'Yes' : $_('common.yes')) : ($isLoading ? 'No' : $_('common.no'))}</TableBodyCell>
            <TableBodyCell>
              <div class="flex gap-2">
                <Button size="xs" color="alternative" on:click={() => dispatch('edit', def)} disabled={disabled}>{$isLoading ? 'Edit' : $_('common.edit')}</Button>
                <Button size="xs" color="alternative" on:click={() => dispatch('remove', def)} disabled={disabled}>{$isLoading ? 'Delete' : $_('common.delete')}</Button>
              </div>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>
