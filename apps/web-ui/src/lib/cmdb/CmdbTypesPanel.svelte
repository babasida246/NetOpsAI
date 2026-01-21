<script lang="ts">
  import { Alert, Button, Input, Modal, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Plus } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { createCmdbType, listCmdbTypes, type CmdbType } from '$lib/api/cmdb';
  import CmdbTypeSchema from './CmdbTypeSchema.svelte';

  let types = $state<CmdbType[]>([]);
  let loading = $state(true);
  let error = $state('');
  let selectedType = $state<CmdbType | null>(null);

  let showModal = $state(false);
  let saving = $state(false);
  let code = $state('');
  let name = $state('');
  let description = $state('');

  async function loadTypes() {
    try {
      loading = true;
      error = '';
      const response = await listCmdbTypes();
      types = response.data ?? [];
      if (selectedType) {
        selectedType = types.find((type) => type.id === selectedType?.id) ?? null;
      }
      if (!selectedType && types.length > 0) {
        selectedType = types[0];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load CMDB types';
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    code = '';
    name = '';
    description = '';
    showModal = true;
  }

  async function saveType() {
    if (!code || !name) return;
    try {
      saving = true;
      error = '';
      await createCmdbType({ code, name, description: description || null });
      showModal = false;
      await loadTypes();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create type';
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void loadTypes();
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">{$isLoading ? 'Types' : $_('cmdb.types')}</h2>
      <p class="text-sm text-slate-500">{types.length} {$isLoading ? 'types' : $_('cmdb.types').toLowerCase()}</p>
    </div>
    <Button onclick={openCreate}>
      <Plus class="w-4 h-4 mr-2" /> {$isLoading ? 'New Type' : $_('cmdb.newType')}
    </Button>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <div class="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {#if loading}
        <div class="flex justify-center py-10">
          <Spinner size="8" />
        </div>
      {:else}
        <Table>
          <TableHead>
            <TableHeadCell>{$isLoading ? 'Code' : $_('common.code')}</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Name' : $_('common.name')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if types.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan="2" class="text-center text-slate-500">{$isLoading ? 'No types found.' : $_('cmdb.noTypes')}</TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each types as type}
                <TableBodyRow class={selectedType?.id === type.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  <TableBodyCell class="font-medium">
                    <button class="text-left w-full" onclick={() => selectedType = type}>
                      {type.code}
                    </button>
                  </TableBodyCell>
                  <TableBodyCell>{type.name}</TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      {/if}
    </div>

    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <CmdbTypeSchema type={selectedType} />
    </div>
  </div>
</div>

<Modal bind:open={showModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$isLoading ? 'New CMDB Type' : $_('cmdb.newType')}</h3>
  </svelte:fragment>
  <div class="space-y-3">
    <div>
      <label for="type-code" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Code' : $_('common.code')}</label>
      <Input id="type-code" bind:value={code} placeholder={$isLoading ? 'APP' : $_('cmdb.type.placeholders.code')} />
    </div>
    <div>
      <label for="type-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Name' : $_('common.name')}</label>
      <Input id="type-name" bind:value={name} placeholder={$isLoading ? 'Application' : $_('cmdb.type.placeholders.typeName')} />
    </div>
    <div>
      <label for="type-desc" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Description' : $_('models.description')}</label>
      <Input id="type-desc" bind:value={description} placeholder={$isLoading ? 'Optional description' : $_('cmdb.type.placeholders.typeDescription')} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button disabled={saving || !code || !name} onclick={saveType}>
        {saving ? ($isLoading ? 'Saving...' : $_('common.saving')) : ($isLoading ? 'Create' : $_('common.create'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
