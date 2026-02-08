<script lang="ts">
  import type { Attachment } from '$lib/api/assetMgmt';
  import { getAttachmentDownloadUrl } from '$lib/api/assetMgmt';

  let { assetId = '', attachments = [] } = $props<{
    assetId?: string;
    attachments?: Attachment[];
  }>();
</script>

<div class="space-y-2">
  {#if attachments.length === 0}
    <p class="text-sm text-gray-500">No attachments uploaded.</p>
  {:else}
    {#each attachments as attachment}
      <div class="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
        <div>
          <p class="font-medium">{attachment.fileName}</p>
          <p class="text-xs text-gray-500">v{attachment.version} • {attachment.sizeBytes || 0} bytes</p>
        </div>
        <a
          class="text-blue-600 hover:underline"
          href={getAttachmentDownloadUrl(assetId, attachment.id)}
          target="_blank"
          rel="noreferrer"
        >
          Download
        </a>
      </div>
    {/each}
  {/if}
</div>
