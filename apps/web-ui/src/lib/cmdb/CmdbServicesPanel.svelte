<script lang="ts">
  import { Alert, Button, Input, Modal, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Plus, Search } from 'lucide-svelte';
  import { createService, listServices, type CmdbServiceRecord } from '$lib/api/cmdb';
  import CmdbServiceDetail from './CmdbServiceDetail.svelte';

  let services = $state<CmdbServiceRecord[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');
  let selectedServiceId = $state<string | null>(null);
  let meta = $state({ total: 0, page: 1, limit: 20 });

  let showModal = $state(false);
  let saving = $state(false);
  let code = $state('');
  let name = $state('');
  let criticality = $state('');

  async function loadServices(page = 1) {
    try {
      loading = true;
      error = '';
      const response = await listServices({ q: query || undefined, page, limit: meta.limit });
      services = response.data ?? [];
      meta = {
        total: response.meta?.total ?? services.length,
        page: response.meta?.page ?? page,
        limit: response.meta?.limit ?? meta.limit
      };
      if (selectedServiceId && !services.some((svc) => svc.id === selectedServiceId)) {
        selectedServiceId = null;
      }
      if (!selectedServiceId && services.length > 0) {
        selectedServiceId = services[0].id;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load services';
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    code = '';
    name = '';
    criticality = '';
    showModal = true;
  }

  async function saveService() {
    if (!code || !name) return;
    try {
      saving = true;
      error = '';
      await createService({ code, name, criticality: criticality || null });
      showModal = false;
      await loadServices(1);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create service';
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void loadServices(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
    <div>
      <h2 class="text-lg font-semibold">Services</h2>
      <p class="text-sm text-slate-500">{meta.total} services</p>
    </div>
    <div class="flex flex-wrap gap-2 items-center">
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <Input class="pl-9" bind:value={query} placeholder="Search services..." />
      </div>
      <Button color="alternative" onclick={() => loadServices(1)}>Search</Button>
      <Button onclick={openCreate}>
        <Plus class="w-4 h-4 mr-2" /> New Service
      </Button>
    </div>
  </div>

  {#if error}
    <Alert color="red">{error}</Alert>
  {/if}

  <div class="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {#if loading}
        <div class="flex justify-center py-10">
          <Spinner size="8" />
        </div>
      {:else}
        <Table>
          <TableHead>
            <TableHeadCell>Code</TableHeadCell>
            <TableHeadCell>Name</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if services.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan="2" class="text-center text-slate-500">No services found.</TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each services as service}
                <TableBodyRow class={selectedServiceId === service.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  <TableBodyCell class="font-medium">
                    <button class="text-left w-full" onclick={() => selectedServiceId = service.id}>
                      {service.code}
                    </button>
                  </TableBodyCell>
                  <TableBodyCell>{service.name}</TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      {/if}
    </div>

    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <CmdbServiceDetail serviceId={selectedServiceId} />
    </div>
  </div>
</div>

<Modal bind:open={showModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">New Service</h3>
  </svelte:fragment>
  <div class="space-y-3">
    <div>
      <label for="service-code" class="text-sm font-medium text-slate-700 dark:text-slate-300">Code</label>
      <Input id="service-code" bind:value={code} placeholder="SVC-APP" />
    </div>
    <div>
      <label for="service-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
      <Input id="service-name" bind:value={name} placeholder="Hospital App" />
    </div>
    <div>
      <label for="service-criticality" class="text-sm font-medium text-slate-700 dark:text-slate-300">Criticality</label>
      <Input id="service-criticality" bind:value={criticality} placeholder="low / medium / high" />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showModal = false}>Cancel</Button>
      <Button disabled={saving || !code || !name} onclick={saveService}>
        {saving ? 'Saving...' : 'Create'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
