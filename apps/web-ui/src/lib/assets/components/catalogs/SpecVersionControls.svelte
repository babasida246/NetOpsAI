<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Label, Select } from 'flowbite-svelte';
  import type { CategorySpecVersion } from '$lib/api/assetCatalogs';

  let {
    versions = [],
    selectedVersionId = $bindable(''),
    saving = false
  } = $props<{
    versions?: CategorySpecVersion[];
    selectedVersionId?: string;
    saving?: boolean;
  }>();

  const dispatch = createEventDispatcher<{
    select: string;
    createDraft: void;
    publish: void;
  }>();

  const selectedVersion = $derived(versions.find((version) => version.id === selectedVersionId) ?? null);

  function handleSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    selectedVersionId = value;
    dispatch('select', value);
  }
</script>

<div class="flex flex-wrap gap-3 items-center">
  <div class="min-w-[220px]">
    <Label class="mb-2">Spec Version</Label>
    <Select bind:value={selectedVersionId} on:change={handleSelect}>
      <option value="" disabled>Select version</option>
      {#each versions as version}
        <option value={version.id}>
          v{version.version} ({version.status})
        </option>
      {/each}
    </Select>
  </div>
  <div class="flex gap-2 items-end">
    <Button size="sm" color="alternative" on:click={() => dispatch('createDraft')} disabled={saving}>
      New Draft
    </Button>
    {#if selectedVersion?.status === 'draft'}
      <Button size="sm" on:click={() => dispatch('publish')} disabled={saving}>
        Publish
      </Button>
    {/if}
  </div>
</div>
