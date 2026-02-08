<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner } from 'flowbite-svelte';
  import { Plus, RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    bulkDocuments,
    createDocument,
    deleteDocument,
    listDocuments,
    type BulkDocumentsInput,
    type ApprovalStatus,
    type BulkDocumentsAction,
    type Document,
    type DocumentContentType,
    type DocumentType,
    type DocumentVisibility
  } from '$lib/api/docs';

  type SortKey = 'updatedAt' | 'title' | 'type';

  let items = $state<Document[]>([]);
  let loading = $state(true);
  let error = $state('');
  let meta = $state({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

  let q = $state('');
  let type = $state<DocumentType | ''>('');
  let visibility = $state<DocumentVisibility | ''>('');
  let status = $state<ApprovalStatus | ''>('');
  let sort = $state<SortKey>('updatedAt');

  let selected = $state<Record<string, boolean>>({});
  const selectedIds = $derived.by(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id));
  const selectedCount = $derived(selectedIds.length);

  let bulkAction = $state<BulkDocumentsAction>('submitApproval');
  let bulkTag = $state('');
  let bulkVisibility = $state<DocumentVisibility>('team');
  let bulkReason = $state('');
  let bulkBusy = $state(false);
  let bulkError = $state('');

  let showCreate = $state(false);
  let createBusy = $state(false);
  let createError = $state('');

  let newTitle = $state('');
  let newType = $state<DocumentType>('other');
  let newContentType = $state<DocumentContentType>('file');
  let newVisibility = $state<DocumentVisibility>('team');

  const createValid = $derived.by(() => newTitle.trim().length > 0);

  function badgeColorForApproval(value: ApprovalStatus): 'dark' | 'blue' | 'green' | 'red' | 'yellow' {
    if (value === 'approved') return 'green';
    if (value === 'pending') return 'yellow';
    if (value === 'rejected') return 'red';
    return 'dark';
  }

  function badgeColorForVisibility(value: DocumentVisibility): 'dark' | 'blue' | 'purple' | 'indigo' {
    if (value === 'org') return 'purple';
    if (value === 'department') return 'indigo';
    if (value === 'team') return 'blue';
    return 'dark';
  }

  async function load(pageNumber = 1) {
    try {
      loading = true;
      error = '';
      const response = await listDocuments({
        q: q || undefined,
        type: type || undefined,
        visibility: visibility || undefined,
        status: status || undefined,
        sort,
        page: pageNumber,
        pageSize: meta.pageSize
      });
      items = response.data ?? [];
      meta = response.meta ?? meta;
      selected = {};
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load documents';
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
      const payload: BulkDocumentsInput = { action: bulkAction, ids: selectedIds };
      if (bulkAction === 'tag/add' || bulkAction === 'tag/remove') payload.tag = bulkTag.trim();
      if (bulkAction === 'setVisibility') {
        payload.visibility = bulkVisibility;
        if (bulkVisibility === 'org') payload.reason = bulkReason.trim();
      }
      if (bulkAction === 'delete') payload.reason = bulkReason.trim();
      await bulkDocuments(payload);
      bulkTag = '';
      bulkReason = '';
      await load(meta.page);
    } catch (err) {
      bulkError = err instanceof Error ? err.message : 'Bulk action failed';
    } finally {
      bulkBusy = false;
    }
  }

  async function handleDelete(item: Document) {
    const reason = item.approval.status === 'approved' ? prompt($_('docs.danger.deleteApprovedReason')) : prompt($_('docs.danger.deleteReason'));
    if (reason === null) return;
    try {
      await deleteDocument(item.id, reason.trim() || undefined);
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
      const created = await createDocument({
        title: newTitle.trim(),
        type: newType,
        contentType: newContentType,
        visibility: newVisibility
      });
      showCreate = false;
      if (typeof window !== 'undefined') window.location.assign(`/admin/docs/${created.id}`);
    } catch (err) {
      createError = err instanceof Error ? err.message : 'Create failed';
    } finally {
      createBusy = false;
    }
  }

  onMount(() => {
    void load(1);
  });
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Documents' : $_('docs.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {$isLoading ? 'SOPs, templates, and operational docs with approval workflow.' : $_('docs.subtitle')}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button color="light" onclick={() => void load(meta.page)}><RefreshCw class="w-4 h-4 mr-1" />{$_('common.refresh')}</Button>
      <Button onclick={() => (showCreate = true)}><Plus class="w-4 h-4 mr-1" />{$_('docs.new')}</Button>
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
            <Input bind:value={q} placeholder={$_('docs.filters.searchPlaceholder')} />
            <Button color="light" onclick={() => void load(1)} aria-label="Search"><Search class="w-4 h-4" /></Button>
          </div>
        </div>
        <div class="space-y-1">
          <Label>{$_('docs.fields.type')}</Label>
          <Select bind:value={type}>
            <option value="">{$_('common.all')}</option>
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
          <Select bind:value={visibility}>
            <option value="">{$_('common.all')}</option>
            <option value="private">private</option>
            <option value="team">team</option>
            <option value="department">department</option>
            <option value="org">org</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$_('docs.fields.approval')}</Label>
          <Select bind:value={status}>
            <option value="">{$_('common.all')}</option>
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </Select>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-start lg:justify-end">
        <Button color="light" onclick={() => { q=''; type=''; visibility=''; status=''; sort='updatedAt'; void load(1); }}>
          {$_('common.reset')}
        </Button>
        <Button onclick={() => void load(1)}>{$_('common.apply')}</Button>
      </div>
    </div>

    {#if selectedCount > 0}
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
        <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {selectedCount} {$_('common.selected')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_auto] gap-2 items-end">
          <div class="space-y-1">
            <Label>{$_('common.actions')}</Label>
            <Select bind:value={bulkAction}>
              <option value="submitApproval">submitApproval</option>
              <option value="tag/add">tag/add</option>
              <option value="tag/remove">tag/remove</option>
              <option value="setVisibility">setVisibility</option>
              <option value="delete">delete</option>
            </Select>
          </div>

          <div class="space-y-1">
            {#if bulkAction === 'tag/add' || bulkAction === 'tag/remove'}
              <Label>{$_('docs.bulk.tag')}</Label>
              <Input bind:value={bulkTag} placeholder="sop / checklist / netops" />
            {:else if bulkAction === 'setVisibility'}
              <Label>{$_('docs.fields.visibility')}</Label>
              <Select bind:value={bulkVisibility}>
                <option value="private">private</option>
                <option value="team">team</option>
                <option value="department">department</option>
                <option value="org">org</option>
              </Select>
              {#if bulkVisibility === 'org'}
                <div class="mt-2 space-y-1">
                  <Label>{$_('docs.bulk.reason')}</Label>
                  <Input bind:value={bulkReason} placeholder={$_('docs.bulk.reasonPlaceholderOrg')} />
                </div>
              {/if}
            {:else if bulkAction === 'delete'}
              <Label>{$_('docs.bulk.reason')}</Label>
              <Input bind:value={bulkReason} placeholder={$_('docs.bulk.reasonPlaceholderDelete')} />
            {:else}
              <div class="text-xs text-slate-500">{$_('docs.bulk.noExtra')}</div>
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
            <th class="px-3 py-2 text-left">{$_('docs.columns.title')}</th>
            <th class="px-3 py-2 text-left">{$_('docs.columns.type')}</th>
            <th class="px-3 py-2 text-left">{$_('docs.columns.visibility')}</th>
            <th class="px-3 py-2 text-left">{$_('docs.columns.approval')}</th>
            <th class="px-3 py-2 text-left">{$_('docs.columns.updated')}</th>
            <th class="px-3 py-2 text-right">{$_('common.actions')}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#if loading}
            <tr>
              <td colspan="7" class="px-3 py-10 text-center">
                <Spinner size="6" />
              </td>
            </tr>
          {:else if items.length === 0}
            <tr>
              <td colspan="7" class="px-3 py-10 text-center text-slate-500">{$_('common.noData')}</td>
            </tr>
          {:else}
            {#each items as item (item.id)}
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td class="px-3 py-2">
                  <input type="checkbox" bind:checked={selected[item.id]} aria-label={`Select ${item.title}`} />
                </td>
                <td class="px-3 py-2">
                  <div class="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                  <div class="text-xs text-slate-500">{item.summary || '-'}</div>
                </td>
                <td class="px-3 py-2">
                  <Badge color="blue" class="capitalize">{item.type}</Badge>
                </td>
                <td class="px-3 py-2">
                  <Badge color={badgeColorForVisibility(item.visibility)} class="capitalize">{item.visibility}</Badge>
                </td>
                <td class="px-3 py-2">
                  <Badge color={badgeColorForApproval(item.approval.status)} class="capitalize">{item.approval.status}</Badge>
                </td>
                <td class="px-3 py-2 text-xs text-slate-500">{new Date(item.updatedAt).toLocaleString()}</td>
                <td class="px-3 py-2">
                  <div class="flex justify-end gap-2">
                    <a
                      class="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      href={`/admin/docs/${item.id}`}
                    >
                      {$_('common.view')}
                    </a>
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
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('docs.create.title')}</h2>
      <p class="text-sm text-slate-500">{$_('docs.create.subtitle')}</p>
    </div>

    {#if createError}
      <Alert color="red">{createError}</Alert>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1 md:col-span-2">
        <Label>{$_('docs.fields.title')}</Label>
        <Input bind:value={newTitle} placeholder="SOP: Printer onboarding" />
      </div>
      <div class="space-y-1">
        <Label>{$_('docs.fields.type')}</Label>
        <Select bind:value={newType}>
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
        <Label>{$_('docs.fields.contentType')}</Label>
        <Select bind:value={newContentType}>
          <option value="file">file</option>
          <option value="markdown">markdown</option>
          <option value="link">link</option>
        </Select>
      </div>
      <div class="space-y-1">
        <Label>{$_('docs.fields.visibility')}</Label>
        <Select bind:value={newVisibility}>
          <option value="private">private</option>
          <option value="team">team</option>
          <option value="department">department</option>
          <option value="org">org</option>
        </Select>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button color="light" onclick={() => (showCreate = false)} disabled={createBusy}>{$_('common.cancel')}</Button>
      <Button onclick={handleCreate} disabled={createBusy || !createValid}>{createBusy ? $_('common.submitting') : $_('common.create')}</Button>
    </div>
  </div>
</Modal>
