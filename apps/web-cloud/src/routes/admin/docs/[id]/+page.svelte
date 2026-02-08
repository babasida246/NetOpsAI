<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner, TabItem, Tabs, Textarea } from 'flowbite-svelte';
  import { ArrowLeft, Download, Link as LinkIcon, RefreshCw, ShieldAlert } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { listAuditLogs, type AuditLogEntry } from '$lib/api/audit';
  import {
    approveDocument,
    deleteDocument,
    downloadDocumentFile,
    getDocument,
    rejectDocument,
    submitDocumentApproval,
    updateDocument,
    uploadDocumentFile,
    type Document,
    type DocumentContentType,
    type DocumentType,
    type DocumentVisibility
  } from '$lib/api/docs';

  type ActionKind = 'approve' | 'reject' | 'delete';

  const docId = $derived(page.params.id);

  let doc = $state<Document | null>(null);
  let loading = $state(true);
  let error = $state('');

  let saving = $state(false);
  let fileBusy = $state(false);

  let activeTab = $state<'overview' | 'content' | 'files' | 'relations' | 'approval' | 'audit'>('overview');

  let audit = $state<AuditLogEntry[]>([]);
  let auditLoading = $state(false);

  // Editable fields (draft/pending only).
  let patchTitle = $state('');
  let patchSummary = $state('');
  let patchType = $state<DocumentType>('other');
  let patchVisibility = $state<DocumentVisibility>('team');
  let patchContentType = $state<DocumentContentType>('file');
  let patchMarkdown = $state('');
  let patchExternalUrl = $state('');
  let patchTags = $state('');

  let relatedAssetsText = $state('');
  let relatedModelsText = $state('');
  let relatedSitesText = $state('');
  let relatedServicesText = $state('');

  const isApproved = $derived.by(() => doc?.approval.status === 'approved');
  const isPending = $derived.by(() => doc?.approval.status === 'pending');
  const canEdit = $derived.by(() => !!doc && doc.approval.status !== 'approved');

  let actionModal = $state<ActionKind | null>(null);
  let actionReason = $state('');
  let actionNote = $state('');
  let actionBusy = $state(false);
  let actionError = $state('');

  function badgeColorForApproval(): 'dark' | 'green' | 'yellow' | 'red' {
    const status = doc?.approval.status ?? 'draft';
    if (status === 'approved') return 'green';
    if (status === 'pending') return 'yellow';
    if (status === 'rejected') return 'red';
    return 'dark';
  }

  function badgeColorForVisibility(value: DocumentVisibility): 'dark' | 'blue' | 'purple' | 'indigo' {
    if (value === 'org') return 'purple';
    if (value === 'department') return 'indigo';
    if (value === 'team') return 'blue';
    return 'dark';
  }

  function initEditable(next: Document) {
    patchTitle = next.title ?? '';
    patchSummary = next.summary ?? '';
    patchType = next.type;
    patchVisibility = next.visibility;
    patchContentType = next.contentType;
    patchMarkdown = next.markdown ?? '';
    patchExternalUrl = next.externalUrl ?? '';
    patchTags = (next.tags ?? []).join(', ');

    relatedAssetsText = (next.scope.relatedAssets ?? []).join('\n');
    relatedModelsText = (next.scope.relatedModels ?? []).map((m) => `${m.vendor}|${m.model}`).join('\n');
    relatedSitesText = (next.scope.relatedSites ?? []).join('\n');
    relatedServicesText = (next.scope.relatedServices ?? []).join('\n');
  }

  async function load() {
    if (!docId) return;
    try {
      loading = true;
      error = '';
      const next = await getDocument(docId);
      doc = next;
      initEditable(next);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load document';
      doc = null;
    } finally {
      loading = false;
    }
  }

  async function loadAudit() {
    if (!docId) return;
    auditLoading = true;
    try {
      const response = await listAuditLogs({ resource: 'docs', resourceId: docId, limit: 50, page: 1 });
      audit = response.data ?? [];
    } catch {
      audit = [];
    } finally {
      auditLoading = false;
    }
  }

  async function save() {
    if (!doc || !canEdit) return;
    saving = true;
    error = '';
    try {
      const tags = patchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const relatedAssets = relatedAssetsText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const relatedModels = relatedModelsText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((line) => {
          const [vendor, model] = line.split('|', 2);
          return { vendor: (vendor ?? '').trim(), model: (model ?? '').trim() };
        })
        .filter((m) => m.vendor && m.model);

      const relatedSites = relatedSitesText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const relatedServices = relatedServicesText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const updated = await updateDocument(doc.id, {
        title: patchTitle.trim(),
        summary: patchSummary.trim() || undefined,
        type: patchType,
        visibility: patchVisibility,
        contentType: patchContentType,
        markdown: patchContentType === 'markdown' ? patchMarkdown : undefined,
        externalUrl: patchContentType === 'link' ? patchExternalUrl : undefined,
        tags,
        scope: { relatedAssets, relatedModels, relatedSites, relatedServices }
      });
      doc = updated;
      initEditable(updated);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function handleUpload(file: File) {
    if (!doc) return;
    fileBusy = true;
    error = '';
    try {
      const updated = await uploadDocumentFile(doc.id, file);
      doc = updated;
      initEditable(updated);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      fileBusy = false;
    }
  }

  async function handleDownload(fileId: string) {
    if (!doc) return;
    try {
      await downloadDocumentFile(doc.id, fileId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Download failed';
    }
  }

  async function submitForApproval() {
    if (!doc) return;
    actionBusy = true;
    actionError = '';
    try {
      const updated = await submitDocumentApproval(doc.id);
      doc = updated;
      initEditable(updated);
      void loadAudit();
    } catch (err) {
      actionError = err instanceof Error ? err.message : 'Submit failed';
    } finally {
      actionBusy = false;
    }
  }

  function openAction(kind: ActionKind) {
    actionModal = kind;
    actionReason = '';
    actionNote = '';
    actionError = '';
  }

  async function confirmAction() {
    if (!doc || !actionModal) return;
    actionBusy = true;
    actionError = '';
    try {
      if (actionModal === 'approve') {
        const updated = await approveDocument(doc.id, { reason: actionReason.trim() || undefined, note: actionNote.trim() || undefined });
        doc = updated;
        initEditable(updated);
      } else if (actionModal === 'reject') {
        const updated = await rejectDocument(doc.id, { reason: actionReason.trim(), note: actionNote.trim() || undefined });
        doc = updated;
        initEditable(updated);
      } else if (actionModal === 'delete') {
        await deleteDocument(doc.id, actionReason.trim() || undefined);
        if (typeof window !== 'undefined') window.location.assign('/admin/docs');
      }

      actionModal = null;
      void loadAudit();
    } catch (err) {
      actionError = err instanceof Error ? err.message : 'Action failed';
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
        href="/admin/docs"
        class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <ArrowLeft class="w-4 h-4" /> {$_('common.back')}
      </a>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{$_('docs.detailTitle')}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{$_('docs.detailSubtitle')}</p>
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
  {:else if doc}
    <Card size="none" class="w-full space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</div>
          <div class="text-xs text-slate-500 font-mono">{doc.id}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge color={badgeColorForApproval()} class="capitalize">{doc.approval.status}</Badge>
          <Badge color={badgeColorForVisibility(doc.visibility)} class="capitalize">{doc.visibility}</Badge>
          <Badge color="blue" class="capitalize">{doc.type}</Badge>
        </div>
      </div>

      <Tabs>
        <TabItem open={activeTab === 'overview'} onclick={() => (activeTab = 'overview')} title={$_('common.details')}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card size="none" class="lg:col-span-2 space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1 md:col-span-2">
                  <Label>{$_('docs.fields.title')}</Label>
                  <Input bind:value={patchTitle} disabled={!canEdit} />
                </div>
                <div class="space-y-1 md:col-span-2">
                  <Label>{$_('docs.fields.summary')}</Label>
                  <Textarea rows={2} bind:value={patchSummary} disabled={!canEdit} />
                </div>
                <div class="space-y-1">
                  <Label>{$_('docs.fields.type')}</Label>
                  <Select bind:value={patchType} disabled={!canEdit}>
                    <option value="sop">sop</option>
                    <option value="howto">howto</option>
                    <option value="policy">policy</option>
                    <option value="template">template</option>
                    <option value="diagram">diagram</option>
                    <option value="report">report</option>
                    <option value="certificate">certificate</option>
                    <option value="other">other</option>
                  </Select>
                </div>
                <div class="space-y-1">
                  <Label>{$_('docs.fields.visibility')}</Label>
                  <Select bind:value={patchVisibility} disabled={!canEdit}>
                    <option value="private">private</option>
                    <option value="team">team</option>
                    <option value="department">department</option>
                    <option value="org">org</option>
                  </Select>
                </div>
                <div class="space-y-1">
                  <Label>{$_('docs.fields.contentType')}</Label>
                  <Select bind:value={patchContentType} disabled={!canEdit}>
                    <option value="file">file</option>
                    <option value="markdown">markdown</option>
                    <option value="link">link</option>
                  </Select>
                </div>
                <div class="space-y-1">
                  <Label>{$_('docs.fields.tags')}</Label>
                  <Input bind:value={patchTags} disabled={!canEdit} placeholder="sop, checklist, printer" />
                </div>
              </div>
            </Card>

            <Card size="none" class="space-y-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('docs.approval.title')}</div>
              <div class="flex flex-wrap gap-2 items-center">
                <Badge color={badgeColorForApproval()} class="capitalize">{doc.approval.status}</Badge>
                {#if doc.approval.approvedAt}
                  <span class="text-xs text-slate-500">{new Date(doc.approval.approvedAt).toLocaleString()}</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2">
                <Button size="xs" onclick={submitForApproval} disabled={actionBusy || isApproved || isPending}>
                  <ShieldAlert class="w-4 h-4 mr-1" /> {$_('docs.approval.submit')}
                </Button>
                <Button size="xs" color="light" onclick={() => openAction('approve')} disabled={!isPending || actionBusy}>
                  {$_('docs.approval.approve')}
                </Button>
                <Button size="xs" color="light" onclick={() => openAction('reject')} disabled={!isPending || actionBusy}>
                  {$_('docs.approval.reject')}
                </Button>
              </div>
              <div class="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <div class="text-sm font-semibold">{$_('docs.danger.title')}</div>
                <Button size="xs" color="red" onclick={() => openAction('delete')} disabled={actionBusy}>{$_('common.delete')}</Button>
              </div>
              {#if actionError}
                <Alert color="red">{actionError}</Alert>
              {/if}
            </Card>
          </div>
        </TabItem>

        <TabItem open={activeTab === 'content'} onclick={() => (activeTab = 'content')} title={$_('docs.tabs.content')}>
          <Card size="none" class="space-y-3">
            {#if patchContentType === 'markdown'}
              <div class="space-y-1">
                <Label>{$_('docs.fields.markdown')}</Label>
                <Textarea rows={14} bind:value={patchMarkdown} disabled={!canEdit} class="font-mono text-xs" />
              </div>
            {:else if patchContentType === 'link'}
              <div class="space-y-1">
                <Label>{$_('docs.fields.externalUrl')}</Label>
                <Input bind:value={patchExternalUrl} disabled={!canEdit} placeholder="https://..." />
              </div>
              {#if patchExternalUrl}
                <a
                  class="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                  href={patchExternalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon class="w-4 h-4" /> {$_('docs.openLink')}
                </a>
              {/if}
            {:else}
              <div class="text-sm text-slate-500">{$_('docs.files.help')}</div>
            {/if}
          </Card>
        </TabItem>

        <TabItem open={activeTab === 'files'} onclick={() => (activeTab = 'files')} title={$_('docs.tabs.files')}>
          <Card size="none" class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('docs.files.title')}</div>
                <div class="text-xs text-slate-500">{$_('docs.files.subtitle')}</div>
              </div>
              {#if canEdit && patchContentType === 'file'}
                <input
                  type="file"
                  class="block w-full sm:w-auto text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  onchange={(e) => {
                    const file = (e.currentTarget as HTMLInputElement).files?.[0];
                    if (file) void handleUpload(file);
                  }}
                  aria-label="Upload document file"
                  disabled={fileBusy}
                />
              {/if}
            </div>

            {#if fileBusy}
              <div class="text-xs text-slate-500 inline-flex items-center gap-2"><Spinner size="4" /> {$_('common.loading')}</div>
            {/if}

            {#if doc.files.length === 0}
              <div class="text-sm text-slate-500">{$_('docs.files.empty')}</div>
            {:else}
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-200">
                    <tr>
                      <th class="px-3 py-2 text-left">{$_('docs.files.filename')}</th>
                      <th class="px-3 py-2 text-left">sha256</th>
                      <th class="px-3 py-2 text-right">{$_('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                    {#each doc.files as file (file.id)}
                      <tr>
                        <td class="px-3 py-2 font-semibold">{file.filename}</td>
                        <td class="px-3 py-2 text-xs font-mono text-slate-500">{file.sha256 || '-'}</td>
                        <td class="px-3 py-2">
                          <div class="flex justify-end">
                            <Button size="xs" color="light" onclick={() => void handleDownload(file.id)}>
                              <Download class="w-4 h-4 mr-1" /> {$_('docs.files.download')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </Card>
        </TabItem>

        <TabItem open={activeTab === 'relations'} onclick={() => (activeTab = 'relations')} title={$_('docs.tabs.relations')}>
          <Card size="none" class="space-y-4">
            <div class="text-sm text-slate-500">{$_('docs.relations.help')}</div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>{$_('docs.relations.assets')}</Label>
                <Textarea rows={6} bind:value={relatedAssetsText} disabled={!canEdit} placeholder="asset UUID per line" class="font-mono text-xs" />
              </div>
              <div class="space-y-1">
                <Label>{$_('docs.relations.models')}</Label>
                <Textarea rows={6} bind:value={relatedModelsText} disabled={!canEdit} placeholder="Vendor|Model per line" class="font-mono text-xs" />
              </div>
              <div class="space-y-1">
                <Label>{$_('docs.relations.sites')}</Label>
                <Textarea rows={4} bind:value={relatedSitesText} disabled={!canEdit} placeholder="siteId per line" class="font-mono text-xs" />
              </div>
              <div class="space-y-1">
                <Label>{$_('docs.relations.services')}</Label>
                <Textarea rows={4} bind:value={relatedServicesText} disabled={!canEdit} placeholder="serviceId per line" class="font-mono text-xs" />
              </div>
            </div>
          </Card>
        </TabItem>

        <TabItem open={activeTab === 'approval'} onclick={() => (activeTab = 'approval')} title={$_('docs.tabs.approval')}>
          <Card size="none" class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-slate-500">{$_('docs.fields.approval')}</div>
                <div class="font-semibold capitalize">{doc.approval.status}</div>
              </div>
              <div>
                <div class="text-slate-500">{$_('docs.fields.visibility')}</div>
                <div class="font-semibold capitalize">{doc.visibility}</div>
              </div>
              <div class="md:col-span-2">
                <div class="text-slate-500">{$_('docs.fields.approvalReason')}</div>
                <div class="text-xs">{doc.approval.reason || '-'}</div>
              </div>
            </div>
          </Card>
        </TabItem>

        <TabItem open={activeTab === 'audit'} onclick={() => (activeTab = 'audit')} title={$_('docs.tabs.audit')}>
          <Card size="none" class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('docs.audit.title')}</div>
                <div class="text-xs text-slate-500">{$_('docs.audit.subtitle')}</div>
              </div>
              <Button size="xs" color="light" onclick={() => void loadAudit()}>{$_('common.refresh')}</Button>
            </div>
            {#if auditLoading}
              <div class="flex justify-center py-6"><Spinner size="6" /></div>
            {:else if audit.length === 0}
              <div class="text-sm text-slate-500">{$_('docs.audit.empty')}</div>
            {:else}
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-200">
                    <tr>
                      <th class="px-3 py-2 text-left">{$_('docs.audit.time')}</th>
                      <th class="px-3 py-2 text-left">{$_('docs.audit.action')}</th>
                      <th class="px-3 py-2 text-left">{$_('docs.audit.details')}</th>
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
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('docs.actions.title')}</h2>
        <p class="text-sm text-slate-500">{actionModal ?? ''}</p>
      </div>
      <Badge color="yellow">{$_('docs.danger.badge')}</Badge>
    </div>

    {#if actionError}
      <Alert color="red">{actionError}</Alert>
    {/if}

    <div class="space-y-1">
      <Label>{$_('docs.actions.reason')}</Label>
      <Textarea rows={3} bind:value={actionReason} placeholder={$_('docs.actions.reasonPlaceholder')} />
      {#if actionModal === 'approve' && doc?.visibility === 'org'}
        <div class="text-xs text-amber-600">{$_('docs.actions.reasonRequiredOrg')}</div>
      {/if}
      {#if actionModal === 'reject'}
        <div class="text-xs text-amber-600">{$_('docs.actions.reasonRequired')}</div>
      {/if}
      {#if actionModal === 'delete' && doc?.approval.status === 'approved'}
        <div class="text-xs text-amber-600">{$_('docs.actions.reasonRequiredApprovedDelete')}</div>
      {/if}
    </div>

    {#if actionModal === 'approve' || actionModal === 'reject'}
      <div class="space-y-1">
        <Label>{$_('docs.actions.noteOptional')}</Label>
        <Input bind:value={actionNote} placeholder={$_('docs.actions.notePlaceholder')} />
      </div>
    {/if}

    <div class="flex justify-end gap-2">
      <Button color="light" onclick={() => (actionModal = null)} disabled={actionBusy}>{$_('common.cancel')}</Button>
      <Button
        color={actionModal === 'delete' ? 'red' : 'primary'}
        onclick={confirmAction}
        disabled={actionBusy || (actionModal === 'reject' && actionReason.trim().length === 0) || (actionModal === 'approve' && doc?.visibility === 'org' && actionReason.trim().length === 0) || (actionModal === 'delete' && doc?.approval.status === 'approved' && actionReason.trim().length === 0)}
      >
        {actionBusy ? $_('common.submitting') : $_('common.confirm')}
      </Button>
    </div>
  </div>
</Modal>
