<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Button, Spinner } from 'flowbite-svelte';
  import { RefreshCw } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { devicesApi } from '$lib/netops/api/netopsApi';
  import type { Device } from '$lib/netops/types';
  import FieldKitPanel from '$lib/components/tools/FieldKitPanel.svelte';
  import type { SshCommandPolicy } from '$lib/tools/ssh/types';

  let devices = $state<Device[]>([]);
  let loading = $state(false);
  let error = $state('');

  let sshPolicy = $state<SshCommandPolicy>({
    environment: 'dev',
    allowList: [],
    denyList: ['reload', 'format', 'erase', 'reset-configuration', 'delete'],
    dangerousList: ['reload', 'erase', 'reset-configuration', 'write erase']
  });

  async function loadDevices() {
    try {
      loading = true;
      error = '';
      devices = await devicesApi.list();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('netops.field.errors.loadDevicesFailed');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadDevices();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Field Kit' : $_('netops.field.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Guided, safe troubleshooting for field engineers.' : $_('netops.field.subtitle')}
      </p>
    </div>
    <Button color="light" onclick={loadDevices} disabled={loading}>
      <RefreshCw class="h-4 w-4 mr-2" />
      {$isLoading ? 'Refresh' : $_('common.refresh')}
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading && devices.length === 0}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else}
    <FieldKitPanel {devices} {sshPolicy} />
  {/if}
</div>

