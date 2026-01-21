<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Input, Label, Modal, Select } from 'flowbite-svelte';
  import type { MaintenanceSeverity } from '$lib/api/assets';

  let { open = $bindable(false), assetCode = '' } = $props<{
    open?: boolean;
    assetCode?: string;
  }>();

  let title = $state('');
  let severity = $state<MaintenanceSeverity>('low');
  let diagnosis = $state('');
  let resolution = $state('');

  const dispatch = createEventDispatcher<{
    submit: { title: string; severity: MaintenanceSeverity; diagnosis?: string; resolution?: string }
  }>();

  function submit() {
    dispatch('submit', {
      title,
      severity,
      diagnosis: diagnosis || undefined,
      resolution: resolution || undefined
    });
  }

  function reset() {
    title = '';
    severity = 'low';
    diagnosis = '';
    resolution = '';
  }
</script>

<Modal bind:open on:close={reset}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">Open Maintenance {assetCode ? `(${assetCode})` : ''}</h3>
  </svelte:fragment>

  <div class="space-y-4">
    <div>
      <Label class="mb-2">Title</Label>
      <Input bind:value={title} placeholder="Issue summary" />
    </div>
    <div>
      <Label class="mb-2">Severity</Label>
      <Select bind:value={severity}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">Diagnosis</Label>
      <Input bind:value={diagnosis} placeholder="Optional diagnosis" />
    </div>
    <div>
      <Label class="mb-2">Resolution</Label>
      <Input bind:value={resolution} placeholder="Optional resolution" />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => { open = false; }}>Cancel</Button>
      <Button on:click={submit} disabled={!title}>Create</Button>
    </div>
  </svelte:fragment>
</Modal>
