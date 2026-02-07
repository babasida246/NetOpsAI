<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { Alert, Button, Input, Label, Select } from 'flowbite-svelte';
  import { scanInventoryAsset } from '$lib/api/assetMgmt';

  let {
    sessionId = '',
    locations = [],
    onscanned
  } = $props<{ sessionId?: string; locations?: Array<{ id: string; name: string }>; onscanned?: () => void }>();

  let assetCode = $state('');
  let scannedLocationId = $state('');
  let error = $state('');
  let scanning = $state(false);

  async function handleScan() {
    if (!sessionId) {
      error = $_('assets.inventory.selectSessionError');
      return;
    }
    if (!assetCode) {
      error = 'Asset code is required';
      return;
    }
    try {
      scanning = true;
      error = '';
      await scanInventoryAsset(sessionId, {
        assetCode,
        scannedLocationId: scannedLocationId || undefined
      });
      assetCode = '';
      scannedLocationId = '';
      onscanned?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Scan failed';
    } finally {
      scanning = false;
    }
  }
</script>

<div class="space-y-3">
  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <Label class="mb-2">{$isLoading ? 'Asset Code' : $_('assets.assetCode')}</Label>
      <Input bind:value={assetCode} placeholder="ASSET-001" />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Scanned Location' : $_('assets.scannedLocation')}</Label>
      <Select bind:value={scannedLocationId}>
        <option value="">{$isLoading ? 'Select location' : $_('assets.placeholders.selectLocation')}</option>
        {#each locations as location}
          <option value={location.id}>{location.name}</option>
        {/each}
      </Select>
    </div>
    <div class="flex items-end">
      <Button onclick={handleScan} disabled={scanning || !assetCode || !sessionId}>
        {scanning ? ($isLoading ? 'Scanning...' : $_('assets.scanning')) : ($isLoading ? 'Scan' : $_('assets.scan'))}
      </Button>
    </div>
  </div>
</div>
