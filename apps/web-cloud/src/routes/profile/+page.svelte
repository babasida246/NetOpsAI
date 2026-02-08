<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card } from 'flowbite-svelte';
  import { LogOut } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';

  let email = $state('');
  let role = $state('');

  onMount(() => {
    if (typeof window === 'undefined') return;
    email = localStorage.getItem('userEmail') || '';
    role = localStorage.getItem('userRole') || '';
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="max-w-2xl space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Profile' : $_('profile.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Account & session information' : $_('profile.subtitle')}
      </p>
    </div>

    <Card size="none" class="p-5 space-y-3">
      <div class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">
            {$isLoading ? 'Email' : $_('profile.email')}
          </div>
          <div class="font-semibold text-slate-900 dark:text-white">{email || '-'}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">
            {$isLoading ? 'Role' : $_('profile.role')}
          </div>
          <div class="font-semibold text-slate-900 dark:text-white">{role || '-'}</div>
        </div>
      </div>

      <div class="pt-2 flex justify-end">
        <Button href="/logout" color="light">
          <LogOut class="h-4 w-4 mr-2" />
          {$isLoading ? 'Logout' : $_('auth.logout')}
        </Button>
      </div>
    </Card>
  </div>
</div>

