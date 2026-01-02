<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { Button } from 'flowbite-svelte';
  import { MessageSquare, Network, Settings, TrendingUp } from 'lucide-svelte';
  
  let { children } = $props();
  
  const isNetOpsRoute = $derived($page.url.pathname.startsWith('/netops'));
  const isChatRoute = $derived($page.url.pathname.startsWith('/chat'));
  const isModelsRoute = $derived($page.url.pathname.startsWith('/models'));
  const isStatsRoute = $derived($page.url.pathname.startsWith('/stats'));
  const showNav = $derived(isNetOpsRoute || isChatRoute || isModelsRoute || isStatsRoute);
</script>

{#if showNav}
  <div class="fixed top-4 right-4 z-50 flex gap-2">
    <Button
      href="/chat"
      color={isChatRoute ? 'blue' : 'alternative'}
      size="sm"
    >
      <MessageSquare class="w-4 h-4 mr-2" />
      Chat
    </Button>
    <Button
      href="/stats"
      color={isStatsRoute ? 'blue' : 'alternative'}
      size="sm"
    >
      <TrendingUp class="w-4 h-4 mr-2" />
      Stats
    </Button>
    <Button
      href="/models"
      color={isModelsRoute ? 'blue' : 'alternative'}
      size="sm"
    >
      <Settings class="w-4 h-4 mr-2" />
      Models
    </Button>
    <Button
      href="/netops/devices"
      color={isNetOpsRoute ? 'blue' : 'alternative'}
      size="sm"
    >
      <Network class="w-4 h-4 mr-2" />
      NetOps
    </Button>
  </div>
{/if}

{@render children()}
