<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Spinner, Card } from 'flowbite-svelte';
  import { logout } from '$lib/api/auth';
  import { clearStoredSession } from '$lib/api/httpClient';

  onMount(async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      clearStoredSession();
      goto('/login');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
  <Card class="p-6 text-center space-y-2">
    <Spinner size="8" class="mx-auto" />
    <div class="text-slate-600 dark:text-slate-300 text-sm">Signing you out...</div>
  </Card>
</div>
