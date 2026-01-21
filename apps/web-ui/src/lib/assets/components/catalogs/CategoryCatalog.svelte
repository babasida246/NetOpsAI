<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Pencil, Trash2 } from 'lucide-svelte';
  import { createCategory, deleteCategory, updateCategory } from '$lib/api/assetCatalogs';
  import CategorySpecPanel from './CategorySpecPanel.svelte';

  let { categories = [] } = $props<{ categories?: Array<{ id: string; name: string }> }>();
  const dispatch = createEventDispatcher<{ updated: void; error: string }>();

  let name = $state('');
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let showSpecPanel = $state(false);
  let selectedCategory = $state<{ id: string; name: string } | null>(null);

  function reset() {
    name = '';
    editingId = null;
  }

  async function save() {
    if (!name.trim()) return;
    try {
      saving = true;
      if (editingId) {
        await updateCategory(editingId, { name: name.trim() });
      } else {
        await createCategory({ name: name.trim() });
      }
      reset();
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      saving = false;
    }
  }

  function edit(id: string, value: string) {
    editingId = id;
    name = value;
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      if (selectedCategory?.id === id) {
        showSpecPanel = false;
        selectedCategory = null;
      }
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to delete category');
    }
  }

  function openSpecs(category: { id: string; name: string }) {
    selectedCategory = category;
    showSpecPanel = true;
  }
</script>

<div class="py-4 space-y-4">
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <div>
        <Label class="mb-2">Category name</Label>
        <Input bind:value={name} placeholder="Laptop" />
      </div>
      <div class="flex gap-2">
        <Button on:click={save} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
        </Button>
        {#if editingId}
          <Button color="alternative" on:click={reset}>Cancel</Button>
        {/if}
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <Table>
      <TableHead>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell class="w-32">Actions</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each categories as category}
          <TableBodyRow>
            <TableBodyCell>{category.name}</TableBodyCell>
            <TableBodyCell>
              <div class="flex gap-2">
                <Button size="xs" color="alternative" on:click={() => edit(category.id, category.name)}>
                  <Pencil class="w-3 h-3" />
                </Button>
                <Button size="xs" color="alternative" on:click={() => openSpecs(category)}>
                  Specs
                </Button>
                <Button size="xs" color="alternative" on:click={() => remove(category.id)}>
                  <Trash2 class="w-3 h-3" />
                </Button>
              </div>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</div>

<CategorySpecPanel
  bind:open={showSpecPanel}
  category={selectedCategory}
  on:error={(event) => dispatch('error', event.detail)}
/>
