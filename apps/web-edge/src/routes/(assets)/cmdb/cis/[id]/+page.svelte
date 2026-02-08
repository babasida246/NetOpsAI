<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Button, Tabs, TabItem, Badge, Card } from 'flowbite-svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { getCiDetail, type CiDetail } from '$lib/api/cmdb';
  import CiRelationshipsTab from '$lib/cmdb/CiRelationshipsTab.svelte';

  type BadgeColor = 'none' | 'green' | 'red' | 'yellow' | 'indigo' | 'purple' | 'pink' | 'blue' | 'dark' | 'primary';

  const ciId = page.params.id;
  
  let ciDetail = $state<CiDetail | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state<'overview' | 'relationships'>('overview');

  $effect(() => {
    void loadCiDetail();
    // Check URL params for tab
    const tab = page.url.searchParams.get('tab');
    if (tab === 'relationships') {
      activeTab = 'relationships';
    }
  });

  async function loadCiDetail() {
    try {
      loading = true;
      error = '';
      const response = await getCiDetail(ciId);
      ciDetail = response.data ?? null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load CI details';
      console.error('Error loading CI:', err);
    } finally {
      loading = false;
    }
  }

  function setTab(tab: 'overview' | 'relationships') {
    activeTab = tab;
    const params = new URLSearchParams(page.url.searchParams);
    params.set('tab', tab);
    goto(`/cmdb/cis/${ciId}?${params.toString()}`, { replaceState: true, noScroll: true });
  }

  const statusColors: Record<string, BadgeColor> = {
    active: 'green',
    inactive: 'dark',
    retired: 'red',
    pending: 'yellow'
  };
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Header -->
  <div class="mb-6">
    <Button size="sm" color="light" onclick={() => goto('/cmdb')} class="mb-4">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to CMDB
    </Button>

    {#if loading}
      <div class="text-gray-500">Loading CI details...</div>
    {:else if error}
      <div class="rounded-lg bg-red-50 p-4 text-red-800">
        {error}
      </div>
    {:else if ciDetail}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold">{ciDetail.ci.name}</h1>
          <p class="text-sm text-gray-500">
            {ciDetail.ci.ciCode} • {ciDetail.version.status} version
          </p>
        </div>
        <div class="flex gap-2">
          <Badge color={statusColors[ciDetail.ci.status] ?? 'dark'}>
            {ciDetail.ci.status}
          </Badge>
          {#if ciDetail.ci.environment}
            <Badge color="blue">{ciDetail.ci.environment}</Badge>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  {#if ciDetail}
    <!-- Tabs -->
    <Tabs>
      <TabItem 
        open={activeTab === 'overview'} 
        onclick={() => setTab('overview')} 
        title="Overview"
      >
        <div class="space-y-6">
          <!-- Basic Info Card -->
          <Card>
            <h3 class="mb-4 text-lg font-semibold">Basic Information</h3>
            <dl class="grid grid-cols-2 gap-4">
              <div>
                <dt class="text-sm font-medium text-gray-500">CI Code</dt>
                <dd class="mt-1 text-sm text-gray-900">{ciDetail.ci.ciCode}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <Badge color={statusColors[ciDetail.ci.status] ?? 'dark'}>
                    {ciDetail.ci.status}
                  </Badge>
                </dd>
              </div>
              {#if ciDetail.ci.environment}
                <div>
                  <dt class="text-sm font-medium text-gray-500">Environment</dt>
                  <dd class="mt-1 text-sm text-gray-900">{ciDetail.ci.environment}</dd>
                </div>
              {/if}
              {#if ciDetail.ci.ownerTeam}
                <div>
                  <dt class="text-sm font-medium text-gray-500">Owner Team</dt>
                  <dd class="mt-1 text-sm text-gray-900">{ciDetail.ci.ownerTeam}</dd>
                </div>
              {/if}
              <div>
                <dt class="text-sm font-medium text-gray-500">Created</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {ciDetail.ci.createdAt ? new Date(ciDetail.ci.createdAt).toLocaleString() : '-'}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {ciDetail.ci.updatedAt ? new Date(ciDetail.ci.updatedAt).toLocaleString() : '-'}
                </dd>
              </div>
            </dl>

            {#if ciDetail.ci.notes}
              <div class="mt-4 border-t pt-4">
                <dt class="text-sm font-medium text-gray-500">Notes</dt>
                <dd class="mt-1 text-sm text-gray-900">{ciDetail.ci.notes}</dd>
              </div>
            {/if}
          </Card>

          <!-- Attributes Card -->
          {#if ciDetail.attributes.length > 0}
            <Card>
              <h3 class="mb-4 text-lg font-semibold">Attributes</h3>
              <dl class="grid grid-cols-2 gap-4">
                {#each ciDetail.attributes as attr}
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{ciDetail.schema.find(d => d.key === attr.key)?.label ?? attr.key}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{attr.value ?? '-'}</dd>
                  </div>
                {/each}
              </dl>
            </Card>
          {/if}
        </div>
      </TabItem>

      <TabItem 
        open={activeTab === 'relationships'} 
        onclick={() => setTab('relationships')} 
        title="Relationships"
      >
        <CiRelationshipsTab ciId={ciDetail.ci.id} ciName={ciDetail.ci.name} />
      </TabItem>
    </Tabs>
  {/if}
</div>
