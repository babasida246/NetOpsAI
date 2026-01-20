<script lang="ts">
  import {
    Alert,
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
  import { Plus } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listWorkflowRequests, type WorkflowRequest } from '$lib/api/assetMgmt';

  let requests = $state<WorkflowRequest[]>([]);
  let loading = $state(true);
  let error = $state('');
  let status = $state('');
  let requestType = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  async function loadRequests(page = 1) {
    try {
      loading = true;
      const response = await listWorkflowRequests({
        status: status || undefined,
        requestType: requestType || undefined,
        page,
        limit: meta.limit
      });
      requests = response.data;
      meta = {
        total: response.meta?.total ?? response.data.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('requests.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void loadRequests(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold">{$isLoading ? 'Workflow Requests' : $_('requests.title')}</h1>
      <p class="text-sm text-gray-500">
        {$isLoading ? `${meta.total} requests` : $_('requests.total', { values: { count: meta.total } })}
      </p>
    </div>
    <Button href="/requests/new">
      <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Request' : $_('requests.new')}
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <Select bind:value={status} on:change={() => loadRequests(1)}>
      <option value="">{$isLoading ? 'All statuses' : $_('requests.filters.allStatuses')}</option>
      <option value="submitted">{$isLoading ? 'Submitted' : $_('requests.status.submitted')}</option>
      <option value="approved">{$isLoading ? 'Approved' : $_('requests.status.approved')}</option>
      <option value="rejected">{$isLoading ? 'Rejected' : $_('requests.status.rejected')}</option>
      <option value="in_progress">{$isLoading ? 'In progress' : $_('requests.status.inProgress')}</option>
      <option value="done">{$isLoading ? 'Done' : $_('requests.status.done')}</option>
      <option value="canceled">{$isLoading ? 'Canceled' : $_('requests.status.canceled')}</option>
    </Select>
    <Select bind:value={requestType} on:change={() => loadRequests(1)}>
      <option value="">{$isLoading ? 'All types' : $_('requests.filters.allTypes')}</option>
      <option value="assign">{$isLoading ? 'Assign' : $_('requests.type.assign')}</option>
      <option value="return">{$isLoading ? 'Return' : $_('requests.type.return')}</option>
      <option value="move">{$isLoading ? 'Move' : $_('requests.type.move')}</option>
      <option value="repair">{$isLoading ? 'Repair' : $_('requests.type.repair')}</option>
      <option value="dispose">{$isLoading ? 'Dispose' : $_('requests.type.dispose')}</option>
    </Select>
  </div>

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Request' : $_('requests.request')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Asset' : $_('assets.asset')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Type' : $_('common.type')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Created' : $_('requests.createdAt')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Action' : $_('common.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each requests as item}
            <TableBodyRow>
              <TableBodyCell class="font-mono text-xs">{item.id}</TableBodyCell>
              <TableBodyCell>{item.assetId || '-'}</TableBodyCell>
              <TableBodyCell>{item.requestType}</TableBodyCell>
              <TableBodyCell>{item.status}</TableBodyCell>
              <TableBodyCell>{new Date(item.createdAt).toLocaleDateString()}</TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="alternative" href={`/requests/${item.id}`}>{$isLoading ? 'View' : $_('common.view')}</Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>
