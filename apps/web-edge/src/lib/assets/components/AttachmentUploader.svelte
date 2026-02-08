<script lang="ts">
  import { Alert, Button } from 'flowbite-svelte';
  import { uploadAttachment } from '$lib/api/assetMgmt';

  let { assetId = '', onuploaded } = $props<{ assetId?: string; onuploaded?: () => void }>();

  let file: File | null = $state(null);
  let uploading = $state(false);
  let error = $state('');

  async function handleUpload() {
    if (!file || !assetId) return;
    try {
      uploading = true;
      error = '';
      await uploadAttachment(assetId, file);
      file = null;
      onuploaded?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      uploading = false;
    }
  }
</script>

<div class="space-y-2">
  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}
  <input
    type="file"
    onchange={(event) => file = (event.target as HTMLInputElement).files?.[0] ?? null}
  />
  <Button size="xs" onclick={handleUpload} disabled={!file || uploading}>
    {uploading ? 'Uploading...' : 'Upload'}
  </Button>
</div>
