<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Input, Select, Modal, Label, Alert, Spinner } from 'flowbite-svelte';
  import { Plus, Upload, RefreshCw, Search } from 'lucide-svelte';
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
  
  onMount(() => {
    loadDevices();
  });
</script>

<div class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">NetOps Devices</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {devices.length} devices
          {#if Object.keys(vendorCounts()).length > 0}
            • {Object.entries(vendorCounts()).map(([v, c]) => `${c} ${v}`).join(' • ')}
          {/if}
        </p>
      </div>
      
      <div class="flex gap-2">
        <Button color="alternative" on:click={() => showImportModal = true}>
          <Upload class="w-4 h-4 mr-2" />
          Import CSV
        </Button>
        <Button on:click={() => showCreateModal = true}>
          <Plus class="w-4 h-4 mr-2" />
          Add Device
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
          <Label class="mb-2">Search</Label>
          <Input
            bind:value={searchQuery}
            placeholder="Name or IP..."
          >
            <Search slot="left" class="w-4 h-4" />
          </Input>
        </div>
        
        <div>
          <Label class="mb-2">Vendor</Label>
          <Select bind:value={filterVendor}>
            <option value="">All Vendors</option>
            <option value="cisco">Cisco</option>
            <option value="mikrotik">MikroTik</option>
            <option value="fortigate">FortiGate</option>
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">Site</Label>
          <Select bind:value={filterSite}>
            <option value="">All Sites</option>
            {#each sites() as site}
              <option value={site}>{site}</option>
            {/each}
          </Select>
        </div>
        
        <div>
          <Label class="mb-2">Role</Label>
          <Select bind:value={filterRole}>
            <option value="">All Roles</option>
            <option value="core">Core</option>
            <option value="distribution">Distribution</option>
            <option value="access">Access</option>
            <option value="edge">Edge</option>
            <option value="firewall">Firewall</option>
            <option value="wan">WAN</option>
          </Select>
        </div>
      </div>
      
      {#if searchQuery || filterVendor || filterSite || filterRole}
        <div class="mt-3">
          <Button size="xs" color="alternative" on:click={clearFilters}>
            Clear Filters
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
      <p class="text-gray-500 dark:text-gray-400">No devices found</p>
      {#if devices.length === 0}
        <Button class="mt-4" on:click={() => showCreateModal = true}>
          <Plus class="w-4 h-4 mr-2" />
          Add your first device
        </Button>
      {/if}
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Table>
        <TableHead>
          <TableHeadCell>Name</TableHeadCell>
          <TableHeadCell>Vendor</TableHeadCell>
          <TableHeadCell>Role</TableHeadCell>
          <TableHeadCell>Site</TableHeadCell>
          <TableHeadCell>Management IP</TableHeadCell>
          <TableHeadCell>Last Snapshot</TableHeadCell>
          <TableHeadCell>Actions</TableHeadCell>
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
                  View
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
    <h3 class="text-xl font-semibold">Add New Device</h3>
  </svelte:fragment>
  
  {#if createError}
    <Alert color="red" class="mb-4">{createError}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="name" class="mb-2">Name *</Label>
      <Input id="name" bind:value={newDevice.name} required />
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="vendor" class="mb-2">Vendor *</Label>
        <Select id="vendor" bind:value={newDevice.vendor}>
          <option value="cisco">Cisco</option>
          <option value="mikrotik">MikroTik</option>
          <option value="fortigate">FortiGate</option>
        </Select>
      </div>
      
      <div>
        <Label for="role" class="mb-2">Role *</Label>
        <Select id="role" bind:value={newDevice.role}>
          <option value="core">Core</option>
          <option value="distribution">Distribution</option>
          <option value="access">Access</option>
          <option value="edge">Edge</option>
          <option value="firewall">Firewall</option>
          <option value="wan">WAN</option>
        </Select>
      </div>
    </div>
    
    <div>
      <Label for="mgmt_ip" class="mb-2">Management IP *</Label>
      <Input id="mgmt_ip" bind:value={newDevice.mgmt_ip} placeholder="192.168.1.1" required />
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="model" class="mb-2">Model</Label>
        <Input id="model" bind:value={newDevice.model} />
      </div>
      
      <div>
        <Label for="site" class="mb-2">Site</Label>
        <Input id="site" bind:value={newDevice.site} />
      </div>
    </div>
    
    <div>
      <Label for="os_version" class="mb-2">OS Version</Label>
      <Input id="os_version" bind:value={newDevice.os_version} />
    </div>
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showCreateModal = false}>Cancel</Button>
      <Button on:click={handleCreateDevice} disabled={creating || !newDevice.name || !newDevice.mgmt_ip}>
        {creating ? 'Creating...' : 'Create Device'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Import CSV Modal -->
<Modal bind:open={showImportModal}>
  <svelte:fragment slot="header">
    <h3 class="text-xl font-semibold">Import Devices from CSV</h3>
  </svelte:fragment>
  
  {#if importError}
    <Alert color="red" class="mb-4">{importError}</Alert>
  {/if}
  
  {#if importSuccess}
    <Alert color="green" class="mb-4">{importSuccess}</Alert>
  {/if}
  
  <div class="space-y-4">
    <div>
      <Label for="csv-file" class="mb-2">CSV File</Label>
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
      <p class="font-semibold mb-2">CSV Format:</p>
      <pre class="text-xs">name,vendor,model,os_version,site,role,mgmt_ip
core-sw-01,cisco,C9300,17.6.3,HQ,core,192.168.1.1</pre>
    </Alert>
  </div>
  
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showImportModal = false}>Cancel</Button>
      <Button on:click={handleImport} disabled={importing || !importFile}>
        {importing ? 'Importing...' : 'Import'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
