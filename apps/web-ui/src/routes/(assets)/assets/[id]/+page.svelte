<script lang="ts">
  import { page } from '$app/stores';
  import {
    Alert,
    Button,
    Card,
    Input,
    Label,
    Modal,
    Spinner,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell
  } from 'flowbite-svelte';
  import { ArrowLeft, Wrench, UserPlus, Undo2 } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import AssetTimeline from '$lib/assets/components/AssetTimeline.svelte';
  import AssignModal from '$lib/assets/components/AssignModal.svelte';
  import MaintenanceModal from '$lib/assets/components/MaintenanceModal.svelte';
  import AttachmentList from '$lib/assets/components/AttachmentList.svelte';
  import AttachmentUploader from '$lib/assets/components/AttachmentUploader.svelte';
  import {
    assignAsset,
    getAssetDetail,
    getAssetTimeline,
    openMaintenanceTicket,
    returnAsset,
    type Asset,
    type AssetAssignment,
    type MaintenanceTicket,
    type AssetEvent
  } from '$lib/api/assets';
  import { listAttachments, type Attachment } from '$lib/api/assetMgmt';
  let asset = $state<Asset | null>(null);
  let assignments = $state<AssetAssignment[]>([]);
  let maintenance = $state<MaintenanceTicket[]>([]);
  let timeline = $state<AssetEvent[]>([]);
  let attachments = $state<Attachment[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showAssignModal = $state(false);
  let showMaintenanceModal = $state(false);
  let showReturnModal = $state(false);
  let returning = $state(false);
  let returnNote = $state('');
  const assetId = $derived($page.params.id);
  async function loadDetail() {
    if (!assetId) return;
    try {
      loading = true;
      error = '';
      const detail = await getAssetDetail(assetId);
      asset = detail.data.asset;
      assignments = detail.data.assignments;
      maintenance = detail.data.maintenance;
      const timelineResp = await getAssetTimeline(assetId);
      timeline = timelineResp.data;
      const attachmentResp = await listAttachments(assetId);
      attachments = attachmentResp.data;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.loadFailed');
    } finally {
      loading = false;
    }
  }
  async function handleAssign(event: CustomEvent<{ assigneeType: string; assigneeName: string; assigneeId: string; note?: string }>) {
    if (!asset) return;
    try {
      await assignAsset(asset.id, event.detail);
      showAssignModal = false;
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.assignFailed');
    }
  }
  async function handleReturn() {
    if (!asset) return;
    try {
      returning = true;
      await returnAsset(asset.id, returnNote || undefined);
      showReturnModal = false;
      returnNote = '';
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.returnFailed');
    } finally {
      returning = false;
    }
  }
  async function handleMaintenance(event: CustomEvent<{ title: string; severity: string; diagnosis?: string; resolution?: string }>) {
    if (!asset) return;
    try {
      await openMaintenanceTicket({ assetId: asset.id, ...event.detail });
      showMaintenanceModal = false;
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.openMaintenanceFailed');
    }
  }
  $effect(() => {
    void loadDetail();
  });
</script>
<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-4 flex items-center gap-3">
    <Button color="alternative" href="/assets">
      <ArrowLeft class="w-4 h-4 mr-2" /> {$isLoading ? 'Back' : $_('common.back')}
    </Button>
    <div>
      <h1 class="text-2xl font-semibold">{asset?.assetCode || ($isLoading ? 'Asset' : $_('assets.asset'))}</h1>
      <p class="text-sm text-gray-500">{asset?.status}</p>
    </div>
  </div>
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if asset}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{$isLoading ? 'Overview' : $_('assets.overview')}</h2>
          <div class="flex gap-2">
            <Button size="xs" on:click={() => showAssignModal = true}>
              <UserPlus class="w-4 h-4 mr-1" /> {$isLoading ? 'Assign' : $_('assets.assign')}
            </Button>
            <Button size="xs" color="alternative" on:click={() => showReturnModal = true}>
              <Undo2 class="w-4 h-4 mr-1" /> {$isLoading ? 'Return' : $_('assets.return')}
            </Button>
            <Button size="xs" color="alternative" on:click={() => showMaintenanceModal = true}>
              <Wrench class="w-4 h-4 mr-1" /> {$isLoading ? 'Maintenance' : $_('maintenance.title')}
            </Button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">{$isLoading ? 'Model' : $_('assets.model')}</p>
            <p class="font-medium">{asset.modelName || '-'}</p>
          </div>
          <div>
            <p class="text-gray-500">{$isLoading ? 'Vendor' : $_('assets.vendor')}</p>
            <p class="font-medium">{asset.vendorName || '-'}</p>
          </div>
          <div>
            <p class="text-gray-500">{$isLoading ? 'Location' : $_('assets.location')}</p>
            <p class="font-medium">{asset.locationName || '-'}</p>
          </div>
          <div>
            <p class="text-gray-500">{$isLoading ? 'Serial' : $_('assets.serialNumber')}</p>
            <p class="font-medium">{asset.serialNo || '-'}</p>
          </div>
          <div>
            <p class="text-gray-500">{$isLoading ? 'Mgmt IP' : $_('assets.mgmtIp')}</p>
            <p class="font-medium">{asset.mgmtIp || '-'}</p>
          </div>
          <div>
            <p class="text-gray-500">{$isLoading ? 'Warranty End' : $_('assets.warrantyEnd')}</p>
            <p class="font-medium">{asset.warrantyEnd || '-'}</p>
          </div>
        </div>
      </Card>
      <Card>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Timeline' : $_('assets.timeline')}</h2>
        <AssetTimeline events={timeline} />
      </Card>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Assignments' : $_('assets.assignments')}</h2>
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Assignee' : $_('assets.assignee')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Type' : $_('assets.assigneeType')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Assigned' : $_('assets.assignedAt')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Returned' : $_('assets.returnedAt')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each assignments as item}
              <TableBodyRow>
                <TableBodyCell>{item.assigneeName}</TableBodyCell>
                <TableBodyCell>{item.assigneeType}</TableBodyCell>
                <TableBodyCell>{new Date(item.assignedAt).toLocaleDateString()}</TableBodyCell>
                <TableBodyCell>{item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : '-'}</TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Maintenance' : $_('maintenance.title')}</h2>
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Title' : $_('maintenance.titleLabel')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Severity' : $_('maintenance.severity')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Opened' : $_('maintenance.openedAt')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each maintenance as item}
              <TableBodyRow>
                <TableBodyCell>{item.title}</TableBodyCell>
                <TableBodyCell>{item.severity}</TableBodyCell>
                <TableBodyCell>{item.status}</TableBodyCell>
                <TableBodyCell>{new Date(item.openedAt).toLocaleDateString()}</TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </Card>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Attachments' : $_('assets.attachments')}</h2>
        {#if asset}
          <AttachmentUploader assetId={asset.id} on:uploaded={loadDetail} />
        {/if}
        <div class="mt-4">
          <AttachmentList assetId={asset?.id || ''} attachments={attachments} />
        </div>
      </Card>
    </div>
  {/if}
</div>
<AssignModal bind:open={showAssignModal} assetCode={asset?.assetCode || ''} on:assign={handleAssign} />
<MaintenanceModal bind:open={showMaintenanceModal} assetCode={asset?.assetCode || ''} on:submit={handleMaintenance} />
<Modal bind:open={showReturnModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$isLoading ? 'Return Asset' : $_('assets.returnAsset')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Return Note' : $_('assets.returnNote')}</Label>
      <Input bind:value={returnNote} placeholder={$isLoading ? 'Optional note' : $_('assets.placeholders.returnNote')} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showReturnModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button on:click={handleReturn} disabled={returning}>
        {returning ? ($isLoading ? 'Returning...' : $_('assets.returning')) : ($isLoading ? 'Return' : $_('assets.return'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
