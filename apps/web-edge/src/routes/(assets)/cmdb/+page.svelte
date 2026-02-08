<script lang="ts">
  import { Tabs, TabItem } from 'flowbite-svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { _, isLoading } from '$lib/i18n';
  import CmdbCisPanel from '$lib/cmdb/CmdbCisPanel.svelte';
  import CmdbTypesPanel from '$lib/cmdb/CmdbTypesPanel.svelte';
  import RelationshipTypesPanel from '$lib/cmdb/RelationshipTypesPanel.svelte';
  import CmdbServicesPanel from '$lib/cmdb/CmdbServicesPanel.svelte';
  import TopologyGraph from '$lib/cmdb/TopologyGraph.svelte';

  const tabs = ['cis', 'types', 'relationships', 'services', 'topology'] as const;
  type CmdbTab = (typeof tabs)[number];

  let activeTab = $state<CmdbTab>('cis');

  function setTab(next: CmdbTab) {
    activeTab = next;
    const params = new URLSearchParams(page.url.searchParams);
    params.set('tab', next);
    goto(`/cmdb?${params.toString()}`, { replaceState: true, noScroll: true });
  }

  $effect(() => {
    const tab = page.url.searchParams.get('tab') as CmdbTab | null;
    if (tab && tabs.includes(tab)) {
      activeTab = tab;
    }
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6">
    <h1 class="text-2xl font-semibold">{$isLoading ? 'CMDB' : $_('cmdb.pageTitle')}</h1>
    <p class="text-sm text-gray-500">
      {$isLoading ? 'Manage configuration items, schema types, and service mappings.' : $_('cmdb.subtitle')}
    </p>
  </div>

  <Tabs>
    <TabItem open={activeTab === 'cis'} onclick={() => setTab('cis')} title={$isLoading ? 'CIs' : $_('cmdb.tabs.cis')}>
      <CmdbCisPanel />
    </TabItem>
    <TabItem open={activeTab === 'types'} onclick={() => setTab('types')} title={$isLoading ? 'Types' : $_('cmdb.tabs.types')}>
      <CmdbTypesPanel />
    </TabItem>
    <TabItem open={activeTab === 'relationships'} onclick={() => setTab('relationships')} title={$isLoading ? 'Relationships' : $_('cmdb.tabs.relationships')}>
      <RelationshipTypesPanel />
    </TabItem>
    <TabItem open={activeTab === 'services'} onclick={() => setTab('services')} title={$isLoading ? 'Services' : $_('cmdb.tabs.services')}>
      <CmdbServicesPanel />
    </TabItem>
    <TabItem open={activeTab === 'topology'} onclick={() => setTab('topology')} title="Topology">
      <TopologyGraph />
    </TabItem>
  </Tabs>
</div>
