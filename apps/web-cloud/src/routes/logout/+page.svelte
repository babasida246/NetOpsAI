<script lang="ts">
  import { goto } from '$app/navigation';
  import { Spinner, Card } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { logout } from '$lib/api/auth';
  import { clearStoredSession } from '$lib/api/httpClient';

  $effect(() => {
    void (async () => {
      try {
        await logout();
      } catch {
        // ignore
      } finally {
        clearStoredSession();
        goto('/login');
      }
    })();
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
  <Card class="p-6 text-center space-y-2">
    <Spinner size="8" class="mx-auto" />
    <div class="text-slate-600 dark:text-slate-300 text-sm">
      {$isLoading ? 'Signing you out...' : $_('auth.signingOut')}
    </div>
  </Card>
</div>
