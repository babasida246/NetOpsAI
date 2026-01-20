<script lang="ts">
  import { page } from '$app/stores';
  import { Alert, Button, Card, Input, Label, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Badge } from 'flowbite-svelte';
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

  let session = $state<InventorySession | null>(null);
  let items = $state<InventoryItem[]>([]);
  let loading = $state(true);
  let error = $state('');
  let scanCode = $state('');
  let scanning = $state(false);

  const sessionId = $derived($page.params.id);

  const statusColors = {
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
            <Button size="sm" color="green" on:click={closeSession}>
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
      <Alert color="red" class="mb-4" dismissable on:close={() => error = ''}>{error}</Alert>
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
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Asset Code' : $_('assets.assetTag')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Scanned At' : $_('inventory.scannedAt')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each items as item}
              <TableBodyRow>
                <TableBodyCell class="font-medium">{item.assetCode}</TableBodyCell>
                <TableBodyCell>
                  {#if item.status === 'found'}
                    <Badge color="green"><CheckCircle class="w-3 h-3 mr-1 inline" /> {$isLoading ? 'Found' : $_('inventory.status.found')}</Badge>
                  {:else if item.status === 'missing'}
                    <Badge color="red"><XCircle class="w-3 h-3 mr-1 inline" /> {$isLoading ? 'Missing' : $_('inventory.status.missing')}</Badge>
                  {:else}
                    <Badge color="yellow">{$isLoading ? 'Unexpected' : $_('inventory.status.unexpected')}</Badge>
                  {/if}
                </TableBodyCell>
                <TableBodyCell class="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.scannedAt).toLocaleString()}
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
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
