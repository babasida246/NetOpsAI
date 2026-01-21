<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { href: '/warehouse/stock', labelKey: 'warehouse.tabs.stock' },
    { href: '/warehouse/documents', labelKey: 'warehouse.tabs.documents' },
    { href: '/warehouse/ledger', labelKey: 'warehouse.tabs.ledger' },
    { href: '/warehouse/parts', labelKey: 'warehouse.tabs.spareParts' },
    { href: '/warehouse/warehouses', labelKey: 'warehouse.tabs.warehouses' },
    { href: '/warehouse/reports', labelKey: 'warehouse.tabs.reports' }
  ];

  function isActive(href: string) {
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'Warehouse' : $_('warehouse.title')}</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      {$isLoading ? 'Manage stock, documents, and reporting for spare parts.' : $_('warehouse.description')}
    </p>
  </div>

  <div class="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
    {#each tabs as tab}
      <a
        href={tab.href}
        class={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          isActive(tab.href)
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        {$_(tab.labelKey)}
      </a>
    {/each}
  </div>

  <div>
    {@render children()}
  </div>
</div>
