<script lang="ts">
  import { Alert, Badge, Button, Input, Select, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { ArrowRight, Search, X } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listAssets, type Asset, type AssetStatus } from '$lib/api/assets';

  let query = $state('');
  let status = $state<AssetStatus | ''>('');

  let loading = $state(false);
  let error = $state('');
  let assets = $state<Asset[]>([]);
  let meta = $state({ total: 0, page: 1, limit: 20 });

  const hasSearch = $derived.by(() => query.trim().length > 0 || status !== '');

  async function search(page = 1) {
    if (!hasSearch) {
      assets = [];
      meta = { ...meta, total: 0, page: 1 };
      return;
    }

    try {
      loading = true;
      error = '';
      const response = await listAssets({
        query: query.trim() || undefined,
        status: status || undefined,
        page,
        limit: meta.limit
      });
      assets = response.data ?? [];
      meta = {
        total: response.meta?.total ?? assets.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('me.assets.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  function clearSearch() {
    query = '';
    status = '';
    assets = [];
    meta = { ...meta, total: 0, page: 1 };
  }
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'My Assets' : $_('me.assets.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Search assets by code, hostname, serial, or management IP.' : $_('me.assets.subtitle')}
      </p>
    </div>
    <div class="flex gap-2">
      <Button color="light" onclick={clearSearch} disabled={!hasSearch || loading}>
        <X class="h-4 w-4 mr-2" />
        {$isLoading ? 'Clear' : $_('common.clear')}
      </Button>
      <Button onclick={() => search(1)} disabled={!hasSearch || loading}>
        <Search class="h-4 w-4 mr-2" />
        {$isLoading ? 'Search' : $_('common.search')}
      </Button>
    </div>
  </div>

  <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
    <div class="space-y-1">
      <label for="my-assets-query" class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {$isLoading ? 'Search' : $_('me.assets.searchLabel')}
      </label>
      <Input
        id="my-assets-query"
        bind:value={query}
        placeholder={$isLoading ? 'Asset code, hostname, serial…' : $_('me.assets.searchPlaceholder')}
        onkeydown={(e) => e.key === 'Enter' && search(1)}
      />
      <p class="text-xs text-slate-400">{$_('me.assets.searchHelp')}</p>
    </div>

    <div class="space-y-1">
      <label for="my-assets-status" class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {$isLoading ? 'Status' : $_('me.assets.statusLabel')}
      </label>
      <Select id="my-assets-status" bind:value={status} onchange={() => search(1)}>
        <option value="">{$isLoading ? 'All statuses' : $_('me.assets.allStatuses')}</option>
        <option value="in_stock">{$_('assets.filters.inStock')}</option>
        <option value="in_use">{$_('assets.filters.inUse')}</option>
        <option value="in_repair">{$_('assets.filters.inRepair')}</option>
        <option value="retired">{$_('assets.filters.retired')}</option>
        <option value="disposed">{$_('assets.filters.disposed')}</option>
        <option value="lost">{$_('assets.filters.lost')}</option>
      </Select>
      <p class="text-xs text-slate-400">{$_('me.assets.statusHelp')}</p>
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if !hasSearch}
    <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {$isLoading ? 'Start with a search' : $_('me.assets.emptyTitle')}
      </div>
      <div class="text-sm mt-1">
        {$isLoading ? 'Enter an asset code or hostname to find what you need.' : $_('me.assets.emptySubtitle')}
      </div>
    </div>
  {:else if assets.length === 0}
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <div class="text-sm text-slate-500">{$isLoading ? 'No matches' : $_('me.assets.noMatches')}</div>
    </div>
  {:else}
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Asset' : $_('assets.asset')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Model' : $_('assets.model')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Location' : $_('assets.location')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Action' : $_('common.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each assets as item}
            <TableBodyRow>
              <TableBodyCell>
                <div class="font-semibold text-slate-900 dark:text-white">{item.assetCode}</div>
                <div class="text-xs text-slate-500">{item.hostname || item.mgmtIp || '-'}</div>
              </TableBodyCell>
              <TableBodyCell>
                <Badge color="blue">{$_(`assets.statuses.${item.status}`)}</Badge>
              </TableBodyCell>
              <TableBodyCell>{item.modelName || '-'}</TableBodyCell>
              <TableBodyCell>{item.locationName || '-'}</TableBodyCell>
              <TableBodyCell>
                <a
                  class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                  href={`/assets/${item.id}`}
                >
                  {$isLoading ? 'View' : $_('common.view')} <ArrowRight class="h-4 w-4" />
                </a>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>

    <div class="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>{$isLoading ? 'Page' : $_('table.page')} {meta.page}</span>
      <div class="flex gap-2">
        <Button size="xs" color="light" disabled={meta.page <= 1} onclick={() => search(meta.page - 1)}>
          {$isLoading ? 'Previous' : $_('common.previous')}
        </Button>
        <Button size="xs" color="light" disabled={(meta.page * meta.limit) >= meta.total} onclick={() => search(meta.page + 1)}>
          {$isLoading ? 'Next' : $_('common.next')}
        </Button>
      </div>
    </div>
  {/if}
</div>
