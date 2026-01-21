<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Input, Label, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Pencil, Trash2 } from 'lucide-svelte';
  import { createLocation, deleteLocation, updateLocation } from '$lib/api/assetCatalogs';

  let { locations = [] } = $props<{
    locations?: Array<{ id: string; name: string; parentId?: string | null; path: string }>;
  }>();
  const dispatch = createEventDispatcher<{ updated: void; error: string }>();

  let form = $state({ name: '', parentId: '' });
  let editingId = $state<string | null>(null);
  let saving = $state(false);

  function reset() {
    form = { name: '', parentId: '' };
    editingId = null;
  }

  async function save() {
    if (!form.name.trim()) return;
    try {
      saving = true;
      const payload = { name: form.name.trim(), parentId: form.parentId || null };
      if (editingId) {
        await updateLocation(editingId, payload);
      } else {
        await createLocation(payload);
      }
      reset();
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      saving = false;
    }
  }

  function edit(location: { id: string; name: string; parentId?: string | null }) {
    form = { name: location.name, parentId: location.parentId ?? '' };
    editingId = location.id;
  }

  async function remove(id: string) {
    if (!confirm('Delete this location?')) return;
    try {
      await deleteLocation(id);
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to delete location');
    }
  }
</script>

<div class="py-4 space-y-4">
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label class="mb-2">Location name</Label>
        <Input bind:value={form.name} placeholder="HQ / Floor 2" />
      </div>
      <div>
        <Label class="mb-2">Parent location</Label>
        <Select bind:value={form.parentId}>
          <option value="">No parent</option>
          {#each locations as location}
            <option value={location.id}>{location.name}</option>
          {/each}
        </Select>
      </div>
    </div>
    <div class="flex gap-2">
      <Button on:click={save} disabled={saving || !form.name.trim()}>
        {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
      </Button>
      {#if editingId}
        <Button color="alternative" on:click={reset}>Cancel</Button>
      {/if}
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <Table>
      <TableHead>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Parent</TableHeadCell>
        <TableHeadCell>Path</TableHeadCell>
        <TableHeadCell class="w-32">Actions</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each locations as location}
          <TableBodyRow>
            <TableBodyCell>{location.name}</TableBodyCell>
            <TableBodyCell>{locations.find(loc => loc.id === location.parentId)?.name || '-'}</TableBodyCell>
            <TableBodyCell class="text-xs text-gray-500">{location.path}</TableBodyCell>
            <TableBodyCell>
              <div class="flex gap-2">
                <Button size="xs" color="alternative" on:click={() => edit(location)}>
                  <Pencil class="w-3 h-3" />
                </Button>
                <Button size="xs" color="alternative" on:click={() => remove(location.id)}>
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
