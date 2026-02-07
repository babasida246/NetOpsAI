<script lang="ts">
  import { Alert, Button, Input, Label, Modal, Select, Spinner } from 'flowbite-svelte';
  import type { AssetCreateInput, AssetStatus } from '$lib/api/assets';
  import type { AssetModel, CategorySpecDef } from '$lib/api/assetCatalogs';
  import { getCategorySpecDefs } from '$lib/api/assetCatalogs';
  import DynamicSpecForm from '$lib/assets/components/catalogs/DynamicSpecForm.svelte';
  import { _, isLoading } from '$lib/i18n';

  let {
    open = $bindable(false),
    models = [],
    vendors = [],
    locations = [],
    error = '',
    oncreate
  } = $props<{
    open?: boolean;
    models?: AssetModel[];
    vendors?: Array<{ id: string; name: string }>;
    locations?: Array<{ id: string; name: string }>;
    error?: string;
    oncreate?: (data: AssetCreateInput) => void;
  }>();

  let form = $state({
    assetCode: '',
    modelId: '',
    status: 'in_stock' as AssetStatus,
    vendorId: '',
    locationId: '',
    serialNo: '',
    macAddress: '',
    mgmtIp: '',
    hostname: '',
    notes: '',
    spec: {} as Record<string, unknown>
  });

  let selectedModel = $state<AssetModel | null>(null);
  let specDefs = $state<CategorySpecDef[]>([]);
  let specLoading = $state(false);
  let specError = $state('');

  async function loadSpecDefs(categoryId: string) {
    try {
      specLoading = true;
      specError = '';
      const response = await getCategorySpecDefs(categoryId);
      specDefs = response.data;
    } catch (err) {
      specDefs = [];
      specError = err instanceof Error ? err.message : 'Failed to load spec fields';
    } finally {
      specLoading = false;
    }
  }

  function reset() {
    form = {
      assetCode: '',
      modelId: '',
      status: 'in_stock',
      vendorId: '',
      locationId: '',
      serialNo: '',
      macAddress: '',
      mgmtIp: '',
      hostname: '',
      notes: '',
      spec: {}
    };
    selectedModel = null;
    specDefs = [];
    specError = '';
  }

  function submit() {
    oncreate?.({
      assetCode: form.assetCode,
      modelId: form.modelId,
      status: form.status,
      vendorId: form.vendorId || undefined,
      locationId: form.locationId || undefined,
      serialNo: form.serialNo || undefined,
      macAddress: form.macAddress || undefined,
      mgmtIp: form.mgmtIp || undefined,
      hostname: form.hostname || undefined,
      notes: form.notes || undefined,
      spec: Object.keys(form.spec).length > 0 ? form.spec : undefined
    });
  }

  $effect(() => {
    const modelId = form.modelId;
    if (!modelId) {
      selectedModel = null;
      specDefs = [];
      specError = '';
      return;
    }
    const model = models.find((m: AssetModel) => m.id === modelId);
    if (!model) {
      selectedModel = null;
      specDefs = [];
      return;
    }
    selectedModel = model;
    // Load spec from model as default
    form.spec = { ...(model.spec || {}) };
    // Load spec definitions if category exists
    if (model.categoryId) {
      loadSpecDefs(model.categoryId);
    } else {
      specDefs = [];
    }
  });
</script>

<Modal bind:open onclose={reset} size="lg">
  <svelte:fragment slot="header">
  
      <h3 class="text-xl font-semibold">{$isLoading ? 'Create Asset' : $_('assets.createAsset')}</h3>
    
  </svelte:fragment>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Asset Code' : $_('assets.assetCode')}</Label>
      <Input bind:value={form.assetCode} placeholder="ASSET-001" />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Model' : $_('assets.model')}</Label>
      <Select bind:value={form.modelId}>
        <option value="">{$isLoading ? 'Select model' : $_('assets.selectModel')}</option>
        {#each models as model}
          <option value={model.id}>{[model.brand, model.model].filter(Boolean).join(' ') || model.model}</option>
        {/each}
      </Select>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Status' : $_('assets.status')}</Label>
        <Select bind:value={form.status}>
          <option value="in_stock">{$isLoading ? 'In stock' : $_('assets.filters.inStock')}</option>
          <option value="in_use">{$isLoading ? 'In use' : $_('assets.filters.inUse')}</option>
          <option value="in_repair">{$isLoading ? 'In repair' : $_('assets.filters.inRepair')}</option>
          <option value="retired">{$isLoading ? 'Retired' : $_('assets.filters.retired')}</option>
          <option value="disposed">{$isLoading ? 'Disposed' : $_('assets.filters.disposed')}</option>
          <option value="lost">{$isLoading ? 'Lost' : $_('assets.filters.lost')}</option>
        </Select>
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Location' : $_('assets.location')}</Label>
        <Select bind:value={form.locationId}>
          <option value="">{$isLoading ? 'Select location' : $_('assets.selectLocation')}</option>
          {#each locations as location}
            <option value={location.id}>{location.name}</option>
          {/each}
        </Select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Vendor' : $_('assets.vendor')}</Label>
        <Select bind:value={form.vendorId}>
          <option value="">{$isLoading ? 'Select vendor' : $_('assets.selectVendor')}</option>
          {#each vendors as vendor}
            <option value={vendor.id}>{vendor.name}</option>
          {/each}
        </Select>
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Serial No' : $_('assets.serialNo')}</Label>
        <Input bind:value={form.serialNo} />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Hostname' : $_('assets.hostname')}</Label>
        <Input bind:value={form.hostname} />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Management IP' : $_('assets.managementIp')}</Label>
        <Input bind:value={form.mgmtIp} />
      </div>
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'MAC Address' : $_('assets.macAddress')}</Label>
      <Input bind:value={form.macAddress} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Notes' : $_('assets.notes')}</Label>
      <Input bind:value={form.notes} />
    </div>
    
    {#if selectedModel && selectedModel.categoryId}
      <div class="border-t pt-4 mt-4">
        <h4 class="text-sm font-semibold mb-3">{$isLoading ? 'Specifications' : 'Thông số kỹ thuật'}</h4>
        {#if specLoading}
          <div class="flex justify-center py-4">
            <Spinner size="6" />
          </div>
        {:else if specError}
          <Alert color="yellow" class="text-sm">{specError}</Alert>
        {:else if specDefs.length > 0}
          <DynamicSpecForm bind:spec={form.spec} {specDefs} />
        {:else}
          <p class="text-sm text-gray-500">{$isLoading ? 'No specifications defined' : 'Chưa có thông số kỹ thuật'}</p>
        {/if}
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
  
      <div class="flex justify-end gap-2">
        <Button color="alternative" onclick={() => open = false}>{$isLoading ? 'Cancel' : $_('common.cancel')}</Button>
        <Button onclick={submit} disabled={!form.assetCode || !form.modelId}>{$isLoading ? 'Create' : $_('common.create')}</Button>
      </div>
    
  </svelte:fragment>
</Modal>

