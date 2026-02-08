<script lang="ts">
  import { Alert, Button, Input, Modal } from 'flowbite-svelte';
  import { Plus, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { createSparePart, deleteSparePart, listSpareParts, updateSparePart, type SparePartRecord } from '$lib/api/warehouse';
  import DataTable from '$lib/components/DataTable.svelte';

  let parts = $state<SparePartRecord[]>([]);
  let loading = $state(true);
  let error = $state('');

  let query = $state('');
  let meta = $state({ total: 0, page: 1, limit: 20 });

  let showModal = $state(false);
  let saving = $state(false);
  let editing = $state<SparePartRecord | null>(null);

  let partCode = $state('');
  let name = $state('');
  let category = $state('');
  let uom = $state('');
  let manufacturer = $state('');
  let model = $state('');
  let minLevel = $state('0');

  async function loadParts(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listSpareParts({ q: query || undefined, page, limit: meta.limit });
      parts = response.data ?? [];
      meta = {
        total: response.meta?.total ?? parts.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.loadPartsFailed');
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    editing = null;
    partCode = '';
    name = '';
    category = '';
    uom = '';
    manufacturer = '';
    model = '';
    minLevel = '0';
    showModal = true;
  }

  function openEdit(part: SparePartRecord) {
    editing = part;
    partCode = part.partCode;
    name = part.name;
    category = part.category ?? '';
    uom = part.uom ?? '';
    manufacturer = part.manufacturer ?? '';
    model = part.model ?? '';
    minLevel = String(part.minLevel ?? 0);
    showModal = true;
  }

  async function savePart() {
    if (!partCode || !name) return;
    try {
      saving = true;
      error = '';
      const payload = {
        partCode,
        name,
        category: category || null,
        uom: uom || null,
        manufacturer: manufacturer || null,
        model: model || null,
        minLevel: Number(minLevel || 0)
      };
      if (editing) {
        await updateSparePart(editing.id, payload);
      } else {
        await createSparePart(payload);
      }
      showModal = false;
      await loadParts(1);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('warehouse.errors.savePartFailed');
    } finally {
      saving = false;
    }
  }

  async function handleEdit(part: SparePartRecord, changes: Partial<SparePartRecord>) {
    await updateSparePart(part.id, {
      partCode: changes.partCode,
      name: changes.name,
      category: changes.category,
      uom: changes.uom,
      manufacturer: changes.manufacturer,
      model: changes.model,
      minLevel: changes.minLevel
    });
    await loadParts(meta.page);
  }

  async function handleDelete(rows: SparePartRecord[]) {
    for (const row of rows) {
      await deleteSparePart(row.id);
    }
    await loadParts(meta.page);
  }

  $effect(() => {
    void loadParts(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Spare Parts' : $_('warehouse.spareParts')}</h2>
      <p class="text-sm text-slate-500">
        {$isLoading ? `${meta.total} parts` : $_('warehouse.partsTotal', { values: { count: meta.total } })}
      </p>
    </div>
    <div class="flex flex-wrap gap-2 items-center">
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <Input class="pl-9" bind:value={query} placeholder={$isLoading ? 'Search parts...' : $_('warehouse.searchParts')} />
      </div>
      <Button color="alternative" onclick={() => loadParts(1)}>{$isLoading ? 'Search' : $_('common.search')}</Button>
      <Button onclick={openCreate}>
        <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Part' : $_('warehouse.newPart')}
      </Button>
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <DataTable
    data={parts}
    columns={[
      { key: 'partCode', label: $isLoading ? 'Code' : $_('common.code'), sortable: true, filterable: true, editable: true, width: 'w-40' },
      { key: 'name', label: $isLoading ? 'Name' : $_('common.name'), sortable: true, filterable: true, editable: true },
      { key: 'category', label: $isLoading ? 'Category' : $_('assets.category'), sortable: true, filterable: true, editable: true, render: (val) => val ?? '-' },
      { key: 'uom', label: $isLoading ? 'UOM' : $_('warehouse.uom'), sortable: true, filterable: true, editable: true, width: 'w-24', render: (val) => val ?? '-' },
      { key: 'manufacturer', label: $isLoading ? 'Manufacturer' : $_('warehouse.manufacturer'), sortable: true, filterable: true, editable: true, render: (val) => val ?? '-' },
      { key: 'model', label: $isLoading ? 'Model' : $_('assets.model'), sortable: true, filterable: true, editable: true, render: (val) => val ?? '-' },
      { key: 'minLevel', label: $isLoading ? 'Min' : $_('warehouse.minLevel'), sortable: true, filterable: false, editable: true, width: 'w-20' }
    ]}
    selectable={true}
    rowKey="id"
    loading={loading}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />

  {#if !loading && parts.length > 0}
    <div class="flex items-center justify-between text-sm text-slate-500">
      <span>{$isLoading ? 'Page' : $_('table.page')} {meta.page}</span>
      <div class="flex gap-2">
        <Button color="alternative" size="xs" disabled={meta.page <= 1} onclick={() => loadParts(meta.page - 1)}>{$isLoading ? 'Prev' : $_('common.previous')}</Button>
        <Button
          color="alternative"
          size="xs"
          disabled={meta.page * meta.limit >= meta.total}
          onclick={() => loadParts(meta.page + 1)}
        >
          {$isLoading ? 'Next' : $_('common.next')}
        </Button>
      </div>
    </div>
  {/if}
</div>

<Modal bind:open={showModal}>
  <svelte:fragment slot="header">
  
      <h3 class="text-lg font-semibold">
        {editing ? ($isLoading ? 'Edit Part' : $_('warehouse.editPart')) : ($isLoading ? 'New Part' : $_('warehouse.newPart'))}
      </h3>
    
  </svelte:fragment>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="part-code" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Part Code' : $_('warehouse.partCode')}</label>
      <Input id="part-code" bind:value={partCode} placeholder={$isLoading ? 'PART-001' : $_('warehouse.placeholders.partCode')} />
    </div>
    <div>
      <label for="part-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Name' : $_('common.name')}</label>
      <Input id="part-name" bind:value={name} placeholder={$isLoading ? 'Cooling Fan' : $_('warehouse.placeholders.partName')} />
    </div>
    <div>
      <label for="part-category" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Category' : $_('assets.category')}</label>
      <Input id="part-category" bind:value={category} placeholder={$isLoading ? 'Electronics' : $_('warehouse.placeholders.category')} />
    </div>
    <div>
      <label for="part-uom" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'UOM' : $_('warehouse.uom')}</label>
      <Input id="part-uom" bind:value={uom} placeholder={$isLoading ? 'pcs' : $_('warehouse.placeholders.uom')} />
    </div>
    <div>
      <label for="part-manufacturer" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Manufacturer' : $_('warehouse.manufacturer')}</label>
      <Input id="part-manufacturer" bind:value={manufacturer} placeholder={$isLoading ? 'Vendor' : $_('warehouse.placeholders.manufacturer')} />
    </div>
    <div>
      <label for="part-model" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Model' : $_('assets.model')}</label>
      <Input id="part-model" bind:value={model} placeholder={$isLoading ? 'Model A' : $_('warehouse.placeholders.model')} />
    </div>
    <div>
      <label for="part-min-level" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Min Level' : $_('warehouse.minLevel')}</label>
      <Input id="part-min-level" type="number" bind:value={minLevel} min="0" />
    </div>
  </div>
  <svelte:fragment slot="footer">
  
      <div class="flex justify-end gap-2">
        <Button color="alternative" onclick={() => showModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
        <Button disabled={saving || !partCode || !name} onclick={savePart}>
          {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : ($isLoading ? 'Save' : $_('common.save'))}
        </Button>
      </div>
    
  </svelte:fragment>
</Modal>

