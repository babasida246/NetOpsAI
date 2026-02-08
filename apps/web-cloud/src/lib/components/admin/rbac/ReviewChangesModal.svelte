<script lang="ts">
  import {
    Alert,
    Button,
    Checkbox,
    Modal,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Textarea
  } from 'flowbite-svelte';
  import { _ } from '$lib/i18n';
  import type { Scope } from '$lib/rbac/types';

  export type ChangeRow = {
    roleId: string;
    roleName: string;
    permKey: string;
    permTitle: string;
    beforeScope: Scope;
    afterScope: Scope;
    beforeSource: string;
    afterSource: string;
    isDangerous: boolean;
  };

  type Props = {
    open: boolean;
    changes: ChangeRow[];
    onCancel: () => void;
    onConfirm: (payload: { reason: string }) => void;
  };

  let { open, changes, onCancel, onConfirm }: Props = $props();

  let acknowledgeDanger = $state(false);
  let reason = $state('');

  const hasDangerousEscalation = $derived.by(() =>
    changes.some((change) => change.isDangerous && change.afterScope !== 'none')
  );

  const reasonRequired = $derived.by(() => hasDangerousEscalation);

  const canConfirm = $derived.by(() => {
    if (changes.length === 0) return false;
    if (!reasonRequired) return true;
    return acknowledgeDanger && reason.trim().length >= 10;
  });

  $effect(() => {
    if (!open) {
      acknowledgeDanger = false;
      reason = '';
    }
  });
</script>

<Modal bind:open size="xl" title={$_('adminRbac.review.title')}>
  {#if changes.length === 0}
    <Alert color="light">{$_('adminRbac.review.empty')}</Alert>
  {:else}
    <div class="space-y-4">
      <div class="text-sm text-slate-600 dark:text-slate-300">{$_('adminRbac.review.subtitle')}</div>

      <div class="max-h-[55vh] overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <Table striped={true} hoverable={true}>
          <TableHead>
            <TableHeadCell>{$_('adminRbac.review.columns.role')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.review.columns.permission')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.review.columns.before')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.review.columns.after')}</TableHeadCell>
            <TableHeadCell>{$_('adminRbac.review.columns.source')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each changes as change (change.roleId + change.permKey)}
              <TableBodyRow>
                <TableBodyCell class="font-semibold text-slate-900 dark:text-white">{change.roleName}</TableBodyCell>
                <TableBodyCell>
                  <div class="font-semibold text-slate-900 dark:text-white">{change.permTitle}</div>
                  <div class="text-xs text-slate-500">{change.permKey}</div>
                  {#if change.isDangerous}
                    <div class="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
                      {$_('adminRbac.common.danger')}
                    </div>
                  {/if}
                </TableBodyCell>
                <TableBodyCell class="font-mono text-xs">{change.beforeScope}</TableBodyCell>
                <TableBodyCell class="font-mono text-xs">{change.afterScope}</TableBodyCell>
                <TableBodyCell class="text-xs text-slate-500">
                  <div>{change.beforeSource} → {change.afterSource}</div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      {#if reasonRequired}
        <Alert color="yellow">
          <div class="space-y-3">
            <div class="font-semibold">{$_('adminRbac.review.dangerTitle')}</div>
            <div class="text-sm">{$_('adminRbac.review.dangerHelp')}</div>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox bind:checked={acknowledgeDanger} />
              <span>{$_('adminRbac.review.acknowledge')}</span>
            </label>
            <div>
              <div class="text-xs font-semibold text-slate-700 dark:text-slate-200">{$_('adminRbac.review.reason')}</div>
              <Textarea rows={3} bind:value={reason} placeholder={$_('adminRbac.review.reasonPlaceholder')} />
              <div class="mt-1 text-[11px] text-slate-500">{$_('adminRbac.review.reasonHint')}</div>
            </div>
          </div>
        </Alert>
      {/if}
    </div>
  {/if}

  <div class="mt-5 flex justify-end gap-2">
    <Button color="light" onclick={onCancel}>{$_('common.cancel')}</Button>
    <Button onclick={() => onConfirm({ reason })} disabled={!canConfirm}>{$_('common.confirm')}</Button>
  </div>
</Modal>
