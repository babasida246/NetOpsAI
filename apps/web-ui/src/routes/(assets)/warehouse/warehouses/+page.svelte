<script lang="ts">
  import { Alert, Button, Input, Modal, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Plus } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { createWarehouse, listWarehouses, updateWarehouse, type WarehouseRecord } from '$lib/api/warehouse';

  let warehouses = $state<WarehouseRecord[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let saving = $state(false);
  let editing = $state<WarehouseRecord | null>(null);
  let code = $state('');
  let name = $state('');
  let locationId = $state('');

  async function loadWarehouses() {
    try {
      loading = true;
      error = '';
      const response = await listWarehouses();
      warehouses = response.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    editing = null;
    code = '';
    name = '';
    locationId = '';
    showModal = true;
  }

  function openEdit(warehouse: WarehouseRecord) {
    editing = warehouse;
    code = warehouse.code;
    name = warehouse.name;
    locationId = warehouse.locationId ?? '';
    showModal = true;
  }

  async function saveWarehouse() {
    if (!code || !name) return;
    try {
      saving = true;
      error = '';
      if (editing) {
        await updateWarehouse(editing.id, { code, name, locationId: locationId || null });
      } else {
        await createWarehouse({ code, name, locationId: locationId || null });
      }
      showModal = false;
      await loadWarehouses();
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.saveFailed');
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void loadWarehouses();
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Warehouses' : $_('warehouse.warehouses')}</h2>
      <p class="text-sm text-slate-500">{warehouses.length} {$isLoading ? 'total' : $_('common.total')}</p>
    </div>
    <Button onclick={openCreate}>
      <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Warehouse' : $_('warehouse.newWarehouse')}
    </Button>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Code' : $_('common.code')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Name' : $_('common.name')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Location' : $_('assets.location')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? '' : $_('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if warehouses.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan="4" class="text-center text-slate-500">{$isLoading ? 'No warehouses found.' : $_('warehouse.noWarehouses')}</TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each warehouses as warehouse}
                <TableBodyRow>
                  <TableBodyCell class="font-medium">{warehouse.code}</TableBodyCell>
                  <TableBodyCell>{warehouse.name}</TableBodyCell>
                  <TableBodyCell>{warehouse.locationId ?? '-'}</TableBodyCell>
                  <TableBodyCell class="text-right">
                    <Button size="xs" color="alternative" onclick={() => openEdit(warehouse)}>{$isLoading ? 'Edit' : $_('common.edit')}</Button>
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
      </Table>
    </div>
  {/if}
</div>

<Modal bind:open={showModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">
      {editing ? ($isLoading ? 'Edit Warehouse' : $_('warehouse.editWarehouse')) : ($isLoading ? 'New Warehouse' : $_('warehouse.newWarehouse'))}
    </h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <label for="warehouse-code" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Code' : $_('common.code')}</label>
      <Input id="warehouse-code" bind:value={code} placeholder={$isLoading ? 'WH-01' : $_('warehouse.placeholders.code')} />
    </div>
    <div>
      <label for="warehouse-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Name' : $_('common.name')}</label>
      <Input id="warehouse-name" bind:value={name} placeholder={$isLoading ? 'Main Warehouse' : $_('warehouse.placeholders.name')} />
    </div>
    <div>
      <label for="warehouse-location" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Location ID' : $_('warehouse.locationId')}</label>
      <Input id="warehouse-location" bind:value={locationId} placeholder={$isLoading ? 'Optional location UUID' : $_('warehouse.placeholders.locationId')} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button disabled={saving || !code || !name} onclick={saveWarehouse}>
        {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : ($isLoading ? 'Save' : $_('common.save'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
