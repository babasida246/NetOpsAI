<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import StatusBadge from './StatusBadge.svelte';
  import type { Asset } from '$lib/api/assets';
  import { _, isLoading } from '$lib/i18n';

  let { assets = [] } = $props<{ assets?: Asset[] }>();
</script>

<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
  <Table>
    <TableHead>
      <TableHeadCell>{$isLoading ? 'Asset Code' : $_('assets.assetCode')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Model' : $_('assets.model')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Vendor' : $_('assets.vendor')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Location' : $_('assets.location')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Mgmt IP' : $_('assets.mgmtIp')}</TableHeadCell>
      <TableHeadCell>{$isLoading ? 'Actions' : $_('common.actions')}</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each assets as asset}
        <TableBodyRow>
          <TableBodyCell>
            <a href={`/assets/${asset.id}`} class="font-medium text-primary-600 hover:underline">
              {asset.assetCode}
            </a>
          </TableBodyCell>
          <TableBodyCell>
            <StatusBadge status={asset.status} />
          </TableBodyCell>
          <TableBodyCell>{asset.modelName || '-'}</TableBodyCell>
          <TableBodyCell>{asset.vendorName || '-'}</TableBodyCell>
          <TableBodyCell>{asset.locationName || '-'}</TableBodyCell>
          <TableBodyCell class="font-mono text-xs">{asset.mgmtIp || '-'}</TableBodyCell>
          <TableBodyCell>
            <Button size="xs" color="alternative" href={`/assets/${asset.id}`}>{$isLoading ? 'View' : $_('common.view')}</Button>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
</div>
