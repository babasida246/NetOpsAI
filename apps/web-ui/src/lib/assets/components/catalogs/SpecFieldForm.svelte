<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { Input, Label, Select, Textarea } from 'flowbite-svelte';
  import type { SpecFieldType } from '$lib/api/assetCatalogs';

  type SpecFieldDraft = {
    key: string;
    label: string;
    fieldType: SpecFieldType;
    required: boolean;
    unit: string;
    enumValues: string;
    pattern: string;
    minLen: string;
    maxLen: string;
    minValue: string;
    maxValue: string;
    stepValue: string;
    precision: string;
    scale: string;
    normalize: string;
    defaultValue: string;
    helpText: string;
    sortOrder: string;
    isReadonly: boolean;
    computedExpr: string;
    isSearchable: boolean;
    isFilterable: boolean;
  };

  const fieldTypes: Array<{ value: SpecFieldType; label: string }> = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'enum', label: 'Enum' },
    { value: 'date', label: 'Date' },
    { value: 'ip', label: 'IP Address' },
    { value: 'mac', label: 'MAC Address' },
    { value: 'hostname', label: 'Hostname' },
    { value: 'cidr', label: 'CIDR' },
    { value: 'port', label: 'Port' },
    { value: 'regex', label: 'Regex' },
    { value: 'json', label: 'JSON' },
    { value: 'multi_enum', label: 'Multi Enum' }
  ];

  const emptyDraft: SpecFieldDraft = {
    key: '',
    label: '',
    fieldType: 'string',
    required: false,
    unit: '',
    enumValues: '',
    pattern: '',
    minLen: '',
    maxLen: '',
    minValue: '',
    maxValue: '',
    stepValue: '',
    precision: '',
    scale: '',
    normalize: '',
    defaultValue: '',
    helpText: '',
    sortOrder: '',
    isReadonly: false,
    computedExpr: '',
    isSearchable: false,
    isFilterable: false
  };

  let { draft = $bindable<SpecFieldDraft>({ ...emptyDraft }) } = $props<{ draft?: SpecFieldDraft }>();

  const enumTypes: SpecFieldType[] = ['enum', 'multi_enum'];
  const numberTypes: SpecFieldType[] = ['number', 'port'];
  const stringTypes: SpecFieldType[] = ['string', 'hostname', 'mac', 'ip', 'cidr', 'regex'];

  function handleFieldTypeChange(event: Event) {
    const next = (event.currentTarget as HTMLSelectElement).value as SpecFieldType;
    draft.fieldType = next;
    if (!enumTypes.includes(next)) {
      draft.enumValues = '';
    }
    if (!numberTypes.includes(next)) {
      draft.minValue = '';
      draft.maxValue = '';
      draft.stepValue = '';
      draft.precision = '';
      draft.scale = '';
    }
    if (!stringTypes.includes(next)) {
      draft.pattern = '';
      draft.minLen = '';
      draft.maxLen = '';
      draft.normalize = '';
    }
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Label' : $_('assets.label')}</Label>
      <Input name="label" bind:value={draft.label} placeholder={$isLoading ? 'Memory Size' : $_('assets.placeholders.memorySize')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Key' : $_('assets.key')}</Label>
      <Input name="key" bind:value={draft.key} placeholder="memorySizeGb" />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Type' : $_('assets.type')}</Label>
      <Select name="fieldType" bind:value={draft.fieldType} onchange={handleFieldTypeChange}>
        {#each fieldTypes as field}
          <option value={field.value}>{field.label}</option>
        {/each}
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Unit' : $_('assets.unit')}</Label>
      <Input name="unit" bind:value={draft.unit} placeholder="GB" />
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Sort Order' : $_('assets.sortOrder')}</Label>
      <Input name="sortOrder" type="number" bind:value={draft.sortOrder} placeholder="0" />
    </div>
    <div class="flex items-end">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input name="required" type="checkbox" class="rounded border-gray-300" bind:checked={draft.required} />
        {$isLoading ? 'Required' : $_('common.required')}
      </label>
    </div>
    <div class="flex items-end">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input name="isReadonly" type="checkbox" class="rounded border-gray-300" bind:checked={draft.isReadonly} />
        {$isLoading ? 'Readonly' : $_('assets.readonly')}
      </label>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <label class="flex items-center gap-2 text-sm text-gray-600">
      <input name="isSearchable" type="checkbox" class="rounded border-gray-300" bind:checked={draft.isSearchable} />
      {$isLoading ? 'Searchable' : $_('assets.searchable')}
    </label>
    <label class="flex items-center gap-2 text-sm text-gray-600">
      <input name="isFilterable" type="checkbox" class="rounded border-gray-300" bind:checked={draft.isFilterable} />
      {$isLoading ? 'Filterable' : $_('assets.filterable')}
    </label>
  </div>

  {#if enumTypes.includes(draft.fieldType)}
    <div>
      <Label class="mb-2">{$isLoading ? 'Enum Values' : $_('assets.enumValues')}</Label>
      <Input name="enumValues" bind:value={draft.enumValues} placeholder="DDR3, DDR4, DDR5" />
      <p class="text-xs text-gray-500 mt-1">Comma separated values.</p>
    </div>
  {/if}

  {#if numberTypes.includes(draft.fieldType)}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Min' : $_('assets.min')}</Label>
        <Input name="minValue" type="number" bind:value={draft.minValue} placeholder="0" />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Max' : $_('assets.max')}</Label>
        <Input name="maxValue" type="number" bind:value={draft.maxValue} placeholder="1024" />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Step' : $_('assets.step')}</Label>
        <Input name="stepValue" type="number" bind:value={draft.stepValue} placeholder="1" />
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Precision' : $_('assets.precision')}</Label>
        <Input name="precision" type="number" bind:value={draft.precision} placeholder="10" />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Scale' : $_('assets.scale')}</Label>
        <Input name="scale" type="number" bind:value={draft.scale} placeholder="2" />
      </div>
    </div>
  {/if}

  {#if stringTypes.includes(draft.fieldType)}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label class="mb-2">{$isLoading ? 'Min Length' : $_('assets.minLength')}</Label>
        <Input name="minLen" type="number" bind:value={draft.minLen} placeholder="0" />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Max Length' : $_('assets.maxLength')}</Label>
        <Input name="maxLen" type="number" bind:value={draft.maxLen} placeholder="255" />
      </div>
      <div>
        <Label class="mb-2">{$isLoading ? 'Normalize' : $_('assets.normalize')}</Label>
        <Select name="normalize" bind:value={draft.normalize}>
          <option value="">{$isLoading ? 'None' : $_('assets.normalizeOptions.none')}</option>
          <option value="trim">{$isLoading ? 'Trim' : $_('assets.normalizeOptions.trim')}</option>
          <option value="upper">{$isLoading ? 'Upper' : $_('assets.normalizeOptions.upper')}</option>
          <option value="lower">{$isLoading ? 'Lower' : $_('assets.normalizeOptions.lower')}</option>
        </Select>
      </div>
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Pattern' : $_('assets.pattern')}</Label>
      <Input name="pattern" bind:value={draft.pattern} placeholder="^[A-Z0-9-]+$" />
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label class="mb-2">{$isLoading ? 'Default Value' : $_('assets.defaultValue')}</Label>
      <Input name="defaultValue" bind:value={draft.defaultValue} placeholder={$isLoading ? 'Optional default value' : $_('assets.placeholders.optionalDefaultValue')} />
    </div>
    <div>
      <Label class="mb-2">{$isLoading ? 'Help Text' : $_('assets.helpText')}</Label>
      <Textarea name="helpText" rows={2} bind:value={draft.helpText} placeholder={$isLoading ? 'Describe how to fill this field' : $_('assets.placeholders.helpTextDescription')} />
    </div>
  </div>

  <div>
    <Label class="mb-2">{$isLoading ? 'Computed Expression' : $_('assets.computedExpression')}</Label>
    <Input name="computedExpr" bind:value={draft.computedExpr} placeholder="modelName.capacityGb" />
    <p class="text-xs text-gray-500 mt-1">Optional hint for auto-extraction.</p>
  </div>
</div>
