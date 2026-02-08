<script lang="ts" generics="T extends Record<string, any>">
  import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Checkbox, Button, Input, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { ChevronDown, ChevronUp, Search, Trash2, Edit, MoreVertical, Check, X } from 'lucide-svelte';
  import { _ } from '$lib/i18n';

  type ButtonColor = 'none' | 'green' | 'red' | 'yellow' | 'purple' | 'blue' | 'light' | 'dark' | 'primary' | 'alternative';

  interface Column<T> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    editable?: boolean;
    render?: (value: any, row: T) => string;
    width?: string;
  }

  interface CustomAction<T> {
    label: string;
    icon?: any;
    color?: ButtonColor;
    onClick: (row: T) => void;
  }

  interface Props {
    data: T[];
    columns: Column<T>[];
    selectable?: boolean;
    onSelect?: (selected: T[]) => void;
    onEdit?: (row: T, changes: Partial<T>) => Promise<void>;
    onDelete?: (rows: T[]) => Promise<void>;
    onBulkEdit?: (rows: T[], changes: Partial<T>) => Promise<void>;
    customActions?: CustomAction<T>[];
    rowKey?: keyof T;
    loading?: boolean;
    hideBulkToolbar?: boolean;
    selectionResetKey?: number;
  }

  let {
    data = [],
    columns = [],
    selectable = false,
    onSelect,
    onEdit,
    onDelete,
    onBulkEdit,
    customActions = [],
    rowKey = 'id' as keyof T,
    loading = false,
    hideBulkToolbar = false,
    selectionResetKey
  }: Props = $props();

  // State
  let selected = $state<Set<any>>(new Set());
  let sortBy = $state<keyof T | null>(null);
  let sortOrder = $state<'asc' | 'desc'>('asc');
  let filters = $state<Record<keyof T, string>>({} as Record<keyof T, string>);
  let editingRow = $state<any>(null);
  let editValues = $state<Partial<T>>({});
  let showBulkActions = $state(false);
  let lastResetKey = $state<number | undefined>(undefined);

  // Computed - filteredData must be declared before allSelected/someSelected
  let filteredData = $derived.by(() => {
    let result = [...data];

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        result = result.filter((row) => {
          const cellValue = String(row[key] ?? '').toLowerCase();
          return cellValue.includes(value.toLowerCase());
        });
      }
    }

    // Apply sorting
    if (sortBy) {
      const currentSortBy = sortBy;
      result.sort((a, b) => {
        const aVal = a[currentSortBy];
        const bVal = b[currentSortBy];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  });

  let allSelected = $derived(selected.size > 0 && selected.size === filteredData.length);
  let someSelected = $derived(selected.size > 0 && selected.size < filteredData.length);

  let selectedRows = $derived.by(() => {
    return data.filter(row => selected.has(row[rowKey]));
  });

  $effect(() => {
    if (selectionResetKey === undefined) return;
    if (selectionResetKey !== lastResetKey) {
      lastResetKey = selectionResetKey;
      selected = new Set();
      onSelect?.([]);
    }
  });

  // Methods
  function toggleSelectAll() {
    let nextSelected: Set<any>;
    if (allSelected) {
      nextSelected = new Set();
    } else {
      nextSelected = new Set(selected);
      filteredData.forEach(row => nextSelected.add(row[rowKey]));
    }
    selected = nextSelected;
    onSelect?.(data.filter(row => nextSelected.has(row[rowKey])));
  }

  function toggleSelect(row: T) {
    const key = row[rowKey];
    const nextSelected = new Set(selected);
    if (nextSelected.has(key)) {
      nextSelected.delete(key);
    } else {
      nextSelected.add(key);
    }
    selected = nextSelected;
    onSelect?.(data.filter(currentRow => nextSelected.has(currentRow[rowKey])));
  }

  function handleSort(column: Column<T>) {
    if (!column.sortable) return;
    if (sortBy === column.key) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column.key;
      sortOrder = 'asc';
    }
  }

  function startEdit(row: T) {
    editingRow = row[rowKey];
    editValues = { ...row };
  }

  function cancelEdit() {
    editingRow = null;
    editValues = {};
  }

  async function saveEdit() {
    if (!editingRow || !onEdit) return;
    try {
      const row = data.find(r => r[rowKey] === editingRow);
      if (row) {
        await onEdit(row, editValues);
      }
      editingRow = null;
      editValues = {};
    } catch (err) {
      console.error('Save edit failed:', err);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0 || !onDelete) return;
    if (!confirm($_('common.confirmDelete'))) return;
    try {
      await onDelete(selectedRows);
      selected = new Set();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }

  function updateEditValue(key: keyof T, value: any) {
    editValues = { ...editValues, [key]: value };
  }

  function updateFilter(key: keyof T, value: string) {
    filters = { ...filters, [key]: value };
  }
</script>

<!-- Bulk Actions Toolbar -->
{#if selectable && selected.size > 0 && !hideBulkToolbar}
  <div class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
    <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
      {selected.size} {$_('common.selected')}
    </span>
    {#if onDelete}
      <Button size="xs" color="red" onclick={handleBulkDelete}>
        <Trash2 class="mr-1 h-3 w-3" />
        {$_('common.delete')}
      </Button>
    {/if}
    {#if onBulkEdit}
      <Button size="xs" color="blue" onclick={() => showBulkActions = !showBulkActions}>
        <Edit class="mr-1 h-3 w-3" />
        {$_('common.edit')}
      </Button>
    {/if}
    <Button size="xs" color="alternative" onclick={() => { selected = new Set(); }}>
      {$_('common.clearSelection')}
    </Button>
  </div>
{/if}

<!-- Table -->
<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
  <Table hoverable={true}>
    <TableHead>
      {#if selectable}
        <TableHeadCell class="w-10">
          <Checkbox 
            checked={allSelected}
            indeterminate={someSelected}
            on:click={toggleSelectAll}
          />
        </TableHeadCell>
      {/if}
      {#each columns as column}
        <TableHeadCell class={column.width}>
          <div class="flex flex-col gap-1">
            <!-- Column Header -->
            <button
              type="button"
              class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
              class:cursor-pointer={column.sortable}
              onclick={() => handleSort(column)}
            >
              {column.label}
              {#if column.sortable}
                {#if sortBy === column.key}
                  {#if sortOrder === 'asc'}
                    <ChevronUp class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                {/if}
              {/if}
            </button>
            
            <!-- Column Filter -->
            {#if column.filterable}
              <Input
                type="text"
                size="sm"
                placeholder={$_('common.filter')}
                value={filters[column.key] ?? ''}
                oninput={(e) => updateFilter(column.key, e.currentTarget.value)}
                class="text-xs"
              >
                <svelte:fragment slot="left">
                                <Search  class="h-3 w-3" />
                              </svelte:fragment>
              </Input>
            {/if}
          </div>
        </TableHeadCell>
      {/each}
      <TableHeadCell class="w-20">{$_('common.actions')}</TableHeadCell>
    </TableHead>
    
    <TableBody>
      {#if loading}
        <TableBodyRow>
          <TableBodyCell colspan={columns.length + (selectable ? 2 : 1)} class="text-center py-8">
            <div class="flex items-center justify-center gap-2">
              <div class="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>{$_('common.loading')}</span>
            </div>
          </TableBodyCell>
        </TableBodyRow>
      {:else if filteredData.length === 0}
        <TableBodyRow>
          <TableBodyCell colspan={columns.length + (selectable ? 2 : 1)} class="text-center py-8 text-gray-500">
            {$_('common.noData')}
          </TableBodyCell>
        </TableBodyRow>
      {:else}
        {#each filteredData as row (row[rowKey])}
          {@const isEditing = editingRow === row[rowKey]}
          {@const isSelected = selected.has(row[rowKey])}
          <TableBodyRow class={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
            {#if selectable}
              <TableBodyCell>
                <Checkbox 
                  checked={isSelected}
                  on:click={() => toggleSelect(row)}
                />
              </TableBodyCell>
            {/if}
            
            {#each columns as column}
              <TableBodyCell>
                {#if isEditing && column.editable}
                  <Input
                    type="text"
                    size="sm"
                    value={editValues[column.key] ?? ''}
                    oninput={(e) => updateEditValue(column.key, e.currentTarget.value)}
                  />
                {:else}
                  {#if column.render}
                    {@html column.render(row[column.key], row)}
                  {:else}
                    {row[column.key] ?? '-'}
                  {/if}
                {/if}
              </TableBodyCell>
            {/each}
            
            <!-- Actions -->
            <TableBodyCell>
              {#if isEditing}
                <div class="flex gap-1">
                  <Button size="xs" color="green" onclick={saveEdit}>
                    <Check class="h-3 w-3" />
                  </Button>
                  <Button size="xs" color="alternative" onclick={cancelEdit}>
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              {:else}
                <div class="flex gap-1">
                  {#each customActions as action}
                    <Button size="xs" color={action.color || 'blue'} onclick={() => action.onClick(row)}>
                      {#if action.icon}
                        <span class="h-3 w-3 inline-block">{@html action.icon || ''}</span>
                      {/if}
                      {#if action.label && !action.icon}
                        {action.label}
                      {/if}
                    </Button>
                  {/each}
                  {#if onEdit}
                    <Button size="xs" color="blue" onclick={() => startEdit(row)}>
                      <Edit class="h-3 w-3" />
                    </Button>
                  {/if}
                  {#if onDelete}
                    <Button 
                      size="xs" 
                      color="red"
                      onclick={async () => {
                        if (confirm($_('common.confirmDelete'))) {
                          await onDelete([row]);
                        }
                      }}
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  {/if}
                </div>
              {/if}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>

<!-- Summary -->
{#if !loading && filteredData.length > 0}
  <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
    {$_('common.showing')} {filteredData.length} / {data.length} {$_('common.rows')}
  </div>
{/if}

