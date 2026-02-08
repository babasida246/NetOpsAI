<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner } from 'flowbite-svelte';
  import { Download, Plus, RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    bulkDrivers,
    createDriver,
    deleteDriver,
    downloadDriverFile,
    listDrivers,
    type BulkDriversInput,
    type ApprovalStatus,
    type BulkDriversAction,
    type DriverArch,
    type DriverComponent,
    type DriverDeviceType,
    type DriverOs,
    type DriverPackage,
    type DriverRiskLevel,
    type DriverSupportStatus
  } from '$lib/api/drivers';

  type SortKey = 'updatedAt' | 'releaseDate' | 'vendor' | 'model' | 'version';

  let items = $state<DriverPackage[]>([]);
  let loading = $state(true);
  let error = $state('');
  let meta = $state({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

  let q = $state('');
  let vendor = $state('');
  let model = $state('');
  let os = $state<DriverOs | ''>('');
  let arch = $state<DriverArch | ''>('');
  let component = $state<DriverComponent | ''>('');
  let status = $state<ApprovalStatus | ''>('');
  let supportStatus = $state<DriverSupportStatus | ''>('');
  let riskLevel = $state<DriverRiskLevel | ''>('');
  let sort = $state<SortKey>('updatedAt');

  let selected = $state<Record<string, boolean>>({});
  const selectedIds = $derived.by(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id));
  const selectedCount = $derived(selectedIds.length);

  let bulkAction = $state<BulkDriversAction>('submitApproval');
  let bulkTag = $state('');
  let bulkRisk = $state<DriverRiskLevel>('medium');
  let bulkReason = $state('');
  let bulkBusy = $state(false);
  let bulkError = $state('');

  let showCreate = $state(false);
  let createBusy = $state(false);
  let createError = $state('');

  let newVendor = $state('');
  let newModel = $state('');
  let newDeviceType = $state<DriverDeviceType>('other');
  let newComponent = $state<DriverComponent>('other');
  let newOs = $state<DriverOs>('other');
  let newArch = $state<DriverArch>('x64');
  let newVersion = $state('');
  let newRisk = $state<DriverRiskLevel>('low');
  let newSupport = $state<DriverSupportStatus>('supported');

  const createValid = $derived.by(() => newVendor.trim().length > 0 && newModel.trim().length > 0 && newVersion.trim().length > 0);

  const queryString = $derived.by(() => {
    const params = new URLSearchParams(page.url.searchParams);
    return params.toString();
  });

  function badgeColorForApproval(value: ApprovalStatus): 'dark' | 'blue' | 'green' | 'red' | 'yellow' {
    if (value === 'approved') return 'green';
    if (value === 'pending') return 'yellow';
    if (value === 'rejected') return 'red';
    return 'dark';
  }

  function badgeColorForSupport(value: DriverSupportStatus): 'green' | 'yellow' | 'red' {
    if (value === 'supported') return 'green';
    if (value === 'deprecated') return 'yellow';
    return 'red';
  }

  function badgeColorForRisk(value: DriverRiskLevel): 'green' | 'yellow' | 'red' {
    if (value === 'low') return 'green';
    if (value === 'medium') return 'yellow';
    return 'red';
  }

  async function load(pageNumber = 1) {
    try {
      loading = true;
      error = '';
      const response = await listDrivers({
        q: q || undefined,
        vendor: vendor || undefined,
        model: model || undefined,
        os: os || undefined,
        arch: arch || undefined,
        component: component || undefined,
        status: status || undefined,
        supportStatus: supportStatus || undefined,
        riskLevel: riskLevel || undefined,
        sort,
        page: pageNumber,
        pageSize: meta.pageSize
      });
      items = response.data ?? [];
      meta = response.meta ?? meta;
      selected = {};
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load drivers';
    } finally {
      loading = false;
    }
  }

  function toggleAll(next: boolean) {
    const updated: Record<string, boolean> = {};
    for (const item of items) updated[item.id] = next;
    selected = updated;
  }

  async function applyBulk() {
    if (selectedIds.length === 0) return;
    bulkError = '';
    bulkBusy = true;
    try {
      const payload: BulkDriversInput = { action: bulkAction, ids: selectedIds };
      if (bulkAction === 'tag/add' || bulkAction === 'tag/remove') payload.tag = bulkTag.trim();
      if (bulkAction === 'setRisk') payload.riskLevel = bulkRisk;
      if (bulkAction === 'block' || bulkAction === 'unblock' || bulkAction === 'delete') payload.reason = bulkReason.trim();
      await bulkDrivers(payload);
      bulkTag = '';
      bulkReason = '';
      await load(meta.page);
    } catch (err) {
      bulkError = err instanceof Error ? err.message : 'Bulk action failed';
    } finally {
      bulkBusy = false;
    }
  }

  async function handleDownload(item: DriverPackage) {
    try {
      await downloadDriverFile(item.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Download failed';
    }
  }

  async function handleDelete(item: DriverPackage) {
    const reason = item.approval.status === 'approved' ? prompt($_('drivers.danger.deleteApprovedReason')) : prompt($_('drivers.danger.deleteReason'));
    if (reason === null) return;
    try {
      await deleteDriver(item.id, reason.trim() || undefined);
      await load(meta.page);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Delete failed';
    }
  }

  async function handleCreate() {
    if (!createValid) return;
    createBusy = true;
    createError = '';
    try {
      const created = await createDriver({
        vendor: newVendor.trim(),
        model: newModel.trim(),
        deviceType: newDeviceType,
        component: newComponent,
        os: newOs,
        arch: newArch,
        version: newVersion.trim(),
        riskLevel: newRisk,
        supportStatus: newSupport
      });
      showCreate = false;
      const nextUrl = `/admin/drivers/${created.id}`;
      if (typeof window !== 'undefined') window.location.assign(nextUrl);
    } catch (err) {
      createError = err instanceof Error ? err.message : 'Create failed';
    } finally {
      createBusy = false;
    }
  }

  onMount(() => {
    void load(1);
  });

  $effect(() => {
    // Keep page state stable when query changes (for deep links). For now, just read it to ensure reactivity.
    void queryString;
  });
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Drivers' : $_('drivers.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {$isLoading ? 'Manage driver packages, approvals, and downloads.' : $_('drivers.subtitle')}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button color="light" onclick={() => void load(meta.page)}><RefreshCw class="w-4 h-4 mr-1" />{$isLoading ? 'Refresh' : $_('common.refresh')}</Button>
      <Button onclick={() => (showCreate = true)}><Plus class="w-4 h-4 mr-1" />{$isLoading ? 'New' : $_('drivers.new')}</Button>
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <Card class="w-full space-y-4" size="none">
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div class="space-y-1">
          <Label>{$isLoading ? 'Search' : $_('common.search')}</Label>
          <div class="flex gap-2">
            <Input bind:value={q} placeholder={$_('drivers.filters.searchPlaceholder')} />
            <Button color="light" onclick={() => void load(1)} aria-label="Search"><Search class="w-4 h-4" /></Button>
          </div>
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Vendor' : $_('common.vendor')}</Label>
          <Input bind:value={vendor} placeholder="HP / Dell / Intel" />
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Model' : $_('common.model')}</Label>
          <Input bind:value={model} placeholder="Model name" />
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Component' : $_('drivers.fields.component')}</Label>
          <Select bind:value={component}>
            <option value="">{$_('common.all')}</option>
            <option value="chipset">chipset</option>
            <option value="lan">lan</option>
            <option value="wifi">wifi</option>
            <option value="gpu">gpu</option>
            <option value="audio">audio</option>
            <option value="storage">storage</option>
            <option value="bios">bios</option>
            <option value="firmware">firmware</option>
            <option value="other">other</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'OS' : $_('drivers.fields.os')}</Label>
          <Select bind:value={os}>
            <option value="">{$_('common.all')}</option>
            <option value="win10">win10</option>
            <option value="win11">win11</option>
            <option value="server2019">server2019</option>
            <option value="server2022">server2022</option>
            <option value="ubuntu">ubuntu</option>
            <option value="debian">debian</option>
            <option value="rhel">rhel</option>
            <option value="other">other</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Arch' : $_('drivers.fields.arch')}</Label>
          <Select bind:value={arch}>
            <option value="">{$_('common.all')}</option>
            <option value="x64">x64</option>
            <option value="arm64">arm64</option>
            <option value="x86">x86</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Approval' : $_('drivers.fields.approval')}</Label>
          <Select bind:value={status}>
            <option value="">{$_('common.all')}</option>
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$isLoading ? 'Risk' : $_('drivers.fields.risk')}</Label>
          <Select bind:value={riskLevel}>
            <option value="">{$_('common.all')}</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </Select>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-start lg:justify-end">
        <Button color="light" onclick={() => { q=''; vendor=''; model=''; os=''; arch=''; component=''; status=''; supportStatus=''; riskLevel=''; sort='updatedAt'; void load(1); }}>
          {$isLoading ? 'Reset' : $_('common.reset')}
        </Button>
        <Button onclick={() => void load(1)}>{$isLoading ? 'Apply' : $_('common.apply')}</Button>
      </div>
    </div>

    {#if selectedCount > 0}
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {selectedCount} {$isLoading ? 'selected' : $_('common.selected')}
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_auto] gap-2 items-end">
          <div class="space-y-1">
            <Label>{$isLoading ? 'Action' : $_('common.actions')}</Label>
            <Select bind:value={bulkAction}>
              <option value="submitApproval">submitApproval</option>
              <option value="tag/add">tag/add</option>
              <option value="tag/remove">tag/remove</option>
              <option value="setRisk">setRisk</option>
              <option value="block">block</option>
              <option value="unblock">unblock</option>
              <option value="delete">delete</option>
            </Select>
          </div>

          <div class="space-y-1">
            {#if bulkAction === 'tag/add' || bulkAction === 'tag/remove'}
              <Label>{$isLoading ? 'Tag' : $_('drivers.bulk.tag')}</Label>
              <Input bind:value={bulkTag} placeholder="netops / printer / wifi" />
            {:else if bulkAction === 'setRisk'}
              <Label>{$isLoading ? 'Risk' : $_('drivers.fields.risk')}</Label>
              <Select bind:value={bulkRisk}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </Select>
            {:else if bulkAction === 'block' || bulkAction === 'unblock' || bulkAction === 'delete'}
              <Label>{$isLoading ? 'Reason' : $_('drivers.bulk.reason')}</Label>
              <Input bind:value={bulkReason} placeholder={$_('drivers.bulk.reasonPlaceholder')} />
            {:else}
              <div class="text-xs text-slate-500">{$_('drivers.bulk.noExtra')}</div>
            {/if}
          </div>

          <div class="flex gap-2 justify-end">
            <Button color="light" disabled={bulkBusy} onclick={() => (selected = {})}>{$_('common.clearSelection')}</Button>
            <Button disabled={bulkBusy} onclick={applyBulk}>{bulkBusy ? $_('common.submitting') : $_('common.apply')}</Button>
          </div>
        </div>
        {#if bulkError}
          <Alert color="red">{bulkError}</Alert>
        {/if}
      </div>
    {/if}

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-200">
          <tr>
            <th class="px-3 py-2 w-10">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={selectedCount > 0 && selectedCount === items.length}
                onclick={(e) => toggleAll((e.target as HTMLInputElement).checked)}
              />
            </th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.vendorModel')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.platform')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.version')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.status')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.approval')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.risk')}</th>
            <th class="px-3 py-2 text-left">{$_('drivers.columns.updated')}</th>
            <th class="px-3 py-2 text-right">{$_('common.actions')}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#if loading}
            <tr>
              <td colspan="9" class="px-3 py-10 text-center">
                <Spinner size="6" />
              </td>
            </tr>
          {:else if items.length === 0}
            <tr>
              <td colspan="9" class="px-3 py-10 text-center text-slate-500">{$_('common.noData')}</td>
            </tr>
          {:else}
            {#each items as item (item.id)}
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td class="px-3 py-2">
                  <input type="checkbox" bind:checked={selected[item.id]} aria-label={`Select ${item.vendor} ${item.model}`} />
                </td>
                <td class="px-3 py-2">
                  <div class="font-semibold text-slate-900 dark:text-white">{item.vendor} · {item.model}</div>
                  <div class="text-xs text-slate-500">{item.component}</div>
                </td>
                <td class="px-3 py-2">
                  <div class="text-slate-700 dark:text-slate-200">{item.os} / {item.arch}</div>
                  {#if item.osVersion}
                    <div class="text-xs text-slate-500">{item.osVersion}</div>
                  {/if}
                </td>
                <td class="px-3 py-2">
                  <span class="font-mono text-xs">{item.version}</span>
                </td>
                <td class="px-3 py-2">
                  <Badge color={badgeColorForSupport(item.supportStatus)} class="capitalize">{item.supportStatus}</Badge>
                </td>
                <td class="px-3 py-2">
                  <Badge color={badgeColorForApproval(item.approval.status)} class="capitalize">{item.approval.status}</Badge>
                </td>
                <td class="px-3 py-2">
                  <Badge color={badgeColorForRisk(item.riskLevel)} class="capitalize">{item.riskLevel}</Badge>
                </td>
                <td class="px-3 py-2 text-xs text-slate-500">
                  {new Date(item.updatedAt).toLocaleString()}
                </td>
                <td class="px-3 py-2">
                  <div class="flex justify-end gap-2">
                    <a
                      class="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      href={`/admin/drivers/${item.id}`}
                    >
                      {$_('common.view')}
                    </a>
                    {#if item.file?.storageKey && item.approval.status === 'approved' && item.supportStatus !== 'blocked'}
                      <button
                        class="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                        onclick={() => void handleDownload(item)}
                      >
                        <Download class="w-3 h-3" /> {$_('drivers.download')}
                      </button>
                    {/if}
                    <button
                      class="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      onclick={() => void handleDelete(item)}
                    >
                      {$_('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    {#if !loading && meta.totalPages > 1}
      <div class="flex items-center justify-between gap-3 pt-2">
        <div class="text-xs text-slate-500">
          {$_('common.total')}: {meta.total}
        </div>
        <div class="flex gap-2">
          <Button color="light" size="xs" disabled={meta.page <= 1} onclick={() => void load(meta.page - 1)}>{$_('common.previous')}</Button>
          <Badge color="blue">{meta.page} / {meta.totalPages}</Badge>
          <Button color="light" size="xs" disabled={meta.page >= meta.totalPages} onclick={() => void load(meta.page + 1)}>{$_('common.next')}</Button>
        </div>
      </div>
    {/if}
  </Card>
</div>

<Modal open={showCreate} size="lg" autoclose={false} onclose={() => (showCreate = false)}>
  <div class="space-y-4 p-4">
    <div>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('drivers.create.title')}</h2>
      <p class="text-sm text-slate-500">{$_('drivers.create.subtitle')}</p>
    </div>

    {#if createError}
      <Alert color="red">{createError}</Alert>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1">
        <Label>{$_('common.vendor')}</Label>
        <Input bind:value={newVendor} placeholder="HP / Dell / Intel" />
      </div>
      <div class="space-y-1">
        <Label>{$_('common.model')}</Label>
        <Input bind:value={newModel} placeholder="HP LaserJet M404" />
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.deviceType')}</Label>
        <Select bind:value={newDeviceType}>
          <option value="workstation">workstation</option>
          <option value="laptop">laptop</option>
          <option value="printer">printer</option>
          <option value="switch">switch</option>
          <option value="router">router</option>
          <option value="server">server</option>
          <option value="peripheral">peripheral</option>
          <option value="other">other</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.component')}</Label>
        <Select bind:value={newComponent}>
          <option value="chipset">chipset</option>
          <option value="lan">lan</option>
          <option value="wifi">wifi</option>
          <option value="gpu">gpu</option>
          <option value="audio">audio</option>
          <option value="storage">storage</option>
          <option value="bios">bios</option>
          <option value="firmware">firmware</option>
          <option value="other">other</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.os')}</Label>
        <Select bind:value={newOs}>
          <option value="win10">win10</option>
          <option value="win11">win11</option>
          <option value="server2019">server2019</option>
          <option value="server2022">server2022</option>
          <option value="ubuntu">ubuntu</option>
          <option value="debian">debian</option>
          <option value="rhel">rhel</option>
          <option value="other">other</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.arch')}</Label>
        <Select bind:value={newArch}>
          <option value="x64">x64</option>
          <option value="arm64">arm64</option>
          <option value="x86">x86</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.version')}</Label>
        <Input bind:value={newVersion} placeholder="1.2.3" />
      </div>
      <div class="space-y-1">
        <Label>{$_('drivers.fields.risk')}</Label>
        <Select bind:value={newRisk}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('common.status')}</Label>
        <Select bind:value={newSupport}>
          <option value="supported">supported</option>
          <option value="deprecated">deprecated</option>
          <option value="blocked">blocked</option>
        </Select>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button color="light" onclick={() => (showCreate = false)} disabled={createBusy}>{$_('common.cancel')}</Button>
      <Button onclick={handleCreate} disabled={createBusy || !createValid}>{createBusy ? $_('common.submitting') : $_('common.create')}</Button>
    </div>
  </div>
</Modal>
