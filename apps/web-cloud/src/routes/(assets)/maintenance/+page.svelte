<script lang="ts">
  import {
    Alert,
    Button,
    Input,
    Label,
    Modal,
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
  import { listMaintenanceTickets } from '$lib/api/assetMgmt';
  import { openMaintenanceTicket, type MaintenanceTicket, type MaintenanceSeverity } from '$lib/api/assets';

  let tickets = $state<MaintenanceTicket[]>([]);
  let loading = $state(true);
  let error = $state('');
  let status = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  let showModal = $state(false);
  let creating = $state(false);
  let assetId = $state('');
  let title = $state('');
  let severity = $state<MaintenanceSeverity>('low');
  let diagnosis = $state('');
  let resolution = $state('');

  async function loadTickets(page = 1) {
    try {
      loading = true;
      const response = await listMaintenanceTickets({
        status: status || undefined,
        page,
        limit: meta.limit
      });
      tickets = response.data ?? [];
      meta = {
        total: response.meta?.total ?? response.data.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('maintenance.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  async function handleCreate() {
    if (!assetId || !title) return;
    try {
      creating = true;
      await openMaintenanceTicket({ assetId, title, severity, diagnosis: diagnosis || undefined, resolution: resolution || undefined });
      showModal = false;
      assetId = '';
      title = '';
      diagnosis = '';
      resolution = '';
      await loadTickets(1);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('maintenance.errors.createFailed');
    } finally {
      creating = false;
    }
  }

  $effect(() => {
    void loadTickets(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold">{$isLoading ? 'Maintenance Tickets' : $_('maintenance.title')}</h1>
      <p class="text-sm text-gray-500">{meta.total} {$isLoading ? 'tickets' : $_('maintenance.tickets')}</p>
    </div>
    <Button onclick={() => showModal = true}>
      <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Ticket' : $_('maintenance.newTicket')}
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  <div class="mb-4">
    <Label class="mb-2">{$isLoading ? 'Status' : $_('cmdb.status')}</Label>
    <Select bind:value={status} onchange={() => loadTickets(1)}>
      <option value="">{$isLoading ? 'All' : $_('common.all')}</option>
      <option value="open">{$isLoading ? 'Open' : $_('maintenance.open')}</option>
      <option value="in_progress">{$isLoading ? 'In progress' : $_('maintenance.inProgress')}</option>
      <option value="closed">{$isLoading ? 'Closed' : $_('maintenance.closed')}</option>
      <option value="canceled">{$isLoading ? 'Canceled' : $_('maintenance.canceled')}</option>
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
          <TableHeadCell>{$isLoading ? 'Asset' : $_('assets.asset')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Title' : $_('maintenance.titleLabel')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Severity' : $_('maintenance.severity')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Status' : $_('cmdb.status')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Opened' : $_('maintenance.openedAt')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each tickets as ticket}
            <TableBodyRow>
              <TableBodyCell>{ticket.assetId}</TableBodyCell>
              <TableBodyCell>{ticket.title}</TableBodyCell>
              <TableBodyCell>{ticket.severity}</TableBodyCell>
              <TableBodyCell>{ticket.status}</TableBodyCell>
              <TableBodyCell>{new Date(ticket.openedAt).toLocaleDateString()}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>

<Modal bind:open={showModal}>
  <svelte:fragment slot="header">
  
      <h3 class="text-lg font-semibold">{$isLoading ? 'Open Maintenance Ticket' : $_('maintenance.openTicket')}</h3>
    
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Asset ID' : $_('maintenance.assetId')}</Label>
      <Input bind:value={assetId} placeholder={$isLoading ? 'UUID' : $_('maintenance.placeholders.assetId')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Title' : $_('maintenance.titleLabel')}</Label>
      <Input bind:value={title} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Severity' : $_('maintenance.severity')}</Label>
      <Select bind:value={severity}>
        <option value="low">{$isLoading ? 'Low' : $_('maintenance.low')}</option>
        <option value="medium">{$isLoading ? 'Medium' : $_('maintenance.medium')}</option>
        <option value="high">{$isLoading ? 'High' : $_('maintenance.high')}</option>
        <option value="critical">{$isLoading ? 'Critical' : $_('maintenance.critical')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Diagnosis' : $_('maintenance.diagnosis')}</Label>
      <Input bind:value={diagnosis} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Resolution' : $_('maintenance.resolution')}</Label>
      <Input bind:value={resolution} />
    </div>
  </div>
  <svelte:fragment slot="footer">
  
      <div class="flex justify-end gap-2">
        <Button color="alternative" onclick={() => showModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
        <Button onclick={handleCreate} disabled={creating || !assetId || !title}>
          {creating ? ($isLoading ? 'Creating...' : $_('common.loading')) : ($isLoading ? 'Create' : $_('common.create'))}
        </Button>
      </div>
    
  </svelte:fragment>
</Modal>

