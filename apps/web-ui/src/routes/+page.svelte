<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  onMount(() => {
    goto('/netops/devices');
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <div class="text-gray-500">Redirecting...</div>
  </div>
</div>
