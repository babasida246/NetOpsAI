<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Alert, Button, Modal, Spinner } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import SpecWarnings from './SpecWarnings.svelte';
  import SpecVersionControls from './SpecVersionControls.svelte';
  import SpecDefsManager from './SpecDefsManager.svelte';
  import {
    createCategorySpecVersion,
    getCategorySpecVersions,
    getSpecDefsByVersion,
    publishSpecVersion,
    type CategorySpecDef,
    type CategorySpecVersion
  } from '$lib/api/assetCatalogs';

  type CategoryRef = { id: string; name: string };

  let { open = $bindable(false), category = null } = $props<{ open?: boolean; category?: CategoryRef | null }>();
  const dispatch = createEventDispatcher<{ updated: void; error: string }>();

  let specDefs = $state<CategorySpecDef[]>([]);
  let versions = $state<CategorySpecVersion[]>([]);
  let selectedVersionId = $state('');
  let publishWarnings = $state<Array<{ modelId: string; modelName: string; missingKeys: string[] }>>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state('');
  let lastCategoryId = $state<string | null>(null);

  const selectedVersion = $derived(versions.find((version) => version.id === selectedVersionId) ?? null);
  const canEdit = $derived(selectedVersion?.status === 'draft');
  const canApplyTemplate = $derived(selectedVersion?.status === 'active');

  $effect(() => {
    if (!open || !category) return;
    if (category.id === lastCategoryId && versions.length > 0) return;
    lastCategoryId = category.id;
    loadVersions();
  });

  async function loadVersions() {
    if (!category) return;
    try {
      loading = true;
      error = '';
      publishWarnings = [];
      const response = await getCategorySpecVersions(category.id);
      versions = response.data;
      const draft = versions.find((version) => version.status === 'draft');
      const active = versions.find((version) => version.status === 'active');
      selectedVersionId = draft?.id ?? active?.id ?? versions[0]?.id ?? '';
      if (selectedVersionId) {
        await loadDefs(selectedVersionId);
      } else {
        specDefs = [];
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spec versions';
      error = message;
      dispatch('error', message);
    } finally {
      loading = false;
    }
  }

  async function loadDefs(versionId: string) {
    try {
      loading = true;
      error = '';
      const response = await getSpecDefsByVersion(versionId);
      specDefs = response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spec fields';
      error = message;
      dispatch('error', message);
    } finally {
      loading = false;
    }
  }

  async function handleSelect(versionId: string) {
    if (!versionId) return;
    selectedVersionId = versionId;
    await loadDefs(versionId);
  }

  async function handleUpdated() {
    if (selectedVersionId) {
      await loadDefs(selectedVersionId);
    }
    dispatch('updated');
  }

  async function createDraft() {
    if (!category) return;
    try {
      saving = true;
      error = '';
      const response = await createCategorySpecVersion(category.id);
      versions = [response.data.version, ...versions];
      selectedVersionId = response.data.version.id;
      specDefs = response.data.specDefs ?? [];
      dispatch('updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create draft';
      error = message;
      dispatch('error', message);
    } finally {
      saving = false;
    }
  }

  async function publishVersion() {
    if (!selectedVersionId) return;
    try {
      saving = true;
      error = '';
      const response = await publishSpecVersion(selectedVersionId);
      publishWarnings = response.data.warnings ?? [];
      await loadVersions();
      dispatch('updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish version';
      error = message;
      dispatch('error', message);
    } finally {
      saving = false;
    }
  }

  function closePanel() {
    open = false;
    error = '';
    specDefs = [];
    versions = [];
    selectedVersionId = '';
    publishWarnings = [];
    lastCategoryId = null;
  }
</script>

<Modal bind:open size="xl" on:close={closePanel}>
  <svelte:fragment slot="header">
    <div>
      <h3 class="text-lg font-semibold">{$isLoading ? 'Spec Fields' : $_('assets.specFields')}</h3>
      <p class="text-sm text-gray-500">{category ? `Category: ${category.name}` : ''}</p>
    </div>
  </svelte:fragment>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}
  <SpecWarnings warnings={publishWarnings} />

  <div class="space-y-4">
    <SpecVersionControls
      versions={versions}
      bind:selectedVersionId
      saving={saving}
      on:select={(event) => handleSelect(event.detail)}
      on:createDraft={createDraft}
      on:publish={publishVersion}
    />

    {#if selectedVersion && !canEdit}
      <Alert color="blue" class="mb-4">
        This version is read-only. Create a draft to edit spec fields.
      </Alert>
    {/if}

    {#if loading}
      <div class="flex justify-center py-6">
        <Spinner size="6" />
      </div>
    {:else}
      <SpecDefsManager
        specDefs={specDefs}
        categoryId={category?.id ?? ''}
        selectedVersionId={selectedVersionId}
        disabled={!canEdit}
        canApplyTemplate={canApplyTemplate}
        on:updated={handleUpdated}
        on:error={(event) => dispatch('error', event.detail)}
      />
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end">
      <Button color="alternative" on:click={closePanel}>{$isLoading ? 'Close' : $_('common.close')}</Button>
    </div>
  </svelte:fragment>
</Modal>
