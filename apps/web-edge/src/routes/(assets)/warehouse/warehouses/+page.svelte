<script lang="ts">
  import { Alert, Button, Input, Modal } from 'flowbite-svelte';
  import { Plus } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { createWarehouse, deleteWarehouse, listWarehouses, updateWarehouse, type WarehouseRecord } from '$lib/api/warehouse';
  import DataTable from '$lib/components/DataTable.svelte';

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

  async function handleEdit(warehouse: WarehouseRecord, changes: Partial<WarehouseRecord>) {
    await updateWarehouse(warehouse.id, changes);
    await loadWarehouses();
  }

  async function handleDelete(rows: WarehouseRecord[]) {
    for (const row of rows) {
      await deleteWarehouse(row.id);
    }
    await loadWarehouses();
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

  <DataTable
    data={warehouses}
    columns={[
      { key: 'code', label: $isLoading ? 'Code' : $_('common.code'), sortable: true, filterable: true, editable: true, width: 'w-32' },
      { key: 'name', label: $isLoading ? 'Name' : $_('common.name'), sortable: true, filterable: true, editable: true },
      { key: 'locationId', label: $isLoading ? 'Location' : $_('assets.location'), sortable: true, filterable: true, editable: true, render: (val) => val ?? '-' }
    ]}
    selectable={true}
    rowKey="id"
    loading={loading}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
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

