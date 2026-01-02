<script lang="ts">
  import { page } from '$app/stores';
  import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
  import { Network, GitBranch, FileText, Menu } from 'lucide-svelte';
  
  let { children } = $props();
  let sidebarOpen = $state(false);
  
  const navItems = [
    { href: '/netops/devices', label: 'Devices', icon: Network },
    { href: '/netops/changes', label: 'Changes', icon: GitBranch },
    { href: '/netops/rulepacks', label: 'Rulepacks', icon: FileText }
  ];
  
  function isActive(href: string) {
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Mobile header -->
  <header class="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between px-4 py-3">
      <h1 class="text-xl font-semibold">NetOps</h1>
      <button 
        onclick={() => sidebarOpen = !sidebarOpen}
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Menu class="w-5 h-5" />
      </button>
    </div>
  </header>

  <div class="flex">
    <!-- Sidebar -->
    <aside class="
      fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      transform transition-transform lg:translate-x-0
      {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    ">
      <div class="hidden lg:flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 class="text-xl font-semibold">NetOps Copilot</h1>
      </div>
      
      <Sidebar class="w-full">
        <SidebarWrapper class="rounded-none">
          <SidebarGroup>
            {#each navItems as item}
              <SidebarItem
                href={item.href}
                label={item.label}
                onclick={() => sidebarOpen = false}
                class={isActive(item.href) ? 'bg-gray-200 dark:bg-gray-700' : ''}
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

    <!-- Mobile overlay -->
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

    <!-- Main content -->
    <main class="flex-1 lg:ml-64">
      {@render children()}
    </main>
  </div>
</div>
