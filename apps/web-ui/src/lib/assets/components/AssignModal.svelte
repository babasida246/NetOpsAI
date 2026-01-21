<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Input, Label, Modal, Select } from 'flowbite-svelte';
  import type { AssigneeType } from '$lib/api/assets';
  import { _, isLoading } from '$lib/i18n';

  let { open = $bindable(false), assetCode = '' } = $props<{
    open?: boolean;
    assetCode?: string;
  }>();

  let assigneeType = $state<AssigneeType>('person');
  let assigneeName = $state('');
  let assigneeId = $state('');
  let note = $state('');

  const dispatch = createEventDispatcher<{ assign: { assigneeType: AssigneeType; assigneeName: string; assigneeId: string; note?: string } }>();

  function submit() {
    dispatch('assign', {
      assigneeType,
      assigneeName,
      assigneeId,
      note: note || undefined
    });
  }

  function reset() {
    assigneeType = 'person';
    assigneeName = '';
    assigneeId = '';
    note = '';
  }
</script>

<Modal bind:open on:close={reset}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$isLoading ? 'Assign Asset' : $_('assets.assignAsset')} {assetCode ? `(${assetCode})` : ''}</h3>
  </svelte:fragment>

  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Assignee Type' : $_('assets.assigneeType')}</Label>
      <Select bind:value={assigneeType}>
        <option value="person">{$isLoading ? 'Person' : $_('assets.person')}</option>
        <option value="department">{$isLoading ? 'Department' : $_('assets.department')}</option>
        <option value="system">{$isLoading ? 'System' : $_('assets.system')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Assignee Name' : $_('assets.assigneeName')}</Label>
      <Input bind:value={assigneeName} placeholder={$isLoading ? 'e.g. Nguyen Van A' : $_('assets.placeholders.assigneeName')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Assignee ID' : $_('assets.assigneeId')}</Label>
      <Input bind:value={assigneeId} placeholder={$isLoading ? 'Employee ID / Dept ID' : $_('assets.placeholders.assigneeId')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Note' : $_('assets.note')}</Label>
      <Input bind:value={note} placeholder={$isLoading ? 'Optional note' : $_('assets.placeholders.note')} />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => { open = false; }}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button on:click={submit} disabled={!assigneeName || !assigneeId}>{$isLoading ? 'Assign' : $_('assets.assign')}</Button>
    </div>
  </svelte:fragment>
</Modal>
