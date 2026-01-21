<script lang="ts">
  import { goto } from '$app/navigation';
  import { _, isLoading } from '$lib/i18n';

  $effect(() => {
    goto('/netops/devices');
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <div class="text-gray-500">{$isLoading ? 'Redirecting...' : $_('common.redirecting')}</div>
  </div>
</div>
