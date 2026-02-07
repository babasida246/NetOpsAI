<script lang="ts">
  import { page } from '$app/state';
  import { Alert, Button, Card, Input, Label, Spinner, Badge } from 'flowbite-svelte';
  import { Scan, CheckCircle, XCircle, ArrowLeft } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { _, isLoading } from '$lib/i18n';
  import { 
    getInventorySessionDetail, 
    scanInventoryAsset, 
    closeInventorySession,
    type InventorySession,
    type InventoryItem 
  } from '$lib/api/assetMgmt';
  import DataTable from '$lib/components/DataTable.svelte';

  let session = $state<InventorySession | null>(null);
  let items = $state<InventoryItem[]>([]);
  let loading = $state(true);
  let error = $state('');
  let scanCode = $state('');
  let scanning = $state(false);

  const sessionId = $derived(page.params.id);

  const statusColors: Record<string, 'dark' | 'blue' | 'green' | 'red'> = {
    draft: 'dark',
    in_progress: 'blue',
    closed: 'green',
    canceled: 'red'
  };

  async function loadSession() {
    try {
      loading = true;
      error = '';
      const result = await getInventorySessionDetail(sessionId);
      session = result.data.session;
      items = result.data.items || [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('inventory.errors.loadSessionFailed');
      console.error('Error loading session:', err);
    } finally {
      loading = false;
    }
  }

  async function scanAsset(event: Event) {
    event.preventDefault();
    if (!scanCode.trim()) return;
    
    try {
      scanning = true;
      error = '';
      await scanInventoryAsset(sessionId, { assetCode: scanCode.trim() });
      scanCode = '';
      await loadSession(); // Reload to show updated items
    } catch (err) {
      error = err instanceof Error ? err.message : $_('inventory.errors.scanFailed');
      console.error('Error scanning asset:', err);
    } finally {
      scanning = false;
    }
  }

  async function closeSession() {
    if (!confirm($_('inventory.confirmClose'))) return;
    
    try {
      error = '';
      await closeInventorySession(sessionId);
      await loadSession(); // Reload to show updated status
    } catch (err) {
      error = err instanceof Error ? err.message : $_('inventory.errors.closeFailed');
      console.error('Error closing session:', err);
    }
  }

  const columns = [
    { key: 'assetId' as const, label: $isLoading ? 'Asset Code' : $_('assets.assetTag'), sortable: true, filterable: true, render: (row: InventoryItem) => `<span class="font-medium">${row.assetId || '-'}</span>` },
    { 
      key: 'status' as const, 
      label: $isLoading ? 'Status' : $_('assets.status'), 
      sortable: true, 
      filterable: true,
      render: (row: InventoryItem) => {
        if (row.status === 'found') {
          return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>${$isLoading ? 'Found' : $_('inventory.status.found')}</span>`;
        } else if (row.status === 'missing') {
          return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle><line x1="15" y1="9" x2="9" y2="15" stroke-width="2"></line><line x1="9" y1="9" x2="15" y2="15" stroke-width="2"></line></svg>${$isLoading ? 'Missing' : $_('inventory.status.missing')}</span>`;
        }
        return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">${$isLoading ? 'Unexpected' : $_('inventory.status.unexpected')}</span>`;
      }
    },
    { key: 'scannedAt' as const, label: $isLoading ? 'Scanned At' : $_('inventory.scannedAt'), sortable: true, render: (row: InventoryItem) => `<span class="text-sm text-gray-500 dark:text-gray-400">${row.scannedAt ? new Date(row.scannedAt).toLocaleString() : '-'}</span>` }
  ];

  $effect(() => {
    void loadSession();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if session}
    <div class="mb-6">
      <div class="flex items-center gap-4 mb-4">
        <Button color="light" size="sm" href="/inventory">
          <ArrowLeft class="w-4 h-4 mr-2" /> {$isLoading ? 'Back to Sessions' : $_('inventory.backToSessions')}
        </Button>
      </div>
      
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-semibold">{session.name}</h1>
        <div class="flex items-center gap-2">
          <Badge color={statusColors[session.status] || 'dark'}>
            {$isLoading ? session.status.replace('_', ' ') : $_(`inventory.status.${session.status}`)}
          </Badge>
          {#if session.status === 'in_progress' || session.status === 'draft'}
            <Button size="sm" color="green" onclick={closeSession}>
              {$isLoading ? 'Close Session' : $_('inventory.closeSession')}
            </Button>
          {/if}
        </div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {$isLoading ? 'Created:' : $_('inventory.createdAt')} {new Date(session.createdAt).toLocaleString()}
        {#if session.closedAt}
          • {$isLoading ? 'Closed:' : $_('inventory.closedAt')} {new Date(session.closedAt).toLocaleString()}
        {/if}
      </p>
    </div>

    {#if error}
      <Alert color="red" class="mb-4" dismissable onclose={() => error = ''}>{error}</Alert>
    {/if}

    <Card class="mb-6">
      <form onsubmit={scanAsset} class="flex gap-4">
        <div class="flex-1">
          <Label for="scanCode" class="mb-2">{$isLoading ? 'Scan Asset Code' : $_('inventory.scanAssetCode')}</Label>
          <Input
            id="scanCode"
            bind:value={scanCode}
            placeholder={$isLoading ? 'Enter or scan asset code...' : $_('inventory.scanPlaceholder')}
            disabled={scanning || session.status === 'closed'}
            autofocus
          />
        </div>
        <div class="flex items-end">
          <Button type="submit" disabled={scanning || !scanCode.trim() || session.status === 'closed'}>
            <Scan class="w-4 h-4 mr-2" />
            {scanning ? ($isLoading ? 'Scanning...' : $_('inventory.scanning')) : ($isLoading ? 'Scan' : $_('inventory.scanAction'))}
          </Button>
        </div>
      </form>
    </Card>

    {#if items.length > 0}
      <Card>
        <div class="mb-4">
          <h2 class="text-lg font-semibold">
            {$isLoading ? `Scanned Items (${items.length})` : $_('inventory.scannedItems', { values: { count: items.length } })}
          </h2>
        </div>
        <DataTable
          data={items}
          {columns}
          rowKey="id"
          selectable={false}
          loading={false}
        />
      </Card>
    {:else}
      <Card class="text-center py-12 text-gray-500">
        {$isLoading ? 'No items scanned yet. Start scanning assets above.' : $_('inventory.noScannedItems')}
      </Card>
    {/if}
  {:else}
    <Alert color="red">{$isLoading ? 'Session not found' : $_('inventory.sessionNotFound')}</Alert>
  {/if}
</div>
