<script lang="ts">
  import { page } from '$app/stores';
  import { Alert, Button, Card, Input, Label, Spinner } from 'flowbite-svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    approveWorkflowRequest,
    executeWorkflowRequest,
    getWorkflowRequest,
    rejectWorkflowRequest,
    type WorkflowRequest
  } from '$lib/api/assetMgmt';

  let request = $state<WorkflowRequest | null>(null);
  let loading = $state(true);
  let error = $state('');
  let actionError = $state('');
  let rejecting = $state(false);
  let approving = $state(false);
  let executing = $state(false);
  let rejectReason = $state('');

  const requestId = $derived($page.params.id);

  async function loadDetail() {
    if (!requestId) return;
    try {
      loading = true;
      const response = await getWorkflowRequest(requestId);
      request = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('requests.errors.loadDetailFailed');
    } finally {
      loading = false;
    }
  }

  async function handleApprove() {
    if (!request) return;
    try {
      approving = true;
      actionError = '';
      await approveWorkflowRequest(request.id);
      await loadDetail();
    } catch (err) {
      actionError = err instanceof Error ? err.message : $_('requests.errors.approveFailed');
    } finally {
      approving = false;
    }
  }

  async function handleReject() {
    if (!request) return;
    try {
      rejecting = true;
      actionError = '';
      await rejectWorkflowRequest(request.id, rejectReason || undefined);
      rejectReason = '';
      await loadDetail();
    } catch (err) {
      actionError = err instanceof Error ? err.message : $_('requests.errors.rejectFailed');
    } finally {
      rejecting = false;
    }
  }

  async function handleExecute() {
    if (!request) return;
    try {
      executing = true;
      actionError = '';
      await executeWorkflowRequest(request.id);
      await loadDetail();
    } catch (err) {
      actionError = err instanceof Error ? err.message : $_('requests.errors.executeFailed');
    } finally {
      executing = false;
    }
  }

  $effect(() => {
    void loadDetail();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-4 flex items-center gap-3">
    <Button color="alternative" href="/requests">
      <ArrowLeft class="w-4 h-4 mr-2" /> {$isLoading ? 'Back' : $_('common.back')}
    </Button>
    <div>
      <h1 class="text-2xl font-semibold">{$isLoading ? 'Workflow Request' : $_('requests.detailTitle')}</h1>
      <p class="text-sm text-gray-500">{request?.status || '-'}</p>
    </div>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else if request}
    <Card class="mb-6">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-gray-500">{$isLoading ? 'Request Type' : $_('requests.requestType')}</p>
          <p class="font-medium">{request.requestType}</p>
        </div>
        <div>
          <p class="text-gray-500">{$isLoading ? 'Asset ID' : $_('maintenance.assetId')}</p>
          <p class="font-medium">{request.assetId || '-'}</p>
        </div>
        <div>
          <p class="text-gray-500">{$isLoading ? 'Requested By' : $_('requests.requestedBy')}</p>
          <p class="font-medium">{request.requestedBy || '-'}</p>
        </div>
        <div>
          <p class="text-gray-500">{$isLoading ? 'Approved By' : $_('requests.approvedBy')}</p>
          <p class="font-medium">{request.approvedBy || '-'}</p>
        </div>
      </div>
    </Card>

    {#if actionError}
      <Alert color="red" class="mb-4">{actionError}</Alert>
    {/if}

    <div class="flex flex-wrap gap-2">
      {#if request.status === 'submitted'}
        <Button size="xs" on:click={handleApprove} disabled={approving}>
          {approving ? ($isLoading ? 'Approving...' : $_('requests.approving')) : ($isLoading ? 'Approve' : $_('requests.approve'))}
        </Button>
        <div class="flex items-end gap-2">
          <div>
            <Label class="mb-2">{$isLoading ? 'Reject Reason' : $_('requests.rejectReason')}</Label>
            <Input bind:value={rejectReason} placeholder={$isLoading ? 'Optional reason' : $_('requests.placeholders.rejectReason')} />
          </div>
          <Button size="xs" color="alternative" on:click={handleReject} disabled={rejecting}>
            {rejecting ? ($isLoading ? 'Rejecting...' : $_('requests.rejecting')) : ($isLoading ? 'Reject' : $_('requests.reject'))}
          </Button>
        </div>
      {:else if request.status === 'approved'}
        <Button size="xs" on:click={handleExecute} disabled={executing}>
          {executing ? ($isLoading ? 'Executing...' : $_('requests.executing')) : ($isLoading ? 'Execute' : $_('requests.execute'))}
        </Button>
      {/if}
    </div>
  {/if}
</div>
