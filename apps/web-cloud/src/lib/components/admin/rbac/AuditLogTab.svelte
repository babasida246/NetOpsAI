<script lang="ts">
  import { Alert, Badge, Button, Card, Checkbox, Input, Modal, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { _ } from '$lib/i18n';
  import type { AuditEvent, Group, Role, User } from '$lib/rbac/types';

  type Props = {
    events: AuditEvent[];
    roles: Role[];
    groups: Group[];
    users: User[];
  };

  let { events, roles, groups, users }: Props = $props();

  let query = $state('');
  let dangerousOnly = $state(false);
  let selected = $state<AuditEvent | null>(null);
  let openDetail = $state(false);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => (dangerousOnly ? event.dangerous : true))
      .filter((event) => {
        if (!q) return true;
        const haystack = `${event.actorEmail} ${event.action} ${event.target.type}:${event.target.id} ${event.reason ?? ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  });

  function openEvent(event: AuditEvent) {
    selected = event;
    openDetail = true;
  }

  function prettyJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div class="text-lg font-semibold text-slate-900 dark:text-white">{$_('adminRbac.audit.title')}</div>
      <div class="text-sm text-slate-500 dark:text-slate-400">{$_('adminRbac.audit.subtitle')}</div>
    </div>
    <div class="flex items-center gap-2">
      <label class="inline-flex items-center gap-2 text-sm">
        <Checkbox bind:checked={dangerousOnly} />
        <span class="text-xs text-slate-600 dark:text-slate-300">{$_('adminRbac.audit.filters.dangerousOnly')}</span>
      </label>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
    <div class="lg:col-span-2">
      <label class="text-xs font-semibold text-slate-600 dark:text-slate-300" for="rbac-audit-search">
        {$_('adminRbac.audit.filters.search')}
      </label>
      <Input id="rbac-audit-search" bind:value={query} placeholder={$_('adminRbac.audit.filters.searchPlaceholder')} />
    </div>
    <div class="flex items-end gap-2">
      <Badge color="none">{filtered.length} {$_('adminRbac.audit.count')}</Badge>
    </div>
  </div>

  <Card class="min-w-0">
    {#if filtered.length === 0}
      <Alert color="light">{$_('adminRbac.audit.empty')}</Alert>
    {:else}
      <div class="overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <Table striped={true} hoverable={true}>
          <TableHead>
            <TableHeadCell>{$_('adminRbac.audit.columns.time')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.audit.columns.actor')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.audit.columns.target')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.audit.columns.action')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.audit.columns.reason')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each filtered as event (event.id)}
              <TableBodyRow class="cursor-pointer" onclick={() => openEvent(event)}>
                <TableBodyCell class="text-xs font-mono whitespace-nowrap">{new Date(event.time).toLocaleString()}</TableBodyCell>
                <TableBodyCell>
                  <div class="font-semibold text-slate-900 dark:text-white">{event.actorEmail}</div>
                  <div class="text-xs text-slate-500 font-mono">{event.actorId}</div>
                </TableBodyCell>
                <TableBodyCell class="text-xs font-mono">
                  {event.target.type}:{event.target.name ?? event.target.id}
                </TableBodyCell>
                <TableBodyCell>
                  <div class="text-xs font-mono">{event.action}</div>
                  {#if event.dangerous}
                    <div class="mt-1">
                      <Badge color="red">{$_('adminRbac.common.danger')}</Badge>
                    </div>
                  {/if}
                </TableBodyCell>
                <TableBodyCell class="text-xs text-slate-600 dark:text-slate-300">{event.reason ?? ''}</TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}
  </Card>

  <Modal bind:open={openDetail} size="xl" title={$_('adminRbac.audit.detailTitle')}>
    {#if selected}
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge color="blue">{selected.action}</Badge>
          <Badge color="none">{selected.target.type}:{selected.target.name ?? selected.target.id}</Badge>
          {#if selected.dangerous}
            <Badge color="red">{$_('adminRbac.common.danger')}</Badge>
          {/if}
        </div>
        {#if selected.reason}
          <div class="text-sm text-slate-700 dark:text-slate-200">
            <span class="font-semibold">{$_('adminRbac.audit.columns.reason')}:</span> {selected.reason}
          </div>
        {/if}
        <pre class="text-xs bg-slate-900 text-slate-100 rounded-xl p-3 overflow-auto max-h-[55vh]">{prettyJson(selected.diff)}</pre>
        <div class="flex justify-end">
          <Button color="light" onclick={() => (openDetail = false)}>{$_('common.close')}</Button>
        </div>
      </div>
    {/if}
  </Modal>
</div>
