<script lang="ts">
  import { Button, Input, Select } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';

  export type CmdbFieldDraft = {
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    isSearchable: boolean;
    isFilterable: boolean;
    enumValues: string;
  };

  let {
    draft = $bindable<CmdbFieldDraft>({
      key: '',
      label: '',
      fieldType: 'string',
      required: false,
      isSearchable: false,
      isFilterable: false,
      enumValues: ''
    }),
    fieldTypes = [],
    disabled = false,
    saving = false,
    onSave = () => {},
    onClear = () => {}
  } = $props<{
    draft?: CmdbFieldDraft;
    fieldTypes?: string[];
    disabled?: boolean;
    saving?: boolean;
    onSave?: () => void;
    onClear?: () => void;
  }>();
</script>

<div class="space-y-2">
  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{$isLoading ? 'Add / Edit Attribute' : $_('cmdb.type.addEditAttribute')}</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label for="attr-key" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Key' : $_('cmdb.type.key')}</label>
      <Input
        id="attr-key"
        bind:value={draft.key}
        placeholder={$isLoading ? 'hostname' : $_('cmdb.type.placeholders.key')}
      />
    </div>
    <div>
      <label for="attr-label" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Label' : $_('cmdb.type.label')}</label>
      <Input
        id="attr-label"
        bind:value={draft.label}
        placeholder={$isLoading ? 'Hostname' : $_('cmdb.type.placeholders.hostname')}
      />
    </div>
    <div>
      <label for="attr-type" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Type' : $_('cmdb.type.type')}</label>
      <Select id="attr-type" bind:value={draft.fieldType}>
        {#each fieldTypes as typeOption}
          <option value={typeOption}>{typeOption}</option>
        {/each}
      </Select>
    </div>
    <div>
      <label for="attr-enum" class="text-sm font-medium text-slate-700 dark:text-slate-300">{$isLoading ? 'Enum values' : $_('cmdb.type.enumValues')}</label>
      <Input id="attr-enum" bind:value={draft.enumValues} placeholder={$isLoading ? 'a, b, c' : $_('cmdb.type.placeholders.enumValues')} />
    </div>
    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" checked={draft.required} onchange={(e) => draft.required = (e.currentTarget as HTMLInputElement).checked} />
      {$isLoading ? 'Required' : $_('cmdb.type.required')}
    </label>
    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" checked={draft.isSearchable} onchange={(e) => draft.isSearchable = (e.currentTarget as HTMLInputElement).checked} />
      {$isLoading ? 'Searchable' : $_('cmdb.type.searchable')}
    </label>
    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" checked={draft.isFilterable} onchange={(e) => draft.isFilterable = (e.currentTarget as HTMLInputElement).checked} />
      {$isLoading ? 'Filterable' : $_('cmdb.type.filterable')}
    </label>
  </div>
  <div class="flex gap-2">
    <Button onclick={onSave} disabled={disabled || !draft.key || !draft.label || saving}>{$isLoading ? 'Save' : $_('common.save')}</Button>
    <Button color="alternative" onclick={onClear}>{$isLoading ? 'Clear' : $_('common.clear')}</Button>
  </div>
</div>
