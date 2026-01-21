<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Alert, Button, Input, Label, Select } from 'flowbite-svelte';
  import { scanInventoryAsset } from '$lib/api/assetMgmt';

  let {
    sessionId = '',
    locations = []
  } = $props<{ sessionId?: string; locations?: Array<{ id: string; name: string }> }>();

  const dispatch = createEventDispatcher<{ scanned: void }>();

  let assetCode = $state('');
  let scannedLocationId = $state('');
  let error = $state('');
  let scanning = $state(false);

  async function handleScan() {
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
      dispatch('scanned');
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
      <Label class="mb-2">Asset Code</Label>
      <Input bind:value={assetCode} placeholder="ASSET-001" />
    </div>
    <div>
      <Label class="mb-2">Scanned Location</Label>
      <Select bind:value={scannedLocationId}>
        <option value="">Select location</option>
        {#each locations as location}
          <option value={location.id}>{location.name}</option>
        {/each}
      </Select>
    </div>
    <div class="flex items-end">
      <Button on:click={handleScan} disabled={scanning || !assetCode}>
        {scanning ? 'Scanning...' : 'Scan'}
      </Button>
    </div>
  </div>
</div>
