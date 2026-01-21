<script lang="ts">
  import { createEventDispatcher } from 'svelte';
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
    <Label class="mb-2">Request Type</Label>
    <Select bind:value={requestType}>
      <option value="assign">Assign</option>
      <option value="return">Return</option>
      <option value="move">Move</option>
      <option value="repair">Repair</option>
      <option value="dispose">Dispose</option>
    </Select>
  </div>
  <div>
    <Label class="mb-2">Asset ID</Label>
    <Input bind:value={assetId} placeholder="UUID" />
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label class="mb-2">From Department</Label>
      <Input bind:value={fromDept} />
    </div>
    <div>
      <Label class="mb-2">To Department</Label>
      <Input bind:value={toDept} />
    </div>
  </div>
  <div>
    <Label class="mb-2">Payload (JSON)</Label>
    <Textarea bind:value={payload} rows="4" placeholder={'e.g. {"note":"optional"}'} />
  </div>
  <Button on:click={handleSubmit} disabled={submitting}>
    {submitting ? 'Submitting...' : 'Submit Request'}
  </Button>
</div>
