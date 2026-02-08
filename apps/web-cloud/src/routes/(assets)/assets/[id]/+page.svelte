<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import {
    Alert,
    Badge,
    Button,
    Card,
    Input,
    Label,
    Modal,
    Select,
    Spinner,
    TabItem,
    Tabs,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell
  } from 'flowbite-svelte';
  import { ArrowLeft, Download, Wrench, UserPlus, Undo2 } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { getCapabilities } from '$lib/auth/capabilities';
  import AssetTimeline from '$lib/assets/components/AssetTimeline.svelte';
  import AssignModal from '$lib/assets/components/AssignModal.svelte';
  import MaintenanceModal from '$lib/assets/components/MaintenanceModal.svelte';
  import AttachmentList from '$lib/assets/components/AttachmentList.svelte';
  import AttachmentUploader from '$lib/assets/components/AttachmentUploader.svelte';
  import InventoryScanPanel from '$lib/assets/components/InventoryScanPanel.svelte';
  import WorkflowRequestForm from '$lib/assets/components/WorkflowRequestForm.svelte';
  import { downloadDriverFile, recommendDrivers, type DriverRecommendation } from '$lib/api/drivers';
  import { downloadDocumentFile, listDocuments, type Document as KnowledgeDocument } from '$lib/api/docs';
  import {
    assignAsset,
    getAssetDetail,
    getAssetTimeline,
    openMaintenanceTicket,
    returnAsset,
    type Asset,
    type AssetAssignment,
    type AssigneeType,
    type MaintenanceTicket,
    type MaintenanceSeverity,
    type AssetEvent
  } from '$lib/api/assets';
  import {
    closeInventorySession,
    createInventorySession,
    getInventorySessionDetail,
    listAttachments,
    listInventorySessions,
    listReminders,
    listWorkflowRequests,
    runWarrantyReminders,
    type Attachment,
    type InventoryItem,
    type InventorySession,
    type Reminder,
    type WorkflowRequest
  } from '$lib/api/assetMgmt';
  import { getAssetCatalogs, type Catalogs } from '$lib/api/assetCatalogs';
  let asset = $state<Asset | null>(null);
  let assignments = $state<AssetAssignment[]>([]);
  let maintenance = $state<MaintenanceTicket[]>([]);
  let timeline = $state<AssetEvent[]>([]);
  let attachments = $state<Attachment[]>([]);
  let reminders = $state<Reminder[]>([]);
  let workflowRequests = $state<WorkflowRequest[]>([]);
  let inventorySessions = $state<InventorySession[]>([]);
  let inventoryItems = $state<InventoryItem[]>([]);
  let catalogs = $state<Catalogs | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state('overview');
  let showAssignModal = $state(false);
  let showMaintenanceModal = $state(false);
  let showReturnModal = $state(false);
  let returning = $state(false);
  let returnNote = $state('');
  let remindersLoading = $state(false);
  let inventoryLoading = $state(false);
  let creatingSession = $state(false);
  let activeInventorySessionId = $state('');
  let newSessionName = $state('');
  let newSessionLocationId = $state('');
  let purchaseCost = $state('');
  let usefulLifeYears = $state('3');

  let driverRecommendations = $state<DriverRecommendation[]>([]);
  let relatedDocuments = $state<KnowledgeDocument[]>([]);
  let knowledgeLoading = $state(false);
  let knowledgeError = $state('');

  let userRole = $state('');
  let ready = $state(false);
  const caps = $derived.by(() => getCapabilities(userRole));
  const backHref = $derived.by(() => (caps.canManageAssets ? '/assets' : '/me/assets'));

  const assetId = $derived(page.params.id);
  const locations = $derived(catalogs?.locations ?? []);

  onMount(() => {
    if (typeof window === 'undefined') return;
    userRole = localStorage.getItem('userRole') || '';
    ready = true;
  });
  const warrantyDaysLeft = $derived.by(() => {
    if (!asset?.warrantyEnd) return null;
    const end = new Date(asset.warrantyEnd).getTime();
    const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) ? diff : null;
  });
  const inventoryCounts = $derived.by(() => {
    return inventoryItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  });
  const openMaintenanceCount = $derived.by(() => maintenance.filter((ticket) => ticket.status !== 'closed').length);
  const healthScore = $derived.by(() => {
    let score = 100;
    if (asset?.status === 'retired' || asset?.status === 'disposed') {
      score -= 40;
    }
    if (openMaintenanceCount > 0) {
      score -= Math.min(30, openMaintenanceCount * 10);
    }
    if (warrantyDaysLeft !== null) {
      if (warrantyDaysLeft < 0) score -= 25;
      else if (warrantyDaysLeft < 30) score -= 15;
      else if (warrantyDaysLeft < 90) score -= 8;
    }
    return Math.max(20, score);
  });
  const depreciation = $derived.by(() => {
    const cost = Number(purchaseCost);
    const years = Number(usefulLifeYears);
    if (!cost || cost <= 0 || years <= 0) {
      return { annual: 0, monthly: 0 };
    }
    return {
      annual: cost / years,
      monthly: cost / years / 12
    };
  });
  async function loadDetail() {
    if (!assetId) return;
    try {
      loading = true;
      error = '';
      const detail = await getAssetDetail(assetId);
      asset = detail.data?.asset ?? null;
      assignments = detail.data?.assignments ?? [];
      maintenance = detail.data?.maintenance ?? [];
      const timelineResp = await getAssetTimeline(assetId);
      timeline = timelineResp.data ?? [];

      const attachmentResp = await listAttachments(assetId);
      attachments = attachmentResp.data ?? [];

      const reminderResp = await listReminders({ status: 'pending', page: 1, limit: 100 });
      reminders = (reminderResp.data ?? []).filter((item) => item.assetId === assetId);

      if (caps.canManageAssets) {
        const [workflowResp, sessionResp, catalogResp] = await Promise.all([
          listWorkflowRequests({ page: 1, limit: 100 }),
          listInventorySessions({ page: 1, limit: 100 }),
          getAssetCatalogs()
        ]);
        workflowRequests = (workflowResp.data ?? []).filter((item) => item.assetId === assetId);
        inventorySessions = sessionResp.data ?? [];
        catalogs = catalogResp.data ?? null;
      } else {
        workflowRequests = [];
        inventorySessions = [];
        inventoryItems = [];
        catalogs = null;
        activeInventorySessionId = '';
      }

      void loadKnowledge();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  async function loadKnowledge() {
    if (!assetId) return;
    knowledgeLoading = true;
    knowledgeError = '';
    try {
      const [drivers, docs] = await Promise.all([
        recommendDrivers({ assetId }),
        listDocuments({ relatedAssetId: assetId, page: 1, pageSize: 10, sort: 'updatedAt' })
      ]);
      driverRecommendations = drivers ?? [];
      relatedDocuments = docs.data ?? [];
    } catch (err) {
      knowledgeError = err instanceof Error ? err.message : $_('assets.knowledge.loadFailed');
      driverRecommendations = [];
      relatedDocuments = [];
    } finally {
      knowledgeLoading = false;
    }
  }
  async function handleAssign(data: { assigneeType: AssigneeType; assigneeName: string; assigneeId: string; note?: string }) {
    if (!asset) return;
    try {
      await assignAsset(asset.id, data);
      showAssignModal = false;
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.assignFailed');
    }
  }
  async function handleReturn() {
    if (!asset) return;
    try {
      returning = true;
      await returnAsset(asset.id, returnNote || undefined);
      showReturnModal = false;
      returnNote = '';
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.returnFailed');
    } finally {
      returning = false;
    }
  }
  async function handleMaintenance(data: { title: string; severity: MaintenanceSeverity; diagnosis?: string; resolution?: string }) {
    if (!asset) return;
    try {
      await openMaintenanceTicket({ assetId: asset.id, ...data });
      showMaintenanceModal = false;
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.openMaintenanceFailed');
    }
  }

  async function handleRunWarrantyReminders() {
    try {
      remindersLoading = true;
      await runWarrantyReminders([30, 60, 90]);
      const reminderResp = await listReminders({ status: 'pending' });
      reminders = (reminderResp.data ?? []).filter((item) => item.assetId === assetId);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.reminderFailed');
    } finally {
      remindersLoading = false;
    }
  }

  async function loadInventorySessionDetail(sessionId: string) {
    if (!sessionId) return;
    try {
      inventoryLoading = true;
      const response = await getInventorySessionDetail(sessionId);
      inventoryItems = response.data?.items ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.inventoryLoadFailed');
    } finally {
      inventoryLoading = false;
    }
  }

  async function handleCreateSession() {
    if (!newSessionName) return;
    try {
      creatingSession = true;
      const response = await createInventorySession({
        name: newSessionName,
        locationId: newSessionLocationId || undefined
      });
      const session = response.data;
      inventorySessions = [session, ...inventorySessions];
      activeInventorySessionId = session.id;
      newSessionName = '';
      newSessionLocationId = '';
      await loadInventorySessionDetail(session.id);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.inventoryCreateFailed');
    } finally {
      creatingSession = false;
    }
  }

  async function handleCloseSession() {
    if (!activeInventorySessionId) return;
    try {
      await closeInventorySession(activeInventorySessionId);
      const response = await listInventorySessions({ page: 1, limit: 50 });
      inventorySessions = response.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('assets.errors.inventoryCloseFailed');
    }
  }

  function downloadEvidencePack() {
    if (!asset) return;
    const payload = {
      asset,
      assignments,
      maintenance,
      timeline,
      attachments,
      reminders,
      workflowRequests
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset-${asset.assetCode}-evidence.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  $effect(() => {
    if (!ready) return;
    assetId;
    void loadDetail();
  });

  $effect(() => {
    if (caps.canManageAssets) return;
    if (activeTab === 'inventory' || activeTab === 'workflow') {
      activeTab = 'overview';
    }
  });

  $effect(() => {
    if (activeInventorySessionId) {
      void loadInventorySessionDetail(activeInventorySessionId);
    }
  });
</script>
<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-4 flex items-center gap-3">
    <Button color="alternative" href={backHref}>
      <ArrowLeft class="w-4 h-4 mr-2" /> {$isLoading ? 'Back' : $_('common.back')}
    </Button>
    <div>
      <h1 class="text-2xl font-semibold">{asset?.assetCode || ($isLoading ? 'Asset' : $_('assets.asset'))}</h1>
      <p class="text-sm text-gray-500">{asset?.status}</p>
    </div>
  </div>
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if asset}
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Badge color="blue">{$_(`assets.statuses.${asset.status}`)}</Badge>
        {#if asset.locationName}
          <span class="text-sm text-gray-500">{asset.locationName}</span>
        {/if}
      </div>
      {#if caps.canManageAssets}
        <div class="flex flex-wrap gap-2">
          <Button size="xs" onclick={() => showAssignModal = true}>
            <UserPlus class="w-4 h-4 mr-1" /> {$isLoading ? 'Assign' : $_('assets.assign')}
          </Button>
          <Button size="xs" color="alternative" onclick={() => showReturnModal = true}>
            <Undo2 class="w-4 h-4 mr-1" /> {$isLoading ? 'Return' : $_('assets.return')}
          </Button>
          <Button size="xs" color="alternative" onclick={() => showMaintenanceModal = true}>
            <Wrench class="w-4 h-4 mr-1" /> {$isLoading ? 'Maintenance' : $_('maintenance.title')}
          </Button>
        </div>
      {/if}
    </div>

    <Tabs>
      <TabItem open={activeTab === 'overview'} onclick={() => activeTab = 'overview'} title={$isLoading ? 'Overview' : $_('assets.tabs.overview')}>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card class="lg:col-span-2">
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Overview' : $_('assets.overview')}</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-500">{$isLoading ? 'Model' : $_('assets.model')}</p>
                <p class="font-medium">{asset.modelName || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Vendor' : $_('assets.vendor')}</p>
                <p class="font-medium">{asset.vendorName || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Location' : $_('assets.location')}</p>
                <p class="font-medium">{asset.locationName || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Serial' : $_('assets.serialNumber')}</p>
                <p class="font-medium">{asset.serialNo || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Mgmt IP' : $_('assets.mgmtIp')}</p>
                <p class="font-medium">{asset.mgmtIp || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Hostname' : $_('assets.hostname')}</p>
                <p class="font-medium">{asset.hostname || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Purchase date' : $_('assets.purchaseDate')}</p>
                <p class="font-medium">{asset.purchaseDate || '-'}</p>
              </div>
              <div>
                <p class="text-gray-500">{$isLoading ? 'Warranty End' : $_('assets.warrantyEnd')}</p>
                <p class="font-medium">{asset.warrantyEnd || '-'}</p>
              </div>
              <div class="col-span-2">
                <p class="text-gray-500">{$isLoading ? 'Notes' : $_('assets.notes')}</p>
                <p class="font-medium">{asset.notes || '-'}</p>
              </div>
            </div>
          </Card>
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Asset health' : $_('assets.health.title')}</h2>
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-gray-500">{$_('assets.health.score')}</span>
              <Badge color={healthScore > 80 ? 'green' : healthScore > 60 ? 'yellow' : 'red'}>{healthScore}</Badge>
            </div>
            <div class="space-y-2 text-sm text-gray-600">
              <div class="flex items-center justify-between">
                <span>{$_('assets.health.maintenanceOpen')}</span>
                <span class="font-medium">{openMaintenanceCount}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.health.warrantyDays')}</span>
                <span class="font-medium">{warrantyDaysLeft ?? '-'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.health.assignments')}</span>
                <span class="font-medium">{assignments.length}</span>
              </div>
            </div>
          </Card>
        </div>

        <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div class="flex items-center justify-between gap-2 mb-4">
              <h2 class="text-lg font-semibold">{$isLoading ? 'Recommended drivers' : $_('assets.knowledge.recommendedDrivers')}</h2>
              {#if driverRecommendations.length > 0}
                <Badge color="blue">{driverRecommendations.length}</Badge>
              {/if}
            </div>

            {#if knowledgeLoading}
              <div class="flex justify-center py-6">
                <Spinner size="6" />
              </div>
            {:else if knowledgeError}
              <Alert color="red">{knowledgeError}</Alert>
            {:else if driverRecommendations.length === 0}
              <p class="text-sm text-gray-500">{$isLoading ? 'No recommendations.' : $_('assets.knowledge.emptyDrivers')}</p>
            {:else}
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                {#each driverRecommendations as rec (rec.driver.id)}
                  <div class="py-3 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="font-semibold text-gray-900 dark:text-white truncate">
                        {rec.driver.vendor} · {rec.driver.model}
                      </div>
                      <div class="text-xs text-gray-500">
                        {rec.driver.component} · {rec.driver.os}/{rec.driver.arch} · <span class="font-mono">{rec.driver.version}</span>
                      </div>
                      {#if rec.explain?.length}
                        <div class="text-[11px] text-gray-400 mt-1 truncate">{rec.explain.join(' · ')}</div>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Badge color={rec.driver.riskLevel === 'high' || rec.driver.riskLevel === 'critical' ? 'red' : rec.driver.riskLevel === 'medium' ? 'yellow' : 'green'} class="capitalize">
                        {rec.driver.riskLevel}
                      </Badge>
                      {#if rec.driver.file?.storageKey && rec.driver.approval.status === 'approved' && rec.driver.supportStatus !== 'blocked'}
                        <Button size="xs" color="light" onclick={() => void downloadDriverFile(rec.driver.id)} aria-label="Download driver">
                          <Download class="w-4 h-4" />
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </Card>

          <Card>
            <div class="flex items-center justify-between gap-2 mb-4">
              <h2 class="text-lg font-semibold">{$isLoading ? 'Related documents' : $_('assets.knowledge.relatedDocs')}</h2>
              {#if relatedDocuments.length > 0}
                <Badge color="blue">{relatedDocuments.length}</Badge>
              {/if}
            </div>

            {#if knowledgeLoading}
              <div class="flex justify-center py-6">
                <Spinner size="6" />
              </div>
            {:else if knowledgeError}
              <Alert color="red">{knowledgeError}</Alert>
            {:else if relatedDocuments.length === 0}
              <p class="text-sm text-gray-500">{$isLoading ? 'No related docs.' : $_('assets.knowledge.emptyDocs')}</p>
            {:else}
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                {#each relatedDocuments as doc (doc.id)}
                  <div class="py-3 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="font-semibold text-gray-900 dark:text-white truncate">{doc.title}</div>
                      <div class="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                        <Badge color="blue" class="capitalize">{doc.type}</Badge>
                        <Badge color={doc.visibility === 'org' ? 'purple' : doc.visibility === 'department' ? 'indigo' : doc.visibility === 'team' ? 'blue' : 'dark'} class="capitalize">{doc.visibility}</Badge>
                      </div>
                      {#if doc.summary}
                        <div class="text-[11px] text-gray-400 mt-1 truncate">{doc.summary}</div>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      {#if doc.contentType === 'link' && doc.externalUrl}
                        <a
                          class="text-xs font-semibold text-blue-600 hover:underline"
                          href={doc.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {$_('docs.openLink')}
                        </a>
                      {:else if doc.contentType === 'file' && doc.files?.length}
                        <Button
                          size="xs"
                          color="light"
                          onclick={() => void downloadDocumentFile(doc.id, doc.files[0].id)}
                          aria-label="Download document"
                        >
                          <Download class="w-4 h-4" />
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </Card>
        </div>
      </TabItem>

      <TabItem open={activeTab === 'lifecycle'} onclick={() => activeTab = 'lifecycle'} title={$isLoading ? 'Lifecycle' : $_('assets.tabs.lifecycle')}>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Assignments' : $_('assets.assignments')}</h2>
            <Table>
              <TableHead>
                <TableHeadCell>{$isLoading ? 'Assignee' : $_('assets.assignee')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Type' : $_('assets.assigneeType')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Assigned' : $_('assets.assignedAt')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Returned' : $_('assets.returnedAt')}</TableHeadCell>
              </TableHead>
              <TableBody>
                {#each assignments as item}
                  <TableBodyRow>
                    <TableBodyCell>{item.assigneeName}</TableBodyCell>
                    <TableBodyCell>{item.assigneeType}</TableBodyCell>
                    <TableBodyCell>{new Date(item.assignedAt).toLocaleDateString()}</TableBodyCell>
                    <TableBodyCell>{item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : '-'}</TableBodyCell>
                  </TableBodyRow>
                {/each}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Timeline' : $_('assets.timeline')}</h2>
            <AssetTimeline events={timeline} />
          </Card>
        </div>
      </TabItem>

      <TabItem open={activeTab === 'maintenance'} onclick={() => activeTab = 'maintenance'} title={$isLoading ? 'Maintenance' : $_('assets.tabs.maintenance')}>
        <Card>
          <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Maintenance' : $_('maintenance.title')}</h2>
          {#if maintenance.length === 0}
            <Alert color="blue">{$isLoading ? 'No maintenance records yet.' : $_('assets.maintenanceEmpty')}</Alert>
          {:else}
            <Table>
              <TableHead>
                <TableHeadCell>{$isLoading ? 'Title' : $_('maintenance.titleLabel')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Severity' : $_('maintenance.severity')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
                <TableHeadCell>{$isLoading ? 'Opened' : $_('maintenance.openedAt')}</TableHeadCell>
              </TableHead>
              <TableBody>
                {#each maintenance as item}
                  <TableBodyRow>
                    <TableBodyCell>{item.title}</TableBodyCell>
                    <TableBodyCell>{item.severity}</TableBodyCell>
                    <TableBodyCell>{item.status}</TableBodyCell>
                    <TableBodyCell>{new Date(item.openedAt).toLocaleDateString()}</TableBodyCell>
                  </TableBodyRow>
                {/each}
              </TableBody>
            </Table>
          {/if}
        </Card>
      </TabItem>

      <TabItem open={activeTab === 'warranty'} onclick={() => activeTab = 'warranty'} title={$isLoading ? 'Warranty' : $_('assets.tabs.warranty')}>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Warranty' : $_('assets.warranty')}</h2>
            <div class="space-y-2 text-sm text-gray-600">
              <div class="flex items-center justify-between">
                <span>{$_('assets.purchaseDate')}</span>
                <span class="font-medium">{asset.purchaseDate || '-'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.warrantyEnd')}</span>
                <span class="font-medium">{asset.warrantyEnd || '-'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.warrantyRemaining')}</span>
                <span class="font-medium">{warrantyDaysLeft ?? '-'}</span>
              </div>
            </div>
            {#if caps.isAdmin}
              <div class="mt-4 flex items-center gap-2">
                <Button size="xs" onclick={handleRunWarrantyReminders} disabled={remindersLoading}>
                  {remindersLoading ? $_('common.loading') : $_('assets.runWarrantyReminders')}
                </Button>
              </div>
            {/if}
            <div class="mt-4 space-y-2">
              {#if reminders.length === 0}
                <p class="text-sm text-gray-500">{$_('assets.remindersEmpty')}</p>
              {:else}
                {#each reminders as reminder}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">{reminder.reminderType}</span>
                    <span class="font-medium">{new Date(reminder.dueAt).toLocaleDateString()}</span>
                  </div>
                {/each}
              {/if}
            </div>
          </Card>
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Depreciation' : $_('assets.depreciation.title')}</h2>
            <div class="grid grid-cols-1 gap-3 text-sm">
              <div>
                <Label class="mb-2">{$_('assets.depreciation.cost')}</Label>
                <Input bind:value={purchaseCost} placeholder="12000000" />
              </div>
              <div>
                <Label class="mb-2">{$_('assets.depreciation.years')}</Label>
                <Select bind:value={usefulLifeYears}>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </Select>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.depreciation.annual')}</span>
                <span class="font-medium">{depreciation.annual.toFixed(0)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>{$_('assets.depreciation.monthly')}</span>
                <span class="font-medium">{depreciation.monthly.toFixed(0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </TabItem>

      {#if caps.canManageAssets}
        <TabItem open={activeTab === 'inventory'} onclick={() => activeTab = 'inventory'} title={$isLoading ? 'Inventory' : $_('assets.tabs.inventory')}>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Sessions' : $_('assets.inventory.sessions')}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-2">
                <Label class="mb-2">{$_('assets.inventory.sessionName')}</Label>
                <Input bind:value={newSessionName} placeholder={$_('assets.inventory.sessionNamePlaceholder')} />
              </div>
              <div>
                <Label class="mb-2">{$_('assets.inventory.sessionLocation')}</Label>
                <Select bind:value={newSessionLocationId}>
                  <option value="">{$_('assets.placeholders.selectLocation')}</option>
                  {#each locations as location}
                    <option value={location.id}>{location.name}</option>
                  {/each}
                </Select>
              </div>
            </div>
            <div class="mt-3 flex gap-2">
              <Button size="xs" onclick={handleCreateSession} disabled={!newSessionName || creatingSession}>
                {creatingSession ? $_('common.loading') : $_('assets.inventory.createSession')}
              </Button>
              <Button size="xs" color="alternative" onclick={handleCloseSession} disabled={!activeInventorySessionId}>
                {$_('assets.inventory.closeSession')}
              </Button>
            </div>
            <div class="mt-4">
              <Label class="mb-2">{$_('assets.inventory.sessionSelect')}</Label>
              <Select bind:value={activeInventorySessionId}>
                <option value="">{$_('assets.inventory.selectSession')}</option>
                {#each inventorySessions as session}
                  <option value={session.id}>{session.name} - {session.status}</option>
                {/each}
              </Select>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
              {#each Object.entries(inventoryCounts) as [status, count]}
                <Badge color="blue">{status}: {count}</Badge>
              {/each}
            </div>
          </Card>
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Quick scan' : $_('assets.inventory.quickScan')}</h2>
            <InventoryScanPanel
              sessionId={activeInventorySessionId}
              {locations}
              onscanned={() => loadInventorySessionDetail(activeInventorySessionId)}
            />
          </Card>
        </div>
        <div class="mt-6">
          <Card>
            <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Inventory items' : $_('assets.inventory.items')}</h2>
            {#if inventoryLoading}
              <Spinner size="6" />
            {:else if inventoryItems.length === 0}
              <p class="text-sm text-gray-500">{$_('assets.inventory.empty')}</p>
            {:else}
              <Table>
                <TableHead>
                  <TableHeadCell>{$isLoading ? 'Asset ID' : $_('assets.assetId')}</TableHeadCell>
                  <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
                  <TableHeadCell>{$isLoading ? 'Scanned At' : $_('assets.inventory.scannedAt')}</TableHeadCell>
                </TableHead>
                <TableBody>
                  {#each inventoryItems as item}
                    <TableBodyRow>
                      <TableBodyCell>{item.assetId || '-'}</TableBodyCell>
                      <TableBodyCell>{item.status}</TableBodyCell>
                      <TableBodyCell>{item.scannedAt ? new Date(item.scannedAt).toLocaleString() : '-'}</TableBodyCell>
                    </TableBodyRow>
                  {/each}
                </TableBody>
              </Table>
            {/if}
          </Card>
        </div>
        </TabItem>
      {/if}

      {#if caps.canManageAssets}
        <TabItem open={activeTab === 'workflow'} onclick={() => activeTab = 'workflow'} title={$isLoading ? 'Workflow' : $_('assets.tabs.workflow')}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Request' : $_('assets.workflow.title')}</h2>
              <WorkflowRequestForm assetId={asset.id} onsubmitted={loadDetail} />
            </Card>
            <Card>
              <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Requests' : $_('assets.workflow.requests')}</h2>
              {#if workflowRequests.length === 0}
                <p class="text-sm text-gray-500">{$_('assets.workflow.empty')}</p>
              {:else}
                <Table>
                  <TableHead>
                    <TableHeadCell>{$isLoading ? 'Type' : $_('assets.requestType')}</TableHeadCell>
                    <TableHeadCell>{$isLoading ? 'Status' : $_('assets.status')}</TableHeadCell>
                    <TableHeadCell>{$isLoading ? 'Created' : $_('assets.createdAt')}</TableHeadCell>
                  </TableHead>
                  <TableBody>
                    {#each workflowRequests as request}
                      <TableBodyRow>
                        <TableBodyCell>{request.requestType}</TableBodyCell>
                        <TableBodyCell>{request.status}</TableBodyCell>
                        <TableBodyCell>{new Date(request.createdAt).toLocaleDateString()}</TableBodyCell>
                      </TableBodyRow>
                    {/each}
                  </TableBody>
                </Table>
              {/if}
            </Card>
          </div>
        </TabItem>
      {/if}

      <TabItem open={activeTab === 'attachments'} onclick={() => activeTab = 'attachments'} title={$isLoading ? 'Attachments' : $_('assets.tabs.attachments')}>
        <Card>
          <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Attachments' : $_('assets.attachments')}</h2>
          {#if caps.canManageAssets}
            <AttachmentUploader assetId={asset.id} onuploaded={loadDetail} />
          {/if}
          <div class="mt-4">
            <AttachmentList assetId={asset.id} attachments={attachments} />
          </div>
        </Card>
      </TabItem>

      <TabItem open={activeTab === 'compliance'} onclick={() => activeTab = 'compliance'} title={$isLoading ? 'Compliance' : $_('assets.tabs.compliance')}>
        <Card>
          <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Evidence pack' : $_('assets.compliance.title')}</h2>
          <p class="text-sm text-gray-500 mb-4">{$isLoading ? 'Download audit evidence for this asset.' : $_('assets.compliance.subtitle')}</p>
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>{$_('assets.compliance.attachments')}: {attachments.length}</span>
            <span>{$_('assets.compliance.timeline')}: {timeline.length}</span>
            <span>{$_('assets.compliance.maintenance')}: {maintenance.length}</span>
          </div>
          <Button class="mt-4" onclick={downloadEvidencePack}>
            <Download class="w-4 h-4 mr-2" /> {$isLoading ? 'Download' : $_('assets.compliance.download')}
          </Button>
        </Card>
      </TabItem>
    </Tabs>
  {/if}
</div>
{#if caps.canManageAssets}
  <AssignModal bind:open={showAssignModal} assetCode={asset?.assetCode || ''} onassign={handleAssign} />
  <MaintenanceModal bind:open={showMaintenanceModal} assetCode={asset?.assetCode || ''} onsubmit={handleMaintenance} />
  <Modal bind:open={showReturnModal}>
    <svelte:fragment slot="header">
        <h3 class="text-lg font-semibold">{$isLoading ? 'Return Asset' : $_('assets.returnAsset')}</h3>
    </svelte:fragment>
    <div class="space-y-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Return Note' : $_('assets.returnNote')}</Label>
        <Input bind:value={returnNote} placeholder={$isLoading ? 'Optional note' : $_('assets.placeholders.returnNote')} />
      </div>
    </div>
    <svelte:fragment slot="footer">
        <div class="flex justify-end gap-2">
          <Button color="alternative" onclick={() => showReturnModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
          <Button onclick={handleReturn} disabled={returning}>
            {returning ? ($isLoading ? 'Returning...' : $_('assets.returning')) : ($isLoading ? 'Return' : $_('assets.return'))}
          </Button>
        </div>
    </svelte:fragment>
  </Modal>
{/if}

