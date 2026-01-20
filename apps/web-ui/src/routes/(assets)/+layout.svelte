<script lang="ts">
  import { page } from '$app/stores';
  import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
  import { BarChart3, ClipboardList, Database, GitPullRequest, HardDrive, Layers, Menu, Warehouse, Wrench } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';

  let { children } = $props();
  let sidebarOpen = $state(false);

  const coreItems = [
    { href: '/assets', labelKey: 'nav.assets', icon: HardDrive },
    { href: '/assets/catalogs', labelKey: 'nav.catalogs', icon: Layers },
    { href: '/cmdb', labelKey: 'nav.cmdb', icon: Database }
  ];

  const operationsItems = [
    { href: '/inventory', labelKey: 'nav.inventory', icon: ClipboardList },
    { href: '/warehouse/stock', labelKey: 'nav.warehouse', icon: Warehouse },
    { href: '/maintenance', labelKey: 'nav.maintenance', icon: Wrench },
    { href: '/requests', labelKey: 'nav.requests', icon: GitPullRequest }
  ];

  const reportItems = [
    { href: '/reports/assets', labelKey: 'nav.assetReports', icon: BarChart3 },
    { href: '/warehouse/reports', labelKey: 'nav.warehouseReports', icon: BarChart3 }
  ];

  function isActive(href: string) {
    const path = $page.url.pathname;
    if (href === '/assets') {
      return path === '/assets' || (path.startsWith('/assets/') && !path.startsWith('/assets/catalogs'));
    }
    return path.startsWith(href);
  }

  const activeLinkClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100';
</script>

<div class="min-h-screen">
  <header class="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between px-4 py-3">
      <h1 class="text-xl font-semibold">{$isLoading ? 'Asset Management' : $_('nav.assetManagement')}</h1>
      <button
        onclick={() => sidebarOpen = !sidebarOpen}
        class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Menu class="w-5 h-5" />
      </button>
    </div>
  </header>

  <div class="flex">
    <aside
      class="
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transform transition-transform lg:translate-x-0
        {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      "
    >
      <div class="hidden lg:flex items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h1 class="text-xl font-semibold">{$isLoading ? 'Asset Management' : $_('nav.assetManagement')}</h1>
      </div>

      <Sidebar class="w-full">
        <SidebarWrapper class="rounded-none">
          <SidebarGroup class="space-y-1">
            <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Core' : $_('nav.core')}</p>
            {#each coreItems as item}
              <SidebarItem
                href={item.href}
                label={$isLoading ? '' : $_(item.labelKey)}
                onclick={() => sidebarOpen = false}
                class={isActive(item.href) ? activeLinkClass : ''}
              >
                <svelte:fragment slot="icon">
                  <!-- svelte-ignore svelte_component_deprecated -->
                  <svelte:component this={item.icon} class="w-5 h-5" />
                </svelte:fragment>
              </SidebarItem>
            {/each}
          </SidebarGroup>

          <SidebarGroup class="space-y-1">
            <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Operations' : $_('nav.operations')}</p>
            {#each operationsItems as item}
              <SidebarItem
                href={item.href}
                label={$isLoading ? '' : $_(item.labelKey)}
                onclick={() => sidebarOpen = false}
                class={isActive(item.href) ? activeLinkClass : ''}
              >
                <svelte:fragment slot="icon">
                  <!-- svelte-ignore svelte_component_deprecated -->
                  <svelte:component this={item.icon} class="w-5 h-5" />
                </svelte:fragment>
              </SidebarItem>
            {/each}
          </SidebarGroup>

          <SidebarGroup class="space-y-1">
            <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Reports' : $_('nav.reports')}</p>
            {#each reportItems as item}
              <SidebarItem
                href={item.href}
                label={$isLoading ? '' : $_(item.labelKey)}
                onclick={() => sidebarOpen = false}
                class={isActive(item.href) ? activeLinkClass : ''}
              >
                <svelte:fragment slot="icon">
                  <!-- svelte-ignore svelte_component_deprecated -->
                  <svelte:component this={item.icon} class="w-5 h-5" />
                </svelte:fragment>
              </SidebarItem>
            {/each}
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
    </aside>

    {#if sidebarOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="fixed inset-0 bg-black/40 z-20 lg:hidden cursor-pointer"
        onclick={() => sidebarOpen = false}
        onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
        role="button"
        tabindex="0"
      ></div>
    {/if}

    <main class="flex-1 lg:ml-64">
      {@render children()}
    </main>
  </div>
</div>
