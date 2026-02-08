<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner, TabItem, Tabs, Textarea } from 'flowbite-svelte';
  import { ArrowLeft, Download, RefreshCw, ShieldAlert } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listAuditLogs, type AuditLogEntry } from '$lib/api/audit';
  import {
    approveDriver,
    blockDriver,
    deleteDriver,
    downloadDriverFile,
    getDriver,
    rejectDriver,
    submitDriverApproval,
    unblockDriver,
    updateDriver,
    uploadDriverFile,
    type DriverPackage,
    type DriverRiskLevel
  } from '$lib/api/drivers';

  type ActionKind = 'approve' | 'reject' | 'block' | 'unblock' | 'delete';

  const driverId = $derived(page.params.id);

  let driver = $state<DriverPackage | null>(null);
  let loading = $state(true);
  let error = $state('');

  let saving = $state(false);
  let fileBusy = $state(false);

  let activeTab = $state<'overview' | 'files' | 'approval' | 'audit'>('overview');

  let audit = $state<AuditLogEntry[]>([]);
  let auditLoading = $state(false);

  // Editable fields (draft/pending only).
  let patchRisk = $state<DriverRiskLevel>('low');
  let patchTags = $state('');
  let patchNotes = $state('');
  let vendorUrl = $state('');
  let releaseNotesUrl = $state('');
  let silentInstallCmd = $state('');
  let silentUninstallCmd = $state('');

  const isApproved = $derived.by(() => driver?.approval.status === 'approved');
  const isPending = $derived.by(() => driver?.approval.status === 'pending');
  const canEdit = $derived.by(() => !!driver && driver.approval.status !== 'approved');
  const hasFile = $derived.by(() => !!driver?.file?.storageKey);

  let actionModal = $state<ActionKind | null>(null);
  let actionReason = $state('');
  let actionNote = $state('');
  let actionBusy = $state(false);
  let actionError = $state('');

  function badgeColorForApproval(): 'dark' | 'green' | 'yellow' | 'red' {
    const status = driver?.approval.status ?? 'draft';
    if (status === 'approved') return 'green';
    if (status === 'pending') return 'yellow';
    if (status === 'rejected') return 'red';
    return 'dark';
  }

  function badgeColorForRisk(value: DriverRiskLevel): 'green' | 'yellow' | 'red' {
    if (value === 'low') return 'green';
    if (value === 'medium') return 'yellow';
    return 'red';
  }

  function initEditable(next: DriverPackage) {
    patchRisk = next.riskLevel;
    patchTags = (next.tags ?? []).join(', ');
    patchNotes = next.compatibilityNotes ?? '';
    vendorUrl = next.links?.vendorUrl ?? '';
    releaseNotesUrl = next.links?.releaseNotesUrl ?? '';
    silentInstallCmd = next.install?.silentInstallCmd ?? '';
    silentUninstallCmd = next.install?.silentUninstallCmd ?? '';
  }

  async function load() {
    if (!driverId) return;
    try {
      loading = true;
      error = '';
      const next = await getDriver(driverId);
      driver = next;
      initEditable(next);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load driver';
      driver = null;
    } finally {
      loading = false;
    }
  }

  async function loadAudit() {
    if (!driverId) return;
    auditLoading = true;
    try {
      const response = await listAuditLogs({ resource: 'drivers', resourceId: driverId, limit: 50, page: 1 });
      audit = response.data ?? [];
    } catch (err) {
      // Keep audit errors non-blocking.
      audit = [];
    } finally {
      auditLoading = false;
    }
  }

  async function save() {
    if (!driver || !canEdit) return;
    saving = true;
    error = '';
    try {
      const tags = patchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await updateDriver(driver.id, {
        riskLevel: patchRisk,
        tags,
        compatibilityNotes: patchNotes,
        links: {
          vendorUrl: vendorUrl.trim() || null,
          releaseNotesUrl: releaseNotesUrl.trim() || null
        },
        install: {
          silentInstallCmd: silentInstallCmd.trim() || null,
          silentUninstallCmd: silentUninstallCmd.trim() || null
        }
      });
      driver = updated;
      initEditable(updated);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function handleUpload(file: File) {
    if (!driver) return;
    fileBusy = true;
    error = '';
    try {
      const updated = await uploadDriverFile(driver.id, file);
      driver = updated;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      fileBusy = false;
    }
  }

  async function handleDownload() {
    if (!driver) return;
    try {
      await downloadDriverFile(driver.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Download failed';
    }
  }

  function openAction(kind: ActionKind) {
    actionModal = kind;
    actionReason = '';
    actionNote = '';
    actionError = '';
  }

  async function confirmAction() {
    if (!driver || !actionModal) return;
    actionBusy = true;
    actionError = '';

    try {
      if (actionModal === 'approve') {
        const updated = await approveDriver(driver.id, { reason: actionReason.trim() || undefined, note: actionNote.trim() || undefined });
        driver = updated;
        initEditable(updated);
      } else if (actionModal === 'reject') {
        const updated = await rejectDriver(driver.id, { reason: actionReason.trim(), note: actionNote.trim() || undefined });
        driver = updated;
        initEditable(updated);
      } else if (actionModal === 'block') {
        const updated = await blockDriver(driver.id, actionReason.trim());
        driver = updated;
        initEditable(updated);
      } else if (actionModal === 'unblock') {
        const updated = await unblockDriver(driver.id, actionReason.trim());
        driver = updated;
        initEditable(updated);
      } else if (actionModal === 'delete') {
        await deleteDriver(driver.id, actionReason.trim() || undefined);
        if (typeof window !== 'undefined') window.location.assign('/admin/drivers');
      }

      actionModal = null;
      void loadAudit();
    } catch (err) {
      actionError = err instanceof Error ? err.message : 'Action failed';
    } finally {
      actionBusy = false;
    }
  }

  async function submitForApproval() {
    if (!driver) return;
    actionBusy = true;
    actionError = '';
    try {
      const updated = await submitDriverApproval(driver.id);
      driver = updated;
      initEditable(updated);
      void loadAudit();
    } catch (err) {
      actionError = err instanceof Error ? err.message : 'Submit failed';
    } finally {
      actionBusy = false;
    }
  }

  onMount(() => {
    void load();
    void loadAudit();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <a
        href="/admin/drivers"
        class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <ArrowLeft class="w-4 h-4" /> {$_('common.back')}
      </a>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{$_('drivers.detailTitle')}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{$_('drivers.detailSubtitle')}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button color="light" onclick={() => void load()}><RefreshCw class="w-4 h-4 mr-1" />{$_('common.refresh')}</Button>
      {#if canEdit}
        <Button onclick={save} disabled={saving}>{saving ? $_('common.saving') : $_('common.save')}</Button>
      {/if}
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10"><Spinner size="8" /></div>
  {:else if driver}
    <Card size="none" class="w-full space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="text-sm text-slate-500">{driver.vendor} · {driver.model}</div>
          <div class="text-xs text-slate-500 font-mono">{driver.id}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge color={badgeColorForApproval()} class="capitalize">{driver.approval.status}</Badge>
          <Badge color={badgeColorForRisk(driver.riskLevel)} class="capitalize">{driver.riskLevel}</Badge>
          <Badge color={driver.supportStatus === 'supported' ? 'green' : driver.supportStatus === 'deprecated' ? 'yellow' : 'red'} class="capitalize">
            {driver.supportStatus}
          </Badge>
        </div>
      </div>

      <Tabs>
        <TabItem open={activeTab === 'overview'} onclick={() => (activeTab = 'overview')} title={$_('common.details')}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card size="none" class="lg:col-span-2 space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-slate-500">{$_('common.vendor')}</div>
                  <div class="font-semibold">{driver.vendor}</div>
                </div>
                <div>
                  <div class="text-slate-500">{$_('common.model')}</div>
                  <div class="font-semibold">{driver.model}</div>
                </div>
                <div>
                  <div class="text-slate-500">{$_('drivers.fields.component')}</div>
                  <div class="font-semibold">{driver.component}</div>
                </div>
                <div>
                  <div class="text-slate-500">{$_('drivers.fields.platform')}</div>
                  <div class="font-semibold">{driver.os} / {driver.arch}</div>
                </div>
                <div>
                  <div class="text-slate-500">{$_('drivers.fields.version')}</div>
                  <div class="font-mono text-xs">{driver.version}</div>
                </div>
                <div>
                  <div class="text-slate-500">{$_('drivers.fields.updatedAt')}</div>
                  <div class="text-xs">{new Date(driver.updatedAt).toLocaleString()}</div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <Label>{$_('drivers.fields.risk')}</Label>
                  <Select bind:value={patchRisk} disabled={!canEdit}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </Select>
                </div>
                <div class="space-y-1">
                  <Label>{$_('drivers.fields.tags')}</Label>
                  <Input bind:value={patchTags} disabled={!canEdit} placeholder="printer, wifi, chipset" />
                </div>
              </div>

              <div class="space-y-1">
                <Label>{$_('drivers.fields.compatibilityNotes')}</Label>
                <Textarea rows={4} bind:value={patchNotes} disabled={!canEdit} />
              </div>
            </Card>

            <Card size="none" class="space-y-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('drivers.fields.links')}</div>
              <div class="space-y-1">
                <Label>vendorUrl</Label>
                <Input bind:value={vendorUrl} disabled={!canEdit} placeholder="https://vendor.example.com" />
              </div>
              <div class="space-y-1">
                <Label>releaseNotesUrl</Label>
                <Input bind:value={releaseNotesUrl} disabled={!canEdit} placeholder="https://vendor.example.com/release-notes" />
              </div>
              <div class="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('drivers.fields.installDetect')}</div>
                <div class="space-y-1">
                  <Label>{$_('drivers.fields.silentInstallCmd')}</Label>
                  <Input bind:value={silentInstallCmd} disabled={!canEdit} placeholder="msiexec /i ..." />
                </div>
                <div class="space-y-1">
                  <Label>{$_('drivers.fields.silentUninstallCmd')}</Label>
                  <Input bind:value={silentUninstallCmd} disabled={!canEdit} placeholder="msiexec /x ..." />
                </div>
              </div>
            </Card>
          </div>
        </TabItem>

        <TabItem open={activeTab === 'files'} onclick={() => (activeTab = 'files')} title={$_('drivers.tabs.files')}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card size="none" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('drivers.files.title')}</div>
                  <div class="text-xs text-slate-500">{$_('drivers.files.subtitle')}</div>
                </div>
                {#if driver.file?.storageKey && driver.approval.status === 'approved' && driver.supportStatus !== 'blocked'}
                  <Button size="xs" color="light" onclick={handleDownload}><Download class="w-4 h-4 mr-1" />{$_('drivers.download')}</Button>
                {/if}
              </div>

              {#if driver.file?.storageKey}
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm space-y-1">
                  <div class="font-semibold">{driver.file.filename}</div>
                  <div class="text-xs text-slate-500">sha256: <span class="font-mono">{driver.file.sha256 || '-'}</span></div>
                  <div class="text-xs text-slate-500">{$_('drivers.files.size')}: {driver.file.size} bytes</div>
                </div>
              {:else}
                <div class="text-sm text-slate-500">{$_('drivers.files.empty')}</div>
              {/if}

              {#if canEdit}
                <div class="space-y-2">
                  <Label>{$_('drivers.files.upload')}</Label>
                  <input
                    type="file"
                    class="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    onchange={(e) => {
                      const file = (e.currentTarget as HTMLInputElement).files?.[0];
                      if (file) void handleUpload(file);
                    }}
                    aria-label="Upload driver file"
                    disabled={fileBusy}
                  />
                  {#if fileBusy}
                    <div class="text-xs text-slate-500 inline-flex items-center gap-2"><Spinner size="4" /> {$_('common.loading')}</div>
                  {/if}
                </div>
              {/if}
            </Card>

            <Card size="none" class="space-y-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('drivers.approval.title')}</div>
              <div class="flex flex-wrap gap-2 items-center">
                <Badge color={badgeColorForApproval()} class="capitalize">{driver.approval.status}</Badge>
                {#if driver.approval.approvedAt}
                  <span class="text-xs text-slate-500">{new Date(driver.approval.approvedAt).toLocaleString()}</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2">
                <Button size="xs" onclick={submitForApproval} disabled={actionBusy || isApproved || isPending || !hasFile}>
                  <ShieldAlert class="w-4 h-4 mr-1" /> {$_('drivers.approval.submit')}
                </Button>
                <Button size="xs" color="light" onclick={() => openAction('approve')} disabled={!isPending || actionBusy}>
                  {$_('drivers.approval.approve')}
                </Button>
                <Button size="xs" color="light" onclick={() => openAction('reject')} disabled={!isPending || actionBusy}>
                  {$_('drivers.approval.reject')}
                </Button>
              </div>
              <div class="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <div class="text-sm font-semibold">{$_('drivers.danger.title')}</div>
                <div class="flex flex-wrap gap-2">
                  <Button size="xs" color="light" onclick={() => openAction('block')} disabled={driver.supportStatus === 'blocked' || actionBusy}>
                    {$_('drivers.danger.block')}
                  </Button>
                  <Button size="xs" color="light" onclick={() => openAction('unblock')} disabled={driver.supportStatus !== 'blocked' || actionBusy}>
                    {$_('drivers.danger.unblock')}
                  </Button>
                  <Button size="xs" color="red" onclick={() => openAction('delete')} disabled={actionBusy}>
                    {$_('common.delete')}
                  </Button>
                </div>
              </div>
              {#if actionError}
                <Alert color="red">{actionError}</Alert>
              {/if}
            </Card>
          </div>
        </TabItem>

        <TabItem open={activeTab === 'approval'} onclick={() => (activeTab = 'approval')} title={$_('drivers.tabs.approval')}>
          <Card size="none" class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-slate-500">{$_('drivers.fields.approval')}</div>
                <div class="font-semibold capitalize">{driver.approval.status}</div>
              </div>
              <div>
                <div class="text-slate-500">{$_('drivers.fields.support')}</div>
                <div class="font-semibold capitalize">{driver.supportStatus}</div>
              </div>
              <div class="md:col-span-2">
                <div class="text-slate-500">{$_('drivers.fields.approvalReason')}</div>
                <div class="text-xs">{driver.approval.reason || '-'}</div>
              </div>
            </div>
          </Card>
        </TabItem>

        <TabItem open={activeTab === 'audit'} onclick={() => (activeTab = 'audit')} title={$_('drivers.tabs.audit')}>
          <Card size="none" class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('drivers.audit.title')}</div>
                <div class="text-xs text-slate-500">{$_('drivers.audit.subtitle')}</div>
              </div>
              <Button size="xs" color="light" onclick={() => void loadAudit()}>{$_('common.refresh')}</Button>
            </div>
            {#if auditLoading}
              <div class="flex justify-center py-6"><Spinner size="6" /></div>
            {:else if audit.length === 0}
              <div class="text-sm text-slate-500">{$_('drivers.audit.empty')}</div>
            {:else}
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-200">
                    <tr>
                      <th class="px-3 py-2 text-left">{$_('drivers.audit.time')}</th>
                      <th class="px-3 py-2 text-left">{$_('drivers.audit.action')}</th>
                      <th class="px-3 py-2 text-left">{$_('drivers.audit.details')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                    {#each audit as entry (entry.id)}
                      <tr>
                        <td class="px-3 py-2 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                        <td class="px-3 py-2 font-mono text-xs">{entry.action}</td>
                        <td class="px-3 py-2 text-xs">
                          <pre class="whitespace-pre-wrap font-mono text-[11px] text-slate-600 dark:text-slate-200">{JSON.stringify(entry.details ?? {}, null, 2)}</pre>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </Card>
        </TabItem>
      </Tabs>
    </Card>
  {/if}
</div>

<Modal open={actionModal !== null} size="lg" autoclose={false} onclose={() => (actionModal = null)}>
  <div class="space-y-4 p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('drivers.actions.title')}</h2>
        <p class="text-sm text-slate-500">{actionModal ?? ''}</p>
      </div>
      <Badge color="yellow">{$_('drivers.danger.badge')}</Badge>
    </div>

    {#if actionError}
      <Alert color="red">{actionError}</Alert>
    {/if}

    <div class="space-y-1">
      <Label>{$_('drivers.actions.reason')}</Label>
      <Textarea rows={3} bind:value={actionReason} placeholder={$_('drivers.actions.reasonPlaceholder')} />
      {#if actionModal === 'approve' && (driver?.riskLevel === 'high' || driver?.riskLevel === 'critical')}
        <div class="text-xs text-amber-600">{$_('drivers.actions.reasonRequiredHighRisk')}</div>
      {/if}
      {#if actionModal === 'reject' || actionModal === 'block' || actionModal === 'unblock'}
        <div class="text-xs text-amber-600">{$_('drivers.actions.reasonRequired')}</div>
      {/if}
      {#if actionModal === 'delete' && driver?.approval.status === 'approved'}
        <div class="text-xs text-amber-600">{$_('drivers.actions.reasonRequiredApprovedDelete')}</div>
      {/if}
    </div>

    {#if actionModal === 'approve' || actionModal === 'reject'}
      <div class="space-y-1">
        <Label>{$_('drivers.actions.noteOptional')}</Label>
        <Input bind:value={actionNote} placeholder={$_('drivers.actions.notePlaceholder')} />
      </div>
    {/if}

    <div class="flex justify-end gap-2">
      <Button color="light" onclick={() => (actionModal = null)} disabled={actionBusy}>{$_('common.cancel')}</Button>
      <Button
        color={actionModal === 'delete' ? 'red' : 'primary'}
        onclick={confirmAction}
        disabled={actionBusy || (actionModal === 'reject' && actionReason.trim().length === 0) || (actionModal === 'block' && actionReason.trim().length === 0) || (actionModal === 'unblock' && actionReason.trim().length === 0) || (actionModal === 'approve' && (driver?.riskLevel === 'high' || driver?.riskLevel === 'critical') && actionReason.trim().length === 0) || (actionModal === 'delete' && driver?.approval.status === 'approved' && actionReason.trim().length === 0)}
      >
        {actionBusy ? $_('common.submitting') : $_('common.confirm')}
      </Button>
    </div>
  </div>
</Modal>
