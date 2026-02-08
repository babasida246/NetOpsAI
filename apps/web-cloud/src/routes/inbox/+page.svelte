<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Alert,
    Badge,
    Button,
    Card,
    Input,
    Spinner,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell
  } from 'flowbite-svelte';
  import { Check, RefreshCw, X } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    approveWorkflowRequest,
    listWorkflowRequests,
    rejectWorkflowRequest,
    type WorkflowRequest
  } from '$lib/api/assetMgmt';

  let requests = $state<WorkflowRequest[]>([]);
  let loading = $state(true);
  let error = $state('');
  let actionError = $state('');

  let meta = $state({ total: 0, page: 1, limit: 20 });
  let rejecting = $state<Record<string, boolean>>({});
  let approving = $state<Record<string, boolean>>({});
  let rejectReasons = $state<Record<string, string>>({});

  async function load(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listWorkflowRequests({
        status: 'submitted',
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
      error = err instanceof Error ? err.message : $_('inbox.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  async function handleApprove(id: string) {
    try {
      approving = { ...approving, [id]: true };
      actionError = '';
      await approveWorkflowRequest(id);
      await load(meta.page);
    } catch (err) {
      actionError = err instanceof Error ? err.message : $_('inbox.errors.approveFailed');
    } finally {
      approving = { ...approving, [id]: false };
    }
  }

  async function handleReject(id: string) {
    try {
      rejecting = { ...rejecting, [id]: true };
      actionError = '';
      await rejectWorkflowRequest(id, rejectReasons[id] || undefined);
      rejectReasons = { ...rejectReasons, [id]: '' };
      await load(meta.page);
    } catch (err) {
      actionError = err instanceof Error ? err.message : $_('inbox.errors.rejectFailed');
    } finally {
      rejecting = { ...rejecting, [id]: false };
    }
  }

  onMount(() => {
    void load(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Inbox' : $_('inbox.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Review and approve pending workflow requests.' : $_('inbox.subtitle')}
      </p>
    </div>
    <Button color="light" onclick={() => load(meta.page)} disabled={loading}>
      <RefreshCw class="h-4 w-4 mr-2" />
      {$isLoading ? 'Refresh' : $_('common.refresh')}
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if actionError}
    <Alert color="red" class="mb-4">{actionError}</Alert>
  {/if}

  <Card size="none" class="p-5">
    <div class="flex items-center justify-between">
      <div class="text-sm text-slate-500">
        {$isLoading ? 'Submitted requests' : $_('inbox.submitted')}
      </div>
      <Badge color="blue">{meta.total}</Badge>
    </div>

    {#if loading}
      <div class="flex justify-center py-12">
        <Spinner size="8" />
      </div>
    {:else if requests.length === 0}
      <div class="mt-4 text-sm text-slate-500">
        {$isLoading ? 'No pending requests.' : $_('inbox.empty')}
      </div>
    {:else}
      <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Request' : $_('requests.request')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Type' : $_('common.type')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Requested by' : $_('requests.requestedBy')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Created' : $_('requests.createdAt')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Actions' : $_('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each requests as req (req.id)}
              <TableBodyRow>
                <TableBodyCell class="font-mono text-xs">
                  <div>{req.id}</div>
                  <div class="text-[11px] text-slate-500">{req.assetId || '-'}</div>
                </TableBodyCell>
                <TableBodyCell>{req.requestType}</TableBodyCell>
                <TableBodyCell>{req.requestedBy || '-'}</TableBodyCell>
                <TableBodyCell>{new Date(req.createdAt).toLocaleString()}</TableBodyCell>
                <TableBodyCell>
                  <div class="flex flex-col gap-2 min-w-[240px]">
                    <div class="flex gap-2">
                      <Button size="xs" onclick={() => handleApprove(req.id)} disabled={approving[req.id]}>
                        <Check class="h-4 w-4 mr-1" />
                        {$isLoading ? 'Approve' : $_('requests.approve')}
                      </Button>
                      <Button size="xs" color="alternative" onclick={() => handleReject(req.id)} disabled={rejecting[req.id]}>
                        <X class="h-4 w-4 mr-1" />
                        {$isLoading ? 'Reject' : $_('requests.reject')}
                      </Button>
                    </div>
                    <Input
                      bind:value={rejectReasons[req.id]}
                      placeholder={$isLoading ? 'Reject reason (optional)' : $_('requests.placeholders.rejectReason')}
                    />
                  </div>
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
  </Card>
</div>

