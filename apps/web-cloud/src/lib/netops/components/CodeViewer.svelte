<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { Copy, Check } from 'lucide-svelte';
  import { copyToClipboard } from '../utils/format';
  
  interface Props {
    code: string;
    language?: string;
    maxHeight?: string;
    showCopy?: boolean;
  }
  
  let { code, language = 'text', maxHeight = '60vh', showCopy = true }: Props = $props();
  let copied = $state(false);
  let wordWrap = $state(false);
  
  async function handleCopy() {
    await copyToClipboard(code);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<div class="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
  <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
    <span class="text-xs text-gray-400 uppercase">{language}</span>
    <div class="flex gap-2">
      <Button size="xs" color="alternative" onclick={() => wordWrap = !wordWrap}>
        {wordWrap ? 'No Wrap' : 'Wrap'}
      </Button>
      {#if showCopy}
        <Button size="xs" color="alternative" onclick={handleCopy}>
          {#if copied}
            <Check class="w-3 h-3 mr-1" />
            Copied
          {:else}
            <Copy class="w-3 h-3 mr-1" />
            Copy
          {/if}
        </Button>
      {/if}
    </div>
  </div>
  <pre
    class="p-4 overflow-auto text-xs text-gray-100 font-mono"
    style="max-height: {maxHeight}"
    class:whitespace-pre-wrap={wordWrap}
  >{code}</pre>
</div>
