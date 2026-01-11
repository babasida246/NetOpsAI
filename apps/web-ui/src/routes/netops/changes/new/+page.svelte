<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button, Input, Label, Select, Textarea, Alert, Spinner, Badge } from 'flowbite-svelte';
  import { ArrowLeft, ArrowRight, Check } from 'lucide-svelte';
  import { changesApi, devicesApi } from '$lib/netops/api/netopsApi';
  import type { Device, RiskTier } from '$lib/netops/types';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  
  let devices: Device[] = $state([]);
  let loadingDevices = $state(true);
  
  let currentStep = $state(1);
  let creating = $state(false);
  let error = $state('');
  
  // Form data
  let title = $state('');
  let intentType = $state('');
  let riskTier = $state<RiskTier>('low');
  let deviceScope: string[] = $state([]);
  let params = $state('{}');
  
  const steps = [
    { number: 1, name: 'Basics', description: 'Title and intent type' },
    { number: 2, name: 'Scope', description: 'Select devices' },
    { number: 3, name: 'Parameters', description: 'Configure intent' },
    { number: 4, name: 'Review', description: 'Confirm and create' }
  ];
  
  const commonIntents = [
    { value: 'VLAN_CREATE_AND_TRUNK', label: 'Create VLAN and Trunk' },
    { value: 'FORTIGATE_POLICY_ALLOW_SERVICE_WITH_LOG', label: 'FortiGate Allow Policy with Logging' },
    { value: 'FORTIGATE_NAT_SNAT_DNAT', label: 'FortiGate NAT (SNAT/DNAT)' },
    { value: 'CUSTOM', label: 'Custom Intent' }
  ];
  
  const canGoNext = $derived(() => {
    if (currentStep === 1) return title && intentType;
    if (currentStep === 2) return deviceScope.length > 0;
    if (currentStep === 3) return true; // Params optional
    if (currentStep === 4) return true;
    return false;
  });
  
  function toggleDevice(deviceId: string) {
    if (deviceScope.includes(deviceId)) {
      deviceScope = deviceScope.filter(id => id !== deviceId);
    } else {
      deviceScope = [...deviceScope, deviceId];
    }
  }
  
  function getIntentParams(): Record<string, unknown> {
    try {
      return JSON.parse(params);
    } catch {
      return {};
    }
  }
  
  function getDefaultParams(intent: string): string {
    const templates: Record<string, Record<string, unknown>> = {
      VLAN_CREATE_AND_TRUNK: {
        vlan_id: 100,
        vlan_name: 'NewVLAN',
        trunk_interface: 'GigabitEthernet0/1'
      },
      FORTIGATE_POLICY_ALLOW_SERVICE_WITH_LOG: {
        policy_name: 'Allow-Service',
        src_zone: 'internal',
        dst_zone: 'dmz',
        service: 'HTTP',
        log_enabled: true
      },
      FORTIGATE_NAT_SNAT_DNAT: {
        nat_type: 'SNAT',
        src_interface: 'port1',
        dst_interface: 'port2',
        external_ip: '203.0.113.10'
      }
    };
    
    return JSON.stringify(templates[intent] || {}, null, 2);
  }
  
  $effect(() => {
    if (intentType && intentType !== 'CUSTOM' && params === '{}') {
      params = getDefaultParams(intentType);
    }
  });
  
  async function loadDevices() {
    try {
      loadingDevices = true;
      devices = await devicesApi.list();
    } catch (e) {
      console.error('Failed to load devices:', e);
    } finally {
      loadingDevices = false;
    }
  }
  
  async function handleCreate() {
    try {
      creating = true;
      error = '';
      
      const change = await changesApi.create({
        title,
        intent_type: intentType,
        params: getIntentParams(),
        device_scope: deviceScope,
        risk_tier: riskTier,
        created_by: 'user' // TODO: Get from auth context
      });
      
      goto(`/netops/changes/${change.id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create change';
    } finally {
      creating = false;
    }
  }
  
  onMount(() => {
    loadDevices();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Back button -->
  <div class="mb-4">
    <Button href="/netops/changes" color="alternative" size="sm">
      <ArrowLeft class="w-4 h-4 mr-2" />
      Back to Changes
    </Button>
  </div>
  
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold mb-2">Create Change Request</h1>
    <p class="text-gray-600 dark:text-gray-400">
      Define your network change intent and scope
    </p>
  </div>
  
  <!-- Stepper -->
  <div class="mb-8">
    <div class="flex justify-between">
      {#each steps as step}
        <div class="flex-1 {step.number < steps.length ? 'relative' : ''}">
          <div class="flex flex-col items-center">
            <div class="
              w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
              {step.number <= currentStep 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
            ">
              {#if step.number < currentStep}
                <Check class="w-5 h-5" />
              {:else}
                {step.number}
              {/if}
            </div>
            <div class="text-center mt-2">
              <p class="text-sm font-medium">{step.name}</p>
              <p class="text-xs text-gray-500 hidden sm:block">{step.description}</p>
            </div>
          </div>
          {#if step.number < steps.length}
            <div class="
              absolute top-5 left-1/2 w-full h-0.5 -ml-[50%]
              {step.number < currentStep ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
            "></div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  
  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  
  <!-- Step Content -->
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
    {#if currentStep === 1}
      <div class="space-y-4">
        <h2 class="text-lg font-semibold mb-4">Basic Information</h2>
        
        <div>
          <Label for="title" class="mb-2">Title *</Label>
          <Input
            id="title"
            bind:value={title}
            placeholder="e.g., Add VLAN 100 for PACS network"
            required
          />
        </div>
        
        <div>
          <Label for="intent" class="mb-2">Intent Type *</Label>
          <Select id="intent" bind:value={intentType}>
            <option value="">Select intent type...</option>
            {#each commonIntents as intent}
              <option value={intent.value}>{intent.label}</option>
            {/each}
          </Select>
        </div>
        
        <div>
          <Label for="risk" class="mb-2">Risk Tier</Label>
          <Select id="risk" bind:value={riskTier}>
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </Select>
          <p class="text-xs text-gray-500 mt-1">
            Risk tier determines approval requirements
          </p>
        </div>
      </div>
    {:else if currentStep === 2}
      <div>
        <h2 class="text-lg font-semibold mb-4">Select Devices</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose devices this change will affect
        </p>
        
        {#if loadingDevices}
          <div class="flex justify-center py-8">
            <Spinner />
          </div>
        {:else if devices.length === 0}
          <Alert color="blue">
            No devices available. Add devices first before creating changes.
          </Alert>
        {:else}
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each devices as device}
              <label class="
                flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg
                cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50
                {deviceScope.includes(device.id) ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : ''}
              ">
                <input
                  type="checkbox"
                  checked={deviceScope.includes(device.id)}
                  onchange={() => toggleDevice(device.id)}
                  class="w-4 h-4 text-primary-600"
                />
                <div class="flex-1">
                  <div class="font-medium">{device.name}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <StatusBadge type="vendor" value={device.vendor} />
                    {#if device.role}
                      <StatusBadge type="role" value={device.role} />
                    {/if}
                    <span class="text-sm text-gray-500">{device.mgmt_ip}</span>
                  </div>
                </div>
              </label>
            {/each}
          </div>
          
          {#if deviceScope.length > 0}
            <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                Selected: {deviceScope.length} {deviceScope.length === 1 ? 'device' : 'devices'}
              </p>
            </div>
          {/if}
        {/if}
      </div>
    {:else if currentStep === 3}
      <div>
        <h2 class="text-lg font-semibold mb-4">Intent Parameters</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure parameters for this change intent
        </p>
        
        <div>
          <Label for="params" class="mb-2">Parameters (JSON)</Label>
          <Textarea
            id="params"
            bind:value={params}
            rows={12}
            class="font-mono text-sm"
          />
          <p class="text-xs text-gray-500 mt-1">
            Provide intent-specific parameters in JSON format
          </p>
        </div>
      </div>
    {:else if currentStep === 4}
      <div>
        <h2 class="text-lg font-semibold mb-4">Review and Confirm</h2>
        
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Title</p>
            <p class="text-lg">{title}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Intent Type</p>
            <p>{intentType}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Risk Tier</p>
            <StatusBadge type="risk" value={riskTier} />
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Devices ({deviceScope.length})
            </p>
            <div class="flex flex-wrap gap-2">
              {#each deviceScope as deviceId}
                {@const device = devices.find(d => d.id === deviceId)}
                {#if device}
                  <Badge color="dark">{device.name}</Badge>
                {/if}
              {/each}
            </div>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Parameters</p>
            <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto">{params}</pre>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Navigation -->
  <div class="flex justify-between">
    <Button
      color="alternative"
      on:click={() => currentStep > 1 ? currentStep-- : goto('/netops/changes')}
    >
      <ArrowLeft class="w-4 h-4 mr-2" />
      {currentStep === 1 ? 'Cancel' : 'Previous'}
    </Button>
    
    {#if currentStep < 4}
      <Button
        on:click={() => currentStep++}
        disabled={!canGoNext()}
      >
        Next
        <ArrowRight class="w-4 h-4 ml-2" />
      </Button>
    {:else}
      <Button on:click={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create Change'}
      </Button>
    {/if}
  </div>
</div>
