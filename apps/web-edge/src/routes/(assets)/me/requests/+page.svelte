<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Alert,
    Badge,
    Button,
    Select,
    Spinner,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell
  } from 'flowbite-svelte';
  import { ArrowRight, RefreshCw } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listWorkflowRequests, type WorkflowRequest } from '$lib/api/assetMgmt';

  let currentUserId = $state('');

  let requests = $state<WorkflowRequest[]>([]);
  let loading = $state(true);
  let error = $state('');

  let status = $state('');
  let requestType = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  onMount(() => {
    if (typeof window === 'undefined') return;
    currentUserId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || '';
  });

  const canLoad = $derived.by(() => currentUserId.trim().length > 0);

  async function load(page = 1) {
    if (!canLoad) {
      loading = false;
      return;
    }
    try {
      loading = true;
      error = '';
      const response = await listWorkflowRequests({
        status: status || undefined,
        requestType: requestType || undefined,
        requestedBy: currentUserId,
        page,
        limit: meta.limit
      });
      requests = response.data ?? [];
      meta = {
        total: response.meta?.total ?? requests.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('me.requests.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'My Requests' : $_('me.requests.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Track your submitted workflow requests.' : $_('me.requests.subtitle')}
      </p>
    </div>
    <div class="flex gap-2">
      <Button color="light" onclick={() => load(meta.page)} disabled={loading || !canLoad}>
        <RefreshCw class="h-4 w-4 mr-2" />
        {$isLoading ? 'Refresh' : $_('common.refresh')}
      </Button>
    </div>
  </div>

  {#if !canLoad}
    <Alert color="yellow">
      {$isLoading ? 'Missing user identity. Please login again.' : $_('me.requests.errors.missingUser')}
    </Alert>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Select bind:value={status} onchange={() => load(1)}>
        <option value="">{$isLoading ? 'All statuses' : $_('requests.filters.allStatuses')}</option>
        <option value="submitted">{$_('requests.status.submitted')}</option>
        <option value="approved">{$_('requests.status.approved')}</option>
        <option value="rejected">{$_('requests.status.rejected')}</option>
        <option value="in_progress">{$_('requests.status.inProgress')}</option>
        <option value="done">{$_('requests.status.done')}</option>
        <option value="canceled">{$_('requests.status.canceled')}</option>
      </Select>
      <Select bind:value={requestType} onchange={() => load(1)}>
        <option value="">{$isLoading ? 'All types' : $_('requests.filters.allTypes')}</option>
        <option value="assign">{$_('requests.type.assign')}</option>
        <option value="return">{$_('requests.type.return')}</option>
        <option value="move">{$_('requests.type.move')}</option>
        <option value="repair">{$_('requests.type.repair')}</option>
        <option value="dispose">{$_('requests.type.dispose')}</option>
      </Select>
    </div>

    {#if error}
      <Alert color="red">{error}</Alert>
    {/if}

    {#if loading}
      <div class="flex justify-center py-12">
        <Spinner size="8" />
      </div>
    {:else if requests.length === 0}
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div class="text-sm text-slate-500">{$isLoading ? 'No requests yet' : $_('me.requests.empty')}</div>
      </div>
    {:else}
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Request' : $_('requests.request')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Type' : $_('common.type')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Created' : $_('requests.createdAt')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Action' : $_('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each requests as item}
              <TableBodyRow>
                <TableBodyCell class="font-mono text-xs">
                  <div>{item.id}</div>
                  <div class="text-[11px] text-slate-500">{item.assetId || '-'}</div>
                </TableBodyCell>
                <TableBodyCell>{item.requestType}</TableBodyCell>
                <TableBodyCell>
                  <Badge color="blue">{item.status}</Badge>
                </TableBodyCell>
                <TableBodyCell>{new Date(item.createdAt).toLocaleDateString()}</TableBodyCell>
                <TableBodyCell>
                  <a
                    class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                    href={`/requests/${item.id}`}
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
          <Button size="xs" color="light" disabled={meta.page <= 1} onclick={() => load(meta.page - 1)}>
            {$isLoading ? 'Previous' : $_('common.previous')}
          </Button>
          <Button size="xs" color="light" disabled={(meta.page * meta.limit) >= meta.total} onclick={() => load(meta.page + 1)}>
            {$isLoading ? 'Next' : $_('common.next')}
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

