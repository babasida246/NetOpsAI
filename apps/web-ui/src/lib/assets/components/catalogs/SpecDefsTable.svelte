<script lang="ts">
  import { createEventDispatcher } from 'svelte';
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
      <TableHeadCell>Label</TableHeadCell>
      <TableHeadCell>Key</TableHeadCell>
      <TableHeadCell>Type</TableHeadCell>
      <TableHeadCell>Required</TableHeadCell>
      <TableHeadCell class="w-32">Actions</TableHeadCell>
    </TableHead>
    <TableBody>
      {#if specDefs.length === 0}
        <TableBodyRow>
          <TableBodyCell colspan="5">No spec fields defined.</TableBodyCell>
        </TableBodyRow>
      {:else}
        {#each specDefs as def}
          <TableBodyRow>
            <TableBodyCell>{def.label}</TableBodyCell>
            <TableBodyCell>{def.key}</TableBodyCell>
            <TableBodyCell>{def.fieldType}</TableBodyCell>
            <TableBodyCell>{def.required ? 'Yes' : 'No'}</TableBodyCell>
            <TableBodyCell>
              <div class="flex gap-2">
                <Button size="xs" color="alternative" on:click={() => dispatch('edit', def)} disabled={disabled}>Edit</Button>
                <Button size="xs" color="alternative" on:click={() => dispatch('remove', def)} disabled={disabled}>Delete</Button>
              </div>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>
