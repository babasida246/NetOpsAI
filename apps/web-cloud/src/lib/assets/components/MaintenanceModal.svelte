<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { Button, Input, Label, Modal, Select } from 'flowbite-svelte';
  import type { MaintenanceSeverity } from '$lib/api/assets';

  let { open = $bindable(false), assetCode = '', onsubmit } = $props<{
    open?: boolean;
    assetCode?: string;
    onsubmit?: (data: { title: string; severity: MaintenanceSeverity; diagnosis?: string; resolution?: string }) => void;
  }>();

  let title = $state('');
  let severity = $state<MaintenanceSeverity>('low');
  let diagnosis = $state('');
  let resolution = $state('');

  function submit() {
    onsubmit?.({
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

<Modal bind:open onclose={reset}>
  <svelte:fragment slot="header">
  
      <h3 class="text-lg font-semibold">{$isLoading ? 'Open Maintenance' : $_('maintenance.openMaintenance')} {assetCode ? `(${assetCode})` : ''}</h3>
    
  </svelte:fragment>

  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Title' : $_('maintenance.ticketTitle')}</Label>
      <Input bind:value={title} placeholder={$isLoading ? 'Issue summary' : $_('assets.placeholders.issueSummary')} />
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
      <Input bind:value={diagnosis} placeholder={$isLoading ? 'Optional diagnosis' : $_('assets.placeholders.optionalDiagnosis')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Resolution' : $_('maintenance.resolution')}</Label>
      <Input bind:value={resolution} placeholder={$isLoading ? 'Optional resolution' : $_('assets.placeholders.optionalResolution')} />
    </div>
  </div>

  <svelte:fragment slot="footer">
  
      <div class="flex justify-end gap-2">
        <Button color="alternative" onclick={() => { open = false; }}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
        <Button onclick={submit} disabled={!title}>{$isLoading ? 'Create' : $_('common.create')}</Button>
      </div>
    
  </svelte:fragment>
</Modal>

