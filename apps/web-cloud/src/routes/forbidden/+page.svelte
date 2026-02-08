<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Alert, Button } from 'flowbite-svelte';
  import { ArrowLeft, ShieldAlert } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';

  const from = $derived.by(() => page.url.searchParams.get('from') || '');
  const home = $derived.by(() => page.url.searchParams.get('home') || '/chat');

  function goHome() {
    goto(home, { replaceState: true });
  }
</script>

<div class="page-shell page-content py-10">
  <div class="max-w-2xl">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 flex items-center justify-center">
        <ShieldAlert class="h-5 w-5" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          {$isLoading ? 'Access denied' : $_('common.forbiddenTitle')}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          {$isLoading ? 'You do not have permission to view this page.' : $_('common.forbiddenMessage')}
        </p>
      </div>
    </div>

    {#if from}
      <Alert color="yellow" class="mt-6">
        <div class="text-sm">
          <div class="font-semibold">{$isLoading ? 'Blocked route' : $_('common.forbiddenRoute')}</div>
          <div class="font-mono text-xs mt-1 break-all">{from}</div>
        </div>
      </Alert>
    {/if}

    <div class="mt-6 flex flex-wrap gap-2">
      <Button color="alternative" onclick={() => history.back()} aria-label="Go back">
        <ArrowLeft class="h-4 w-4 mr-2" />
        {$isLoading ? 'Back' : $_('common.back')}
      </Button>
      <Button onclick={goHome}>
        {$isLoading ? 'Go home' : $_('common.goHome')}
      </Button>
    </div>
  </div>
</div>

