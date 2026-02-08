<script lang="ts">
  import { Button, Badge, Modal, Select, Label, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Checkbox } from 'flowbite-svelte';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { 
    listCiRelationships, 
    createCiRelationship, 
    deleteRelationship,
    listRelationshipTypes,
    listCis
  } from '$lib/api/cmdb';
  import type { RelationshipRecord, RelationshipTypeRecord, CiRecord } from '$lib/api/cmdb';

  interface Props {
    ciId: string;
    ciName?: string;
  }

  let { ciId, ciName = 'CI' }: Props = $props();

  // State
  let relationships = $state<RelationshipRecord[]>([]);
  let relationshipTypes = $state<RelationshipTypeRecord[]>([]);
  let allCis = $state<CiRecord[]>([]);
  let loading = $state(false);
  let error = $state('');
  
  // Modal state
  let showModal = $state(false);
  let saving = $state(false);
  let selectedRelTypeId = $state('');
  let selectedTargetCiId = $state('');
  let relationshipNote = $state('');
  let isOutgoing = $state(true); // true = this CI is source, false = this CI is target

  // Load data
  async function loadRelationships() {
    try {
      loading = true;
      error = '';
      const response = await listCiRelationships(ciId);
      relationships = response.data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load relationships';
      console.error('Error loading relationships:', err);
    } finally {
      loading = false;
    }
  }

  async function loadRelationshipTypes() {
    try {
      const response = await listRelationshipTypes();
      relationshipTypes = response.data;
    } catch (err) {
      console.error('Error loading relationship types:', err);
    }
  }

  async function loadCis() {
    try {
      const response = await listCis({ limit: 1000 }); // Get all CIs for selection
      allCis = response.data.filter((ci: CiRecord) => ci.id !== ciId); // Exclude current CI
    } catch (err) {
      console.error('Error loading CIs:', err);
    }
  }

  $effect(() => {
    void loadRelationships();
    void loadRelationshipTypes();
    void loadCis();
  });

  // Helpers
  function getRelTypeName(relTypeId: string): string {
    const type = relationshipTypes.find(t => t.id === relTypeId);
    return type?.name || relTypeId;
  }

  function getRelTypeReverseName(relTypeId: string): string {
    const type = relationshipTypes.find(t => t.id === relTypeId);
    return type?.reverseName || getRelTypeName(relTypeId);
  }

  function getCiName(id: string): string {
    const ci = allCis.find(c => c.id === id);
    return ci ? `${ci.name} (${ci.ciCode})` : id;
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }

  // Actions
  function openCreateModal() {
    selectedRelTypeId = '';
    selectedTargetCiId = '';
    relationshipNote = '';
    isOutgoing = true;
    showModal = true;
  }

  async function handleCreate() {
    if (!selectedRelTypeId || !selectedTargetCiId) {
      error = 'Please select relationship type and target CI';
      return;
    }

    try {
      saving = true;
      error = '';

      const payload = {
        relTypeId: selectedRelTypeId,
        fromCiId: isOutgoing ? ciId : selectedTargetCiId,
        toCiId: isOutgoing ? selectedTargetCiId : ciId,
        note: relationshipNote || null
      };

      await createCiRelationship(ciId, payload);
      showModal = false;
      await loadRelationships();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create relationship';
    } finally {
      saving = false;
    }
  }

  async function handleDelete(relationshipId: string) {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      await deleteRelationship(relationshipId);
      await loadRelationships();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete relationship';
      console.error('Delete error:', err);
    }
  }

  // Filter options for select
  const relTypeOptions = $derived(
    relationshipTypes.map(t => ({
      value: t.id,
      name: `${t.code} - ${t.name}${t.reverseName ? ` / ${t.reverseName}` : ''}`
    }))
  );

  const ciOptions = $derived(
    allCis.map(ci => ({
      value: ci.id,
      name: `${ci.name} (${ci.ciCode})`
    }))
  );
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold">Relationships for {ciName}</h3>
      <p class="text-sm text-gray-500">
        {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
      </p>
    </div>
    <Button size="sm" onclick={openCreateModal}>
      <Plus class="mr-2 h-4 w-4" />
      New Relationship
    </Button>
  </div>

  <!-- Error Alert -->
  {#if error}
    <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
      {error}
    </div>
  {/if}

  <!-- Relationships Table -->
  {#if loading}
    <div class="py-8 text-center text-gray-500">Loading relationships...</div>
  {:else if relationships.length === 0}
    <div class="rounded-lg border border-dashed border-gray-300 py-12 text-center">
      <p class="text-gray-500">No relationships defined</p>
      <Button class="mt-4" size="sm" onclick={openCreateModal}>Create First Relationship</Button>
    </div>
  {:else}
    <Table>
      <TableHead>
        <TableHeadCell>Direction</TableHeadCell>
        <TableHeadCell>Type</TableHeadCell>
        <TableHeadCell>Related CI</TableHeadCell>
        <TableHeadCell>Note</TableHeadCell>
        <TableHeadCell>Created</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each relationships as rel}
          {@const isSource = rel.fromCiId === ciId}
          {@const direction = isSource ? 'Outgoing →' : 'Incoming ←'}
          {@const typeName = isSource ? getRelTypeName(rel.relTypeId) : getRelTypeReverseName(rel.relTypeId)}
          {@const targetCiId = isSource ? rel.toCiId : rel.fromCiId}
          {@const targetCiName = getCiName(targetCiId)}
          
          <TableBodyRow>
            <TableBodyCell class={isSource ? 'text-blue-600' : 'text-green-600'}>
              {direction}
            </TableBodyCell>
            <TableBodyCell>{typeName}</TableBodyCell>
            <TableBodyCell>{targetCiName}</TableBodyCell>
            <TableBodyCell>{rel.note || '-'}</TableBodyCell>
            <TableBodyCell>{formatDate(rel.createdAt)}</TableBodyCell>
            <TableBodyCell>
              <Button
                size="xs"
                color="red"
                outline
                onclick={() => handleDelete(rel.id)}
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  {/if}

  <!-- Create Relationship Modal -->
  <Modal title="Create Relationship" bind:open={showModal} size="md">
    <div class="space-y-4">
      <!-- Direction Selection -->
      <div>
        <Label>Direction</Label>
        <div class="mt-2 flex gap-4">
          <label class="flex items-center">
            <input
              type="radio"
              bind:group={isOutgoing}
              value={true}
              class="mr-2"
            />
            Outgoing (this CI → target)
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              bind:group={isOutgoing}
              value={false}
              class="mr-2"
            />
            Incoming (target → this CI)
          </label>
        </div>
      </div>

      <!-- Relationship Type -->
      <div>
        <Label for="relType">Relationship Type</Label>
        <Select
          id="relType"
          bind:value={selectedRelTypeId}
          placeholder="Select type..."
          items={relTypeOptions}
          class="mt-2"
        />
        {#if selectedRelTypeId}
          <p class="mt-1 text-xs text-gray-500">
            {isOutgoing 
              ? `${ciName} ${getRelTypeName(selectedRelTypeId)} ...`
              : `... ${getRelTypeReverseName(selectedRelTypeId)} ${ciName}`
            }
          </p>
        {/if}
      </div>

      <!-- Target CI -->
      <div>
        <Label for="targetCi">Related CI</Label>
        <Select
          id="targetCi"
          bind:value={selectedTargetCiId}
          placeholder="Select CI..."
          items={ciOptions}
          class="mt-2"
        />
      </div>

      <!-- Note -->
      <div>
        <Label for="note">Note (optional)</Label>
        <textarea
          id="note"
          bind:value={relationshipNote}
          rows="3"
          class="mt-2 block w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          placeholder="Add context about this relationship..."
        ></textarea>
      </div>

      {#if error}
        <div class="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      {/if}
    </div>

    <svelte:fragment slot="footer">
      
        <Button color="alternative" onclick={() => (showModal = false)}>Cancel</Button>
        <Button onclick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Create'}
        </Button>
      
      </svelte:fragment>
  </Modal>
</div>

