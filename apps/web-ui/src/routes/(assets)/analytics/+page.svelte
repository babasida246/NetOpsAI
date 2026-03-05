<script lang="ts">
  import {
    Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner,
    Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell
  } from 'flowbite-svelte';
  import { BarChart3, TrendingUp, DollarSign, AlertTriangle, Plus, Brain } from 'lucide-svelte';
  import {
    getAnalyticsSummary, createSnapshot, getSnapshotHistory,
    addCostRecord, getCostRecords, getAnomalies,
    type AnalyticsSummary, type AnalyticsSnapshot, type CostRecord, type Anomaly
  } from '$lib/api/analytics';
  import { _, isLoading } from '$lib/i18n';

  let loading = $state(true);
  let error = $state('');
  let summary = $state<AnalyticsSummary | null>(null);
  let snapshots = $state<AnalyticsSnapshot[]>([]);
  let costs = $state<CostRecord[]>([]);
  let anomalies = $state<Anomaly[]>([]);

  // Cost form
  let showCostModal = $state(false);
  let costAssetId = $state('');
  let costType = $state('purchase');
  let costAmount = $state(0);
  let costCurrency = $state('VND');
  let costDescription = $state('');
  let saving = $state(false);

  async function loadData() {
    try {
      loading = true;
      error = '';
      const [summaryRes, snapshotsRes, costsRes, anomaliesRes] = await Promise.all([
        getAnalyticsSummary().catch(() => ({ data: null })),
        getSnapshotHistory(30).catch(() => ({ data: [] })),
        getCostRecords().catch(() => ({ data: [] })),
        getAnomalies().catch(() => ({ data: [] }))
      ]);
      summary = summaryRes.data;
      snapshots = snapshotsRes.data ?? [];
      costs = costsRes.data ?? [];
      anomalies = anomaliesRes.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  async function handleCreateSnapshot() {
    try {
      await createSnapshot();
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed';
    }
  }

  async function handleAddCost() {
    if (!costAssetId || costAmount <= 0) return;
    try {
      saving = true;
      await addCostRecord({
        assetId: costAssetId,
        costType,
        amount: costAmount,
        currency: costCurrency,
        description: costDescription || undefined
      });
      showCostModal = false;
      costAssetId = '';
      costAmount = 0;
      costDescription = '';
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed';
    } finally {
      saving = false;
    }
  }

  $effect(() => { void loadData(); });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-blue-500" /> {$_('analytics.title')}
      </h1>
      <p class="text-sm text-gray-500 mt-1">{$_('analytics.subtitle')}</p>
    </div>
    <div class="flex gap-2">
      <Button color="light" data-testid="btn-snapshot" onclick={handleCreateSnapshot}>
        <TrendingUp class="w-4 h-4 mr-2" /> {$_('analytics.createSnapshot')}
      </Button>
      <Button data-testid="btn-add-cost" onclick={() => showCostModal = true}>
        <Plus class="w-4 h-4 mr-2" /> {$_('analytics.addCost')}
      </Button>
    </div>
  </div>

  {#if error}
    <Alert color="red" class="mb-4" dismissable>{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10"><Spinner size="8" /></div>
  {:else}
    <!-- Summary Cards -->
    {#if summary}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card class="p-4">
          <p class="text-sm text-gray-500">{$_('analytics.totalAssets')}</p>
          <p class="text-2xl font-bold" data-testid="stat-total">{summary.totalAssets}</p>
        </Card>
        <Card class="p-4">
          <p class="text-sm text-gray-500">{$_('common.active')}</p>
          <p class="text-2xl font-bold text-green-600" data-testid="stat-active">{summary.activeAssets}</p>
        </Card>
        <Card class="p-4">
          <p class="text-sm text-gray-500">{$_('analytics.inRepair')}</p>
          <p class="text-2xl font-bold text-yellow-600" data-testid="stat-repair">{summary.inRepairAssets}</p>
        </Card>
        <Card class="p-4">
          <p class="text-sm text-gray-500">{$_('analytics.retired')}</p>
          <p class="text-2xl font-bold text-gray-600" data-testid="stat-retired">{summary.retiredAssets}</p>
        </Card>
      </div>
    {/if}

    <!-- Anomalies -->
    {#if anomalies.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle class="w-5 h-5 text-orange-500" /> {$_('analytics.detectedAnomalies')}
        </h2>
        <div class="space-y-2">
          {#each anomalies as anomaly}
            <Alert color={anomaly.severity === 'critical' ? 'red' : anomaly.severity === 'high' ? 'yellow' : 'blue'}>
              <span class="font-semibold">[{anomaly.type}]</span> {anomaly.description}
              <span class="text-xs ml-2">{$_('analytics.assetLabel')}: {anomaly.assetId}</span>
            </Alert>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Snapshot History -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-blue-500" /> Snapshot History (Last 30 Days)
      </h2>
      {#if snapshots.length === 0}
        <p class="text-gray-500 text-center py-4">{$_('analytics.noSnapshots')}</p>
      {:else}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHead>
              <TableHeadCell>{$_('analytics.date')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.total')}</TableHeadCell>
              <TableHeadCell>{$_('common.active')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.inRepair')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.retired')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.totalCost')}</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each snapshots as snap}
                <TableBodyRow>
                  <TableBodyCell>{new Date(snap.snapshotDate).toLocaleDateString()}</TableBodyCell>
                  <TableBodyCell>{snap.totalAssets}</TableBodyCell>
                  <TableBodyCell class="text-green-600">{snap.activeAssets}</TableBodyCell>
                  <TableBodyCell class="text-yellow-600">{snap.inRepairAssets}</TableBodyCell>
                  <TableBodyCell class="text-gray-600">{snap.retiredAssets}</TableBodyCell>
                  <TableBodyCell>{snap.totalCostValue?.toLocaleString()}</TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </div>

    <!-- Cost Records -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
        <DollarSign class="w-5 h-5 text-green-500" /> Cost Records
      </h2>
      {#if costs.length === 0}
        <p class="text-gray-500 text-center py-4">{$_('analytics.noCostRecords')}</p>
      {:else}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHead>
              <TableHeadCell>{$_('analytics.assetLabel')}</TableHeadCell>
              <TableHeadCell>{$_('common.type')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.amount')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.currency')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.date')}</TableHeadCell>
              <TableHeadCell>{$_('analytics.description')}</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each costs as cost}
                <TableBodyRow>
                  <TableBodyCell>{cost.assetId}</TableBodyCell>
                  <TableBodyCell><Badge color="blue">{cost.costType}</Badge></TableBodyCell>
                  <TableBodyCell class="font-semibold">{cost.amount?.toLocaleString()}</TableBodyCell>
                  <TableBodyCell>{cost.currency}</TableBodyCell>
                  <TableBodyCell>{new Date(cost.recordDate).toLocaleDateString()}</TableBodyCell>
                  <TableBodyCell>{cost.description || '-'}</TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Cost Record Modal -->
<Modal bind:open={showCostModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$_('analytics.addCostRecord')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$_('analytics.assetId')}</Label>
      <Input data-testid="input-cost-asset-id" bind:value={costAssetId} placeholder={$_('analytics.assetUuidPlaceholder')} />
    </div>
    <div>
      <Label class="mb-2">{$_('analytics.costType')}</Label>
      <Select data-testid="select-cost-type" bind:value={costType}>
        <option value="purchase">{$_('analytics.costTypes.purchase')}</option>
        <option value="maintenance">{$_('analytics.costTypes.maintenance')}</option>
        <option value="license">{$_('analytics.costTypes.license')}</option>
        <option value="insurance">{$_('analytics.costTypes.insurance')}</option>
        <option value="depreciation">{$_('analytics.costTypes.depreciation')}</option>
        <option value="other">{$_('analytics.costTypes.other')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$_('analytics.amount')}</Label>
      <Input data-testid="input-cost-amount" type="number" bind:value={costAmount} placeholder="0" />
    </div>
    <div>
      <Label class="mb-2">{$_('analytics.currency')}</Label>
      <Select data-testid="select-cost-currency" bind:value={costCurrency}>
        <option value="VND">VND</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$_('analytics.description')}</Label>
      <Input data-testid="input-cost-desc" bind:value={costDescription} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showCostModal = false}>{$_('common.cancel')}</Button>
      <Button data-testid="btn-save-cost" onclick={handleAddCost} disabled={saving || !costAssetId || costAmount <= 0}>
        {saving ? $_('common.saving') : $_('analytics.addCost')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
