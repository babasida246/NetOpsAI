<script lang="ts">
  import { Alert, Button, Card, Spinner, Badge } from 'flowbite-svelte';
  import { Plus, RefreshCw, Calendar, User } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { goto } from '$app/navigation';
  import { listInventorySessions, createInventorySession, type InventorySession } from '$lib/api/assetMgmt';

  let sessions = $state<InventorySession[]>([]);
  let loading = $state(true);
  let error = $state('');

  const statusColors: Record<string, 'dark' | 'blue' | 'green' | 'red'> = {
    draft: 'dark',
    in_progress: 'blue',
    closed: 'green',
    canceled: 'red'
  };

  async function loadSessions() {
    try {
      loading = true;
      error = '';
      const result = await listInventorySessions();
      sessions = result.data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('inventory.errors.loadFailed');
      console.error('Error loading sessions:', err);
    } finally {
      loading = false;
    }
  }

  async function createSession() {
    try {
      error = '';
      const result = await createInventorySession({
        name: `${$_('inventory.sessionNamePrefix')} ${new Date().toLocaleString()}`,
        locationId: undefined
      });
      if (result.data?.id) {
        goto(`/inventory/${result.data.id}`);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : $_('inventory.errors.createFailed');
      console.error('Error creating session:', err);
    }
  }

  $effect(() => {
    void loadSessions();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Inventory Sessions' : $_('inventory.title')}</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {$isLoading ? 'Track and manage physical inventory counts' : $_('inventory.subtitle')}
      </p>
    </div>
    <div class="flex gap-2">
      <Button onclick={createSession}>
        <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Session' : $_('inventory.newSession')}
      </Button>
      <Button color="alternative" onclick={loadSessions}>
        <RefreshCw class="w-4 h-4" />
      </Button>
    </div>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if sessions.length === 0}
    <Card class="text-center py-12">
      <p class="text-gray-500 mb-4">{$isLoading ? 'No inventory sessions yet' : $_('inventory.noSessions')}</p>
      <Button onclick={createSession}>{$isLoading ? 'Create First Session' : $_('inventory.createFirstSession')}</Button>
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each sessions as session}
        <Card href="/inventory/{session.id}" class="hover:shadow-lg transition-shadow cursor-pointer">
          <div class="mb-3">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-lg">{session.name}</h3>
              <Badge color={statusColors[session.status] || 'dark'}>
                {$isLoading ? session.status.replace('_', ' ') : $_(`inventory.status.${session.status}`)}
              </Badge>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              {#if session.locationId}
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4" />
                  <span>{$isLoading ? 'Location' : $_('assets.location')}: {session.locationId}</span>
                </div>
              {/if}
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4" />
                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
              {#if session.closedAt}
                <div class="text-xs text-green-600 dark:text-green-400">
                  {$isLoading ? 'Closed' : $_('maintenance.closed')}: {new Date(session.closedAt).toLocaleDateString()}
                </div>
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>
