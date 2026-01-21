<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Input, Label, Select, Textarea, Alert, Spinner, Badge } from 'flowbite-svelte';
  import { ArrowLeft, ArrowRight, Check } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
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
    { number: 1, key: 'basics' },
    { number: 2, key: 'scope' },
    { number: 3, key: 'parameters' },
    { number: 4, key: 'review' }
  ];
  
  const commonIntents = [
    { value: 'VLAN_CREATE_AND_TRUNK', label: '' },
    { value: 'FORTIGATE_POLICY_ALLOW_SERVICE_WITH_LOG', label: '' },
    { value: 'FORTIGATE_NAT_SNAT_DNAT', label: '' },
    { value: 'CUSTOM', label: '' }
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
  
  $effect(() => {
    void loadDevices();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Back button -->
  <div class="mb-4">
    <Button href="/netops/changes" color="alternative" size="sm">
      <ArrowLeft class="w-4 h-4 mr-2" />
      {$isLoading ? 'Back to Changes' : $_('netops.changeForm.back')}
    </Button>
  </div>
  
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold mb-2">{$isLoading ? 'Create Change Request' : $_('netops.changeForm.title')}</h1>
    <p class="text-gray-600 dark:text-gray-400">
      {$isLoading ? 'Define your network change intent and scope' : $_('netops.changeForm.subtitle')}
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
              <p class="text-sm font-medium">{$isLoading ? (step.key === 'basics' ? 'Basics' : step.key === 'scope' ? 'Scope' : step.key === 'parameters' ? 'Parameters' : 'Review') : $_('netops.changeForm.steps.' + step.key)}</p>
              <p class="text-xs text-gray-500 hidden sm:block">{$isLoading ? (step.key === 'basics' ? 'Title and intent type' : step.key === 'scope' ? 'Select devices' : step.key === 'parameters' ? 'Configure intent' : 'Confirm and create') : $_('netops.changeForm.stepDescriptions.' + step.key)}</p>
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
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Basics' : $_('netops.changeForm.steps.basics')}</h2>
        
        <div>
          <Label for="title" class="mb-2">{$isLoading ? 'Title' : $_('netops.changeForm.fields.title')} *</Label>
          <Input
            id="title"
            bind:value={title}
            placeholder={$isLoading ? 'e.g., Add VLAN 100 for PACS network' : $_('netops.changeForm.fields.titlePlaceholder')}
            required
          />
        </div>
        
        <div>
          <Label for="intent" class="mb-2">{$isLoading ? 'Intent Type' : $_('netops.changeForm.fields.intentType')} *</Label>
          <Select id="intent" bind:value={intentType}>
            <option value="">{$isLoading ? 'Select intent type...' : $_('netops.changeForm.fields.intentPlaceholder')}</option>
            {#each commonIntents as intent}
              <option value={intent.value}>{$isLoading ? intent.value : $_('netops.changeForm.intents.' + intent.value)}</option>
            {/each}
          </Select>
        </div>
        
        <div>
          <Label for="risk" class="mb-2">{$isLoading ? 'Risk Tier' : $_('netops.changeForm.fields.riskTier')}</Label>
          <Select id="risk" bind:value={riskTier}>
            <option value="low">{$isLoading ? 'Low' : $_('netops.changesPage.risks.low')}</option>
            <option value="med">{$isLoading ? 'Medium' : $_('netops.changesPage.risks.med')}</option>
            <option value="high">{$isLoading ? 'High' : $_('netops.changesPage.risks.high')}</option>
          </Select>
          <p class="text-xs text-gray-500 mt-1">
            {$isLoading ? 'Risk tier determines approval requirements' : $_('netops.changeForm.fields.riskNote')}
          </p>
        </div>
      </div>
    {:else if currentStep === 2}
      <div>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Select Devices' : $_('netops.changeForm.fields.selectDevices')}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {$isLoading ? 'Choose devices this change will affect' : $_('netops.changeForm.fields.selectDevicesSubtitle')}
        </p>
        
        {#if loadingDevices}
          <div class="flex justify-center py-8">
            <Spinner />
          </div>
        {:else if devices.length === 0}
          <Alert color="blue">{$isLoading ? 'No devices available. Add devices first before creating changes.' : $_('netops.changeForm.alerts.noDevices')}</Alert>
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
                {$isLoading ? `Selected: ${deviceScope.length} devices` : $_('netops.changeForm.alerts.selectedDevices', { count: deviceScope.length })}
              </p>
            </div>
          {/if}
        {/if}
      </div>
    {:else if currentStep === 3}
      <div>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Intent Parameters' : $_('netops.changeForm.fields.intentParameters')}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {$isLoading ? 'Configure parameters for this change intent' : $_('netops.changeForm.fields.parametersHelp')}
        </p>
        
        <div>
          <Label for="params" class="mb-2">{$isLoading ? 'Parameters (JSON)' : $_('netops.changeForm.fields.parameters')}</Label>
          <Textarea
            id="params"
            bind:value={params}
            rows={12}
            class="font-mono text-sm"
          />
          <p class="text-xs text-gray-500 mt-1">{$isLoading ? 'Provide intent-specific parameters in JSON format' : $_('netops.changeForm.fields.parametersHelp')}</p>
        </div>
      </div>
    {:else if currentStep === 4}
      <div>
        <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Review and Confirm' : $_('netops.changeForm.fields.reviewConfirm')}</h2>
        
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{$isLoading ? 'Title' : $_('netops.changeForm.fields.title')}</p>
            <p class="text-lg">{title}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{$isLoading ? 'Intent Type' : $_('netops.changeForm.fields.intentType')}</p>
            <p>{intentType}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{$isLoading ? 'Risk Tier' : $_('netops.changeForm.fields.riskTier')}</p>
            <StatusBadge type="risk" value={riskTier} />
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{$isLoading ? `Devices (${deviceScope.length})` : `${$_('netops.changeForm.fields.devices')} (${deviceScope.length})`}</p>
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
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{$isLoading ? 'Parameters' : $_('netops.changeForm.fields.parametersLabel')}</p>
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
      {currentStep === 1 ? ($isLoading ? 'Cancel' : $_('netops.changeForm.cta.cancel')) : ($isLoading ? 'Previous' : $_('netops.changeForm.cta.previous'))}
    </Button>
    
    {#if currentStep < 4}
      <Button
        on:click={() => currentStep++}
        disabled={!canGoNext()}
      >
        {$isLoading ? 'Next' : $_('netops.changeForm.cta.next')}
        <ArrowRight class="w-4 h-4 ml-2" />
      </Button>
    {:else}
      <Button on:click={handleCreate} disabled={creating}>
        {creating ? ($isLoading ? 'Creating...' : $_('netops.changeForm.cta.creating')) : ($isLoading ? 'Create Change' : $_('netops.changeForm.cta.create'))}
      </Button>
    {/if}
  </div>
</div>
