<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Input, Select, Modal, Label, Alert, Spinner } from 'flowbite-svelte';
  import { Plus, Upload, RefreshCw, Search } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { devicesApi } from '$lib/netops/api/netopsApi';
  import type { Device, Vendor, DeviceRole } from '$lib/netops/types';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  import { formatRelativeTime } from '$lib/netops/utils/format';
  
  let devices: Device[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  // Filters
  let searchQuery = $state('');
  let filterVendor = $state<Vendor | ''>('');
  let filterSite = $state('');
  let filterRole = $state<DeviceRole | ''>('');
  
  // Modals
  let showCreateModal = $state(false);
  let showImportModal = $state(false);
  
  // Create device form
  let newDevice = $state({
    name: '',
    vendor: 'cisco' as Vendor,
    model: '',
    os_version: '',
    site: '',
    role: 'core' as DeviceRole,
    mgmt_ip: '',
    tags: {}
  });
  
  let creating = $state(false);
  let createError = $state('');
  
  // Import
  let importFile: File | null = $state(null);
  let importing = $state(false);
  let importError = $state('');
  let importSuccess = $state('');
  
  const filteredDevices = $derived(() => {
    return devices.filter(device => {
      if (searchQuery && !device.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !device.mgmt_ip.includes(searchQuery)) {
        return false;
      }
      if (filterVendor && device.vendor !== filterVendor) {
        return false;
      }
      if (filterSite && device.site !== filterSite) {
        return false;
      }
      if (filterRole && device.role !== filterRole) {
        return false;
      }
      return true;
    });
  });
  
  const sites = $derived(() => {
    const uniqueSites = new Set(devices.map(d => d.site).filter(Boolean));
    return Array.from(uniqueSites).sort();
  });
  
  const vendorCounts = $derived(() => {
    const counts: Record<string, number> = {};
    devices.forEach(d => {
      counts[d.vendor] = (counts[d.vendor] || 0) + 1;
    });
    return counts;
  });
  
  async function loadDevices() {
    try {
      loading = true;
      error = '';
      devices = await devicesApi.list();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load devices';
    } finally {
      loading = false;
    }
  }
  
  async function handleCreateDevice() {
    try {
      creating = true;
      createError = '';
      await devicesApi.create(newDevice);
      showCreateModal = false;
      newDevice = {
        name: '',
        vendor: 'cisco',
        model: '',
        os_version: '',
        site: '',
        role: 'core',
        mgmt_ip: '',
        tags: {}
      };
      await loadDevices();
    } catch (e) {
      createError = e instanceof Error ? e.message : 'Failed to create device';
    } finally {
      creating = false;
    }
  }
  
  async function handleImport() {
    if (!importFile) return;
    
    try {
      importing = true;
      importError = '';
      importSuccess = '';
      const result = await devicesApi.importCsv(importFile);
      importSuccess = `Imported ${result.imported} devices`;
      if (result.errors.length > 0) {
        importError = result.errors.join(', ');
      }
      showImportModal = false;
      importFile = null;
      await loadDevices();
    } catch (e) {
      importError = e instanceof Error ? e.message : 'Failed to import devices';
    } finally {
      importing = false;
    }
  }
  
  function clearFilters() {
    searchQuery = '';
    filterVendor = '';
    filterSite = '';
    filterRole = '';
  }
  
  $effect(() => {
    void loadDevices();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'NetOps Devices' : $_('netops.devicesPage.title')}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {$isLoading ? `${devices.length} devices` : $_('netops.devicesPage.summary', { count: devices.length })}
          {#if Object.keys(vendorCounts()).length > 0}
            - {Object.entries(vendorCounts()).map(([v, c]) => `${c} ${v}`).join(' - ')}
          {/if}
        </p>
      </div>
      
      <div class="flex gap-2">
        <Button color="alternative" on:click={() => showImportModal = true}>
          <Upload class="w-4 h-4 mr-2" />
          {$isLoading ? 'Import CSV' : $_('netops.devicesPage.actions.importCsv')}
        </Button>
        <Button on:click={() => showCreateModal = true}>
          <Plus class="w-4 h-4 mr-2" />
          {$isLoading ? 'Add Device' : $_('netops.devicesPage.actions.addDevice')}
        </Button>
        <Button color="alternative" on:click={loadDevices}>
          <RefreshCw class="w-4 h-4" />
        </Button>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label class="mb-2">{$isLoading ? 'Search' : $_('netops.devicesPage.filters.search')}</Label>
          <Input
            bind:value={searchQuery}
            placeholder={$isLoading ? 'Name or IP...' : $_('netops.devicesPage.filters.searchPlaceholder')}
          >
            <Search slot="left" class="w-4 h-4" />
          </Input>
        </div>
        
        <div>
          <Label class="mb-2">{$isLoading ? 'Vendor' : $_('netops.devicesPage.filters.vendor')}</Label>
          <Select bind:value={filterVendor}>
            <option value="">{$isLoading ? 'All Vendors' : $_('netops.devicesPage.filters.allVendors')}</option>
            <option value="cisco">{$isLoading ? 'Cisco' : $_('netops.toolsPage.vendorOptions.cisco')}</option>
            <option value="mikrotik">{$isLoading ? 'MikroTik' : $_('netops.toolsPage.vendorOptions.mikrotik')}</option>
            <option value="fortigate">{$isLoading ? 'FortiGate' : $_('netops.toolsPage.vendorOptions.fortigate')}</option>
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">{$isLoading ? 'Site' : $_('netops.devicesPage.filters.site')}</Label>
          <Select bind:value={filterSite}>
            <option value="">{$isLoading ? 'All Sites' : $_('netops.devicesPage.filters.allSites')}</option>
            {#each sites() as site}
              <option value={site}>{site}</option>
            {/each}
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">{$isLoading ? 'Role' : $_('netops.devicesPage.filters.role')}</Label>
          <Select bind:value={filterRole}>
            <option value="">{$isLoading ? 'All Roles' : $_('netops.devicesPage.filters.allRoles')}</option>
            <option value="core">{$isLoading ? 'Core' : $_('netops.devicesPage.roles.core')}</option>
            <option value="distribution">{$isLoading ? 'Distribution' : $_('netops.devicesPage.roles.distribution')}</option>
            <option value="access">{$isLoading ? 'Access' : $_('netops.devicesPage.roles.access')}</option>
            <option value="edge">{$isLoading ? 'Edge' : $_('netops.devicesPage.roles.edge')}</option>
            <option value="firewall">{$isLoading ? 'Firewall' : $_('netops.devicesPage.roles.firewall')}</option>
            <option value="wan">{$isLoading ? 'WAN' : $_('netops.devicesPage.roles.wan')}</option>
          </Select>
        </div>
      </div>
      
      {#if searchQuery || filterVendor || filterSite || filterRole}
        <div class="mt-3">
          <Button size="xs" color="alternative" on:click={clearFilters}>
            {$isLoading ? 'Clear Filters' : $_('netops.devicesPage.actions.clearFilters')}
          </Button>
        </div>
      {/if}
    </div>
  </div>
  
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  
  <!-- Devices Table -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if filteredDevices().length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">{$isLoading ? 'No devices found' : $_('netops.devicesPage.empty')}</p>
      {#if devices.length === 0}
        <Button class="mt-4" on:click={() => showCreateModal = true}>
          <Plus class="w-4 h-4 mr-2" />
          {$isLoading ? 'Add your first device' : $_('netops.devicesPage.emptyCta')}
        </Button>
      {/if}
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>{$isLoading ? 'Name' : $_('netops.devicesPage.table.name')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Vendor' : $_('netops.devicesPage.table.vendor')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Role' : $_('netops.devicesPage.table.role')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Site' : $_('netops.devicesPage.table.site')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Management IP' : $_('netops.devicesPage.table.mgmtIp')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Last Snapshot' : $_('netops.devicesPage.table.lastSnapshot')}</TableHeadCell>
          <TableHeadCell>{$isLoading ? 'Actions' : $_('netops.devicesPage.table.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each filteredDevices() as device}
            <TableBodyRow>
              <TableBodyCell>
                <a href="/netops/devices/{device.id}" class="font-medium text-primary-600 hover:underline">
                  {device.name}
                </a>
              </TableBodyCell>
              <TableBodyCell>
                <StatusBadge type="vendor" value={device.vendor} />
              </TableBodyCell>
              <TableBodyCell>
                {#if device.role}
                  <StatusBadge type="role" value={device.role} />
                {/if}
              </TableBodyCell>
              <TableBodyCell>{device.site || '-'}</TableBodyCell>
              <TableBodyCell class="font-mono text-sm">{device.mgmt_ip}</TableBodyCell>
              <TableBodyCell class="text-sm text-gray-500">
                {device.last_config_snapshot ? formatRelativeTime(device.last_config_snapshot) : '-'}
              </TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="alternative" href="/netops/devices/{device.id}">
                  {$isLoading ? 'View' : $_('netops.devicesPage.actions.view')}
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>

<!-- Create Device Modal -->
<Modal bind:open={showCreateModal} size="lg">
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">{$isLoading ? 'Add New Device' : $_('netops.devicesPage.modals.createTitle')}</h3>
  </svelte:fragment>
  
  {#if createError}
    <Alert color="red" class="mb-4">{createError}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="name" class="mb-2">{$isLoading ? 'Name' : $_('netops.devicesPage.modals.fields.name')} *</Label>
      <Input id="name" bind:value={newDevice.name} required />
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="vendor" class="mb-2">{$isLoading ? 'Vendor' : $_('netops.devicesPage.modals.fields.vendor')} *</Label>
        <Select id="vendor" bind:value={newDevice.vendor}>
          <option value="cisco">{$isLoading ? 'Cisco' : $_('netops.toolsPage.vendorOptions.cisco')}</option>
          <option value="mikrotik">{$isLoading ? 'MikroTik' : $_('netops.toolsPage.vendorOptions.mikrotik')}</option>
          <option value="fortigate">{$isLoading ? 'FortiGate' : $_('netops.toolsPage.vendorOptions.fortigate')}</option>
        </Select>
      </div>
      
      <div>
        <Label for="role" class="mb-2">{$isLoading ? 'Role' : $_('netops.devicesPage.modals.fields.role')} *</Label>
        <Select id="role" bind:value={newDevice.role}>
          <option value="core">{$isLoading ? 'Core' : $_('netops.devicesPage.roles.core')}</option>
          <option value="distribution">{$isLoading ? 'Distribution' : $_('netops.devicesPage.roles.distribution')}</option>
          <option value="access">{$isLoading ? 'Access' : $_('netops.devicesPage.roles.access')}</option>
          <option value="edge">{$isLoading ? 'Edge' : $_('netops.devicesPage.roles.edge')}</option>
          <option value="firewall">{$isLoading ? 'Firewall' : $_('netops.devicesPage.roles.firewall')}</option>
          <option value="wan">{$isLoading ? 'WAN' : $_('netops.devicesPage.roles.wan')}</option>
        </Select>
      </div>
    </div>
    
    <div>
      <Label for="mgmt_ip" class="mb-2">{$isLoading ? 'Management IP' : $_('netops.devicesPage.modals.fields.mgmtIp')} *</Label>
      <Input id="mgmt_ip" bind:value={newDevice.mgmt_ip} placeholder="192.168.1.1" required />
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="model" class="mb-2">{$isLoading ? 'Model' : $_('netops.devicesPage.modals.fields.model')}</Label>
        <Input id="model" bind:value={newDevice.model} />
      </div>
      
      <div>
        <Label for="site" class="mb-2">{$isLoading ? 'Site' : $_('netops.devicesPage.modals.fields.site')}</Label>
        <Input id="site" bind:value={newDevice.site} />
      </div>
    </div>
    
    <div>
      <Label for="os_version" class="mb-2">{$isLoading ? 'OS Version' : $_('netops.devicesPage.modals.fields.osVersion')}</Label>
      <Input id="os_version" bind:value={newDevice.os_version} />
    </div>
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showCreateModal = false}>{$isLoading ? 'Cancel' : $_('netops.devicesPage.modals.actions.cancel')}</Button>
      <Button on:click={handleCreateDevice} disabled={creating || !newDevice.name || !newDevice.mgmt_ip}>
        {creating ? ($isLoading ? 'Creating...' : $_('netops.devicesPage.modals.actions.creating')) : ($isLoading ? 'Create Device' : $_('netops.devicesPage.modals.actions.create'))}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Import CSV Modal -->
<Modal bind:open={showImportModal}>
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">{$isLoading ? 'Import Devices from CSV' : $_('netops.devicesPage.modals.importTitle')}</h3>
  </svelte:fragment>
  
  {#if importError}
    <Alert color="red" class="mb-4">{importError}</Alert>
  {/if}
  
  {#if importSuccess}
    <Alert color="green" class="mb-4">{importSuccess}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="csv-file" class="mb-2">{$isLoading ? 'CSV File' : $_('netops.devicesPage.modals.csvFile')}</Label>
      <Input
        id="csv-file"
        type="file"
        accept=".csv"
        on:change={(e) => {
          const target = e.target as HTMLInputElement;
          importFile = target.files?.[0] || null;
        }}
      />
    </div>
    
    <Alert color="blue">
      <p class="font-semibold mb-2">{$isLoading ? 'CSV Format:' : $_('netops.devicesPage.modals.formatTitle')}</p>
      <pre class="text-xs">{$isLoading ? 'name,vendor,model,os_version,site,role,mgmt_ip\ncore-sw-01,cisco,C9300,17.6.3,HQ,core,192.168.1.1' : $_('netops.devicesPage.modals.formatExample')}</pre>
    </Alert>
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showImportModal = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
      <Button on:click={handleImport} disabled={importing || !importFile}>
        {$isLoading ? 'Import' : $_('common.import')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

