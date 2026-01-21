<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _, isLoading } from '$lib/i18n';
  import { Alert, Button, Input, Label, Select, Textarea } from 'flowbite-svelte';
  import { createWorkflowRequest } from '$lib/api/assetMgmt';

  const dispatch = createEventDispatcher<{ submitted: void }>();

  let requestType = $state('assign');
  let assetId = $state('');
  let fromDept = $state('');
  let toDept = $state('');
  let payload = $state('');
  let submitting = $state(false);
  let error = $state('');

  async function handleSubmit() {
    try {
      submitting = true;
      error = '';
      const parsedPayload = payload ? JSON.parse(payload) : undefined;
      await createWorkflowRequest({
        requestType,
        assetId: assetId || undefined,
        fromDept: fromDept || undefined,
        toDept: toDept || undefined,
        payload: parsedPayload
      });
      dispatch('submitted');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit request';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="space-y-4">
  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}
  <div>
    <Label class="mb-2">{$isLoading ? 'Request Type' : $_('assets.requestType')}</Label>
    <Select bind:value={requestType}>
      <option value="assign">{$isLoading ? 'Assign' : $_('assets.assign')}</option>
      <option value="return">{$isLoading ? 'Return' : $_('assets.return')}</option>
      <option value="move">{$isLoading ? 'Move' : $_('assets.move')}</option>
      <option value="repair">{$isLoading ? 'Repair' : $_('assets.repair')}</option>
      <option value="dispose">{$isLoading ? 'Dispose' : $_('assets.dispose')}</option>
    </Select>
  </div>
  <div>
    <Label class="mb-2">{$isLoading ? 'Asset ID' : $_('assets.assetId')}</Label>
    <Input bind:value={assetId} placeholder="UUID" />
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'From Department' : $_('assets.fromDepartment')}</Label>
      <Input bind:value={fromDept} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'To Department' : $_('assets.toDepartment')}</Label>
      <Input bind:value={toDept} />
    </div>
  </div>
  <div>
    <Label class="mb-2">{$isLoading ? 'Payload (JSON)' : $_('assets.payloadJson')}</Label>
    <Textarea bind:value={payload} rows="4" placeholder={$isLoading ? 'e.g. {"note":"optional"}' : $_('assets.placeholders.optionalNote')} />
  </div>
  <Button on:click={handleSubmit} disabled={submitting}>
    {submitting ? ($isLoading ? 'Submitting...' : $_('common.submitting')) : ($isLoading ? 'Submit Request' : $_('assets.submitRequest'))}
  </Button>
</div>
