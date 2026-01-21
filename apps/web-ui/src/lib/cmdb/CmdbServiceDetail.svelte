<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { Alert, Button, Input, Select, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { addServiceMember, getServiceDetail, listCis, removeServiceMember, updateService, type CiRecord, type CmdbServiceMember, type CmdbServiceRecord } from '$lib/api/cmdb';

  let { serviceId } = $props<{ serviceId: string | null }>();

  let service = $state<CmdbServiceRecord | null>(null);
  let members = $state<CmdbServiceMember[]>([]);
  let cis = $state<CiRecord[]>([]);
  let loading = $state(false);
  let error = $state('');
  let saving = $state(false);

  let name = $state('');
  let criticality = $state('');
  let owner = $state('');
  let sla = $state('');
  let status = $state('');

  let memberCiId = $state('');
  let memberRole = $state('');

  async function loadDetail() {
    if (!serviceId) return;
    try {
      loading = true;
      error = '';
      const response = await getServiceDetail(serviceId);
      service = response.data.service;
      members = response.data.members ?? [];
      name = service?.name ?? '';
      criticality = service?.criticality ?? '';
      owner = service?.owner ?? '';
      sla = service?.sla ?? '';
      status = service?.status ?? '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load service';
    } finally {
      loading = false;
    }
  }

  async function loadCis() {
    try {
      const response = await listCis({ page: 1, limit: 200 });
      cis = response.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load CIs';
    }
  }

  async function saveService() {
    if (!serviceId) return;
    try {
      saving = true;
      error = '';
      const response = await updateService(serviceId, {
        name,
        criticality: criticality || null,
        owner: owner || null,
        sla: sla || null,
        status: status || null
      });
      service = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update service';
    } finally {
      saving = false;
    }
  }

  async function addMember() {
    if (!serviceId || !memberCiId) return;
    try {
      saving = true;
      error = '';
      await addServiceMember(serviceId, { ciId: memberCiId, role: memberRole || null });
      memberCiId = '';
      memberRole = '';
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add member';
    } finally {
      saving = false;
    }
  }

  async function removeMember(memberId: string) {
    if (!serviceId) return;
    try {
      saving = true;
      error = '';
      await removeServiceMember(serviceId, memberId);
      await loadDetail();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove member';
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    if (serviceId) {
      void loadDetail();
      void loadCis();
    } else {
      service = null;
      members = [];
    }
  });
</script>

{#if !serviceId}
  <div class="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-slate-500">
    {$isLoading ? 'Select a service to view details.' : $_('cmdb.selectService')}
  </div>
{:else if loading}
  <div class="flex justify-center py-10">
    <Spinner size="8" />
  </div>
{:else}
  <div class="space-y-4">
    {#if error}
      <Alert color="red">{error}</Alert>
    {/if}

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{$isLoading ? 'Service Details' : $_('cmdb.serviceDetails')}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label for="service-code" class="text-sm font-medium text-slate-700 dark:text-slate-300">Code</label>
          <Input id="service-code" value={service?.code ?? ''} disabled />
        </div>
        <div>
          <label for="service-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
          <Input id="service-name" bind:value={name} />
        </div>
        <div>
          <label for="service-criticality" class="text-sm font-medium text-slate-700 dark:text-slate-300">Criticality</label>
          <Input id="service-criticality" bind:value={criticality} placeholder="low / medium / high" />
        </div>
        <div>
          <label for="service-status" class="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <Input id="service-status" bind:value={status} placeholder="active" />
        </div>
        <div>
          <label for="service-owner" class="text-sm font-medium text-slate-700 dark:text-slate-300">Owner</label>
          <Input id="service-owner" bind:value={owner} placeholder="Team / person" />
        </div>
        <div>
          <label for="service-sla" class="text-sm font-medium text-slate-700 dark:text-slate-300">SLA</label>
          <Input id="service-sla" bind:value={sla} placeholder="99.9%" />
        </div>
      </div>
      <Button disabled={saving} onclick={saveService}>{saving ? 'Saving...' : 'Save'}</Button>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{$isLoading ? 'Members' : $_('cmdb.members')}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label for="member-ci" class="text-sm font-medium text-slate-700 dark:text-slate-300">CI</label>
          <Select id="member-ci" bind:value={memberCiId}>
            <option value="">{$isLoading ? 'Select CI' : $_('cmdb.selectCi')}</option>
            {#each cis as ci}
              <option value={ci.id}>{ci.ciCode} - {ci.name}</option>
            {/each}
          </Select>
        </div>
        <div>
          <label for="member-role" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Role' : $_('cmdb.role')}</label>
          <Input id="member-role" bind:value={memberRole} placeholder="primary / dependency" />
        </div>
        <div>
          <Button disabled={!memberCiId || saving} onclick={addMember}>{$isLoading ? 'Add Member' : $_('cmdb.addMember')}</Button>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <Table>
          <TableHead>
            <TableHeadCell>CI</TableHeadCell>
            <TableHeadCell>{$isLoading ? 'Role' : $_('cmdb.role')}</TableHeadCell>
            <TableHeadCell></TableHeadCell>
          </TableHead>
          <TableBody>
            {#if members.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan="3" class="text-center text-slate-500">No members.</TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each members as member}
                <TableBodyRow>
                  <TableBodyCell>{member.ciId}</TableBodyCell>
                  <TableBodyCell>{member.role ?? '-'}</TableBodyCell>
                  <TableBodyCell class="text-right">
                    <Button size="xs" color="red" onclick={() => removeMember(member.id)}>Remove</Button>
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
{/if}
