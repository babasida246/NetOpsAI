<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { Copy, Check } from 'lucide-svelte';
  import { copyToClipboard } from '../utils/format';
  
  interface Props {
    data: unknown;
    maxHeight?: string;
  }
  
  let { data, maxHeight = '60vh' }: Props = $props();
  let copied = $state(false);
  
  const jsonString = $derived(JSON.stringify(data, null, 2));
  
  async function handleCopy() {
    await copyToClipboard(jsonString);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<div class="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
  <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
    <span class="text-xs text-gray-400 uppercase">JSON</span>
    <Button size="xs" color="alternative" onclick={handleCopy}>
      {#if copied}
        <Check class="w-3 h-3 mr-1" />
        Copied
      {:else}
        <Copy class="w-3 h-3 mr-1" />
        Copy
      {/if}
    </Button>
  </div>
  <pre
    class="p-4 overflow-auto text-xs text-gray-100 font-mono"
    style="max-height: {maxHeight}"
  >{jsonString}</pre>
</div>
