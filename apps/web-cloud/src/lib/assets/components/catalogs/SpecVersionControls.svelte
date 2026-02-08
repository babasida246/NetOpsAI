<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { Button, Label, Select } from 'flowbite-svelte';
  import type { CategorySpecVersion } from '$lib/api/assetCatalogs';

  let {
    versions = [],
    selectedVersionId = $bindable(''),
    saving = false,
    onselect,
    oncreatedraft,
    onpublish
  } = $props<{
    versions?: CategorySpecVersion[];
    selectedVersionId?: string;
    saving?: boolean;
    onselect?: (id: string) => void;
    oncreatedraft?: () => void;
    onpublish?: () => void;
  }>();

  const selectedVersion = $derived(versions.find((version: CategorySpecVersion) => version.id === selectedVersionId) ?? null);

  function handleSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    selectedVersionId = value;
    onselect?.(value);
  }
</script>

<div class="flex flex-wrap gap-3 items-center">
  <div class="min-w-[220px]">
    <Label class="mb-2">{$isLoading ? 'Spec Version' : $_('assets.specVersion')}</Label>
    <Select bind:value={selectedVersionId} onchange={handleSelect}>
      <option value="" disabled>{$isLoading ? 'Select version' : $_('assets.selectVersion')}</option>
      {#each versions as version}
        <option value={version.id}>
          v{version.version} ({version.status})
        </option>
      {/each}
    </Select>
  </div>
  <div class="flex gap-2 items-end">
    <Button size="sm" color="alternative" onclick={oncreatedraft} disabled={saving}>
      {$isLoading ? 'New Draft' : $_('assets.newDraft')}
    </Button>
    {#if selectedVersion?.status === 'draft'}
      <Button size="sm" onclick={onpublish} disabled={saving}>
        {$isLoading ? 'Publish' : $_('assets.publish')}
      </Button>
    {/if}
  </div>
</div>
