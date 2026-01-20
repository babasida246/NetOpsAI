<script lang="ts">
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { href: '/warehouse/stock', label: 'Stock' },
    { href: '/warehouse/documents', label: 'Documents' },
    { href: '/warehouse/ledger', label: 'Ledger' },
    { href: '/warehouse/parts', label: 'Spare Parts' },
    { href: '/warehouse/warehouses', label: 'Warehouses' },
    { href: '/warehouse/reports', label: 'Reports' }
  ];

  function isActive(href: string) {
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Warehouse</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Manage stock, documents, and reporting for spare parts.
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
        {tab.label}
      </a>
    {/each}
  </div>

  <div>
    {@render children()}
  </div>
</div>
