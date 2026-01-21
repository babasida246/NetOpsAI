<script lang="ts">
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import type { AssetStatus } from '$lib/api/assets';

  const statusRows: Array<{ value: AssetStatus; label: string; description: string }> = [
    { value: 'in_stock', label: 'In stock', description: 'Available in storage.' },
    { value: 'in_use', label: 'In use', description: 'Assigned to a person or system.' },
    { value: 'in_repair', label: 'In repair', description: 'Under maintenance or repair.' },
    { value: 'retired', label: 'Retired', description: 'Retired from active usage.' },
    { value: 'disposed', label: 'Disposed', description: 'Disposed or decommissioned.' },
    { value: 'lost', label: 'Lost', description: 'Missing or lost asset.' }
  ];
</script>

<div class="py-4 space-y-4">
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
    <p class="text-sm text-gray-500">
      Status values are fixed by the asset workflow and can be updated per asset.
    </p>
  </div>
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <Table>
      <TableHead>
        <TableHeadCell>Value</TableHeadCell>
        <TableHeadCell>Label</TableHeadCell>
        <TableHeadCell>Description</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each statusRows as row}
          <TableBodyRow>
            <TableBodyCell class="font-mono text-xs">{row.value}</TableBodyCell>
            <TableBodyCell>{row.label}</TableBodyCell>
            <TableBodyCell class="text-sm text-gray-500">{row.description}</TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</div>
