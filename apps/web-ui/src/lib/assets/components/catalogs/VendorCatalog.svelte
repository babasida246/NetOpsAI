<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _, isLoading } from '$lib/i18n';
  import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Pencil, Trash2 } from 'lucide-svelte';
  import { createVendor, deleteVendor, updateVendor } from '$lib/api/assetCatalogs';

  let { vendors = [] } = $props<{
    vendors?: Array<{ id: string; name: string; taxCode?: string | null; phone?: string | null; email?: string | null; address?: string | null }>;
  }>();
  const dispatch = createEventDispatcher<{ updated: void; error: string }>();

  let form = $state({ name: '', taxCode: '', phone: '', email: '', address: '' });
  let editingId = $state<string | null>(null);
  let saving = $state(false);

  function reset() {
    form = { name: '', taxCode: '', phone: '', email: '', address: '' };
    editingId = null;
  }

  async function save() {
    if (!form.name.trim()) return;
    try {
      saving = true;
      const payload = {
        name: form.name.trim(),
        taxCode: form.taxCode.trim() ? form.taxCode.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        email: form.email.trim() ? form.email.trim() : null,
        address: form.address.trim() ? form.address.trim() : null
      };
      if (editingId) {
        await updateVendor(editingId, payload);
      } else {
        await createVendor(payload);
      }
      reset();
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      saving = false;
    }
  }

  function edit(vendor: { id: string; name: string; taxCode?: string | null; phone?: string | null; email?: string | null; address?: string | null }) {
    form = {
      name: vendor.name,
      taxCode: vendor.taxCode ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      address: vendor.address ?? ''
    };
    editingId = vendor.id;
  }

  async function remove(id: string) {
    if (!confirm('Delete this vendor?')) return;
    try {
      await deleteVendor(id);
      dispatch('updated');
    } catch (err) {
      dispatch('error', err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  }
</script>

<div class="py-4 space-y-4">
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Vendor name' : $_('assets.vendorName')}</Label>
        <Input bind:value={form.name} placeholder={$isLoading ? 'Dell' : $_('assets.placeholders.vendorName')} />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Tax code' : $_('assets.taxCode')}</Label>
        <Input bind:value={form.taxCode} placeholder={$isLoading ? 'Optional' : $_('assets.placeholders.taxCode')} />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Phone' : $_('assets.phone')}</Label>
        <Input bind:value={form.phone} placeholder={$isLoading ? 'Optional' : $_('assets.placeholders.phone')} />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Email' : $_('assets.email')}</Label>
        <Input bind:value={form.email} placeholder={$isLoading ? 'Optional' : $_('assets.placeholders.email')} />
      </div>
      <div class="md:col-span-2">
        <Label class="mb-2">{$isLoading ? 'Address' : $_('assets.address')}</Label>
        <Input bind:value={form.address} placeholder={$isLoading ? 'Optional' : $_('assets.placeholders.address')} />
      </div>
    </div>
    <div class="flex gap-2">
      <Button on:click={save} disabled={saving || !form.name.trim()}>
        {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : editingId ? ($isLoading ? 'Update' : $_('common.update')) : ($isLoading ? 'Add' : $_('common.add'))}
      </Button>
      {#if editingId}
        <Button color="alternative" on:click={reset}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      {/if}
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <Table>
      <TableHead>
        <TableHeadCell>{$isLoading ? 'Name' : $_('common.name')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Tax code' : $_('assets.taxCode')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Phone' : $_('assets.phone')}</TableHeadCell>
        <TableHeadCell>{$isLoading ? 'Email' : $_('assets.email')}</TableHeadCell>
        <TableHeadCell class="w-32">{$isLoading ? 'Actions' : $_('common.actions')}</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each vendors as vendor}
          <TableBodyRow>
            <TableBodyCell>{vendor.name}</TableBodyCell>
            <TableBodyCell>{vendor.taxCode || '-'}</TableBodyCell>
            <TableBodyCell>{vendor.phone || '-'}</TableBodyCell>
            <TableBodyCell>{vendor.email || '-'}</TableBodyCell>
            <TableBodyCell>
              <div class="flex gap-2">
                <Button size="xs" color="alternative" on:click={() => edit(vendor)}>
                  <Pencil class="w-3 h-3" />
                </Button>
                <Button size="xs" color="alternative" on:click={() => remove(vendor.id)}>
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
