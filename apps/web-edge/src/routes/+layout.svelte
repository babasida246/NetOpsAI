<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { defaultLandingPath, getCapabilities, isRouteAllowed } from '$lib/auth/capabilities';
  import { locale, _, isLoading } from '$lib/i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import {
    Activity,
    BarChart3,
    ClipboardList,
    Cpu,
    Database,
    GitPullRequest,
    HardDrive,
    HelpCircle,
    Inbox,
    LayoutGrid,
    Layers,
    Bell,
    LogIn,
    LogOut,
    Menu,
    MessageSquare,
    Network,
    Settings,
    Shield,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    User,
    Warehouse,
    Wrench
  } from 'lucide-svelte';

  let { children } = $props();

  let sidebarOpen = $state(false);
  let sidebarPinned = $state(true);
  let isDesktop = $state(false);
  let userEmail = $state('');
  let userRole = $state('');

  const capabilities = $derived.by(() => getCapabilities(userRole));

  $effect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale');
      if (savedLocale) {
        locale.set(savedLocale);
      }
    }
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      isDesktop = media.matches;
    };
    update();
    media.addEventListener('change', update);

    const savedPinned = localStorage.getItem('sidebarPinned');
    if (savedPinned !== null) {
      sidebarPinned = savedPinned === 'true';
    }

    return () => media.removeEventListener('change', update);
  });

  function redirectToLogin(targetPath: string) {
    if (typeof window === 'undefined') return;
    const redirectTo = `/login?redirect=${encodeURIComponent(targetPath)}`;
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace(redirectTo);
    }
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      userEmail = localStorage.getItem('userEmail') || '';
      userRole = localStorage.getItem('userRole') || '';
      const publicPaths = ['/login', '/setup'];
      const isPublicPath = publicPaths.some((path) => page.url.pathname.startsWith(path));
      if (!token && !isPublicPath) {
        redirectToLogin(page.url.pathname + page.url.search);
      }
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const pathname = page.url.pathname;
    const isPublicPath = pathname.startsWith('/login') || pathname.startsWith('/setup') || pathname.startsWith('/forbidden');
    if (isPublicPath) return;

    // Read from localStorage to avoid a transient "viewer" capability before hydration effects run.
    const caps = getCapabilities(localStorage.getItem('userRole') || userRole);
    if (!isRouteAllowed(pathname, caps)) {
      const fallback = defaultLandingPath(caps);
      const target = `/forbidden?from=${encodeURIComponent(pathname)}&home=${encodeURIComponent(fallback)}`;
      window.location.replace(target);
    }
  });

  type NavItem = {
    href: string;
    labelKey: string;
    icon: typeof MessageSquare;
    match?: (path: string, hash: string) => boolean;
    requires?: (caps: typeof capabilities) => boolean;
  };

  const mainItems: NavItem[] = [
    { href: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
    { href: '/stats', labelKey: 'nav.stats', icon: TrendingUp, requires: (caps) => caps.canViewAi },
    { href: '/models', labelKey: 'nav.models', icon: Settings, requires: (caps) => caps.canViewAi }
  ];

  const myItems: NavItem[] = [
    { href: '/me/assets', labelKey: 'nav.myAssets', icon: HardDrive, requires: (caps) => caps.canViewAssets },
    { href: '/me/requests', labelKey: 'nav.myRequests', icon: ClipboardList, requires: (caps) => caps.canViewRequests },
    { href: '/notifications', labelKey: 'nav.notifications', icon: Bell, requires: (caps) => caps.canViewRequests || caps.canViewAssets },
    { href: '/inbox', labelKey: 'nav.inbox', icon: Inbox, requires: (caps) => caps.canApproveRequests }
  ];

  const assetItems: NavItem[] = [
    {
      href: '/assets',
      labelKey: 'nav.assets',
      icon: HardDrive,
      requires: (caps) => caps.canManageAssets,
      match: (path) => path === '/assets' || (path.startsWith('/assets/') && !path.startsWith('/assets/catalogs'))
    },
    { href: '/assets/catalogs', labelKey: 'nav.catalogs', icon: Layers, requires: (caps) => caps.canManageAssets },
    { href: '/cmdb', labelKey: 'nav.cmdb', icon: Database, requires: (caps) => caps.canManageAssets },
    { href: '/inventory', labelKey: 'nav.inventory', icon: ClipboardList, requires: (caps) => caps.canManageAssets },
    { href: '/warehouse/stock', labelKey: 'nav.warehouse', icon: Warehouse, requires: (caps) => caps.canManageAssets },
    { href: '/maintenance', labelKey: 'nav.maintenance', icon: Wrench, requires: (caps) => caps.canManageAssets },
    { href: '/requests', labelKey: 'nav.requests', icon: GitPullRequest, requires: (caps) => caps.canManageAssets },
    { href: '/reports/assets', labelKey: 'nav.assetReports', icon: BarChart3, requires: (caps) => caps.canManageAssets },
    { href: '/warehouse/reports', labelKey: 'nav.warehouseReports', icon: BarChart3, requires: (caps) => caps.canManageAssets }
  ];

  const netopsItems: NavItem[] = [
    { href: '/netops/devices', labelKey: 'netops.devices', icon: Network, requires: (caps) => caps.canViewNetOps },
    { href: '/netops/changes', labelKey: 'netops.changes', icon: GitPullRequest, requires: (caps) => caps.canViewNetOps },
    { href: '/netops/rulepacks', labelKey: 'netops.rulepacks', icon: Layers, requires: (caps) => caps.canViewNetOps },
    { href: '/netops/field', labelKey: 'netops.fieldKit', icon: ClipboardList, requires: (caps) => caps.canUseFieldKit },
    { href: '/netops/tools', labelKey: 'netops.tools', icon: Wrench, requires: (caps) => caps.canUseTools },
    { href: '/tools', labelKey: 'nav.tools', icon: Wrench, requires: (caps) => caps.canUseTools },
    { href: '/admin/topology', labelKey: 'netops.topology', icon: Activity, requires: (caps) => caps.isAdmin }
  ];

  const supportItems: NavItem[] = [
    { href: '/help', labelKey: 'nav.help', icon: HelpCircle },
    { href: '/profile', labelKey: 'nav.profile', icon: User }
  ];

  const visibleMyItems = $derived.by(() => myItems.filter((item) => !item.requires || item.requires(capabilities)));
  const visibleMainItems = $derived.by(() => mainItems.filter((item) => !item.requires || item.requires(capabilities)));
  const visibleAssetItems = $derived.by(() => assetItems.filter((item) => !item.requires || item.requires(capabilities)));
  const visibleNetopsItems = $derived.by(() => netopsItems.filter((item) => !item.requires || item.requires(capabilities)));
  const visibleSupportItems = $derived.by(() => supportItems.filter((item) => !item.requires || item.requires(capabilities)));

  type AdminSectionId = 'quick' | 'core' | 'stats' | 'models' | 'security' | 'ops' | 'ux';

  const adminSections: Array<{ id: AdminSectionId; labelKey: string; icon: typeof Sparkles }> = [
    { id: 'quick', labelKey: 'admin.sections.quickWins', icon: Sparkles },
    { id: 'core', labelKey: 'admin.sections.coreAdmin', icon: ShieldCheck },
    { id: 'stats', labelKey: 'admin.sections.stats', icon: BarChart3 },
    { id: 'models', labelKey: 'admin.sections.models', icon: Cpu },
    { id: 'security', labelKey: 'admin.sections.security', icon: Shield },
    { id: 'ops', labelKey: 'admin.sections.ops', icon: Activity },
    { id: 'ux', labelKey: 'admin.sections.ux', icon: LayoutGrid }
  ];

  const currentAdminSection = $derived.by(() => {
    if (page.url.pathname !== '/admin') return null;
    const hash = page.url.hash.replace('#', '');
    if (adminSections.some((section) => section.id === hash)) {
      return hash as AdminSectionId;
    }
    return 'quick';
  });

  const activeItemClass =
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100';

  const inactiveItemClass =
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

  const isActiveItem = (item: NavItem) => {
    const path = page.url.pathname;
    const hash = page.url.hash;
    if (item.match) return item.match(path, hash);
    return path.startsWith(item.href);
  };

  let lastRoute = $state('');

  $effect(() => {
    const currentRoute = `${page.url.pathname}${page.url.hash}`;
    if (!isDesktop && sidebarOpen && lastRoute && currentRoute !== lastRoute) {
      sidebarOpen = false;
    }
    lastRoute = currentRoute;
  });

  const sidebarVisible = $derived.by(() => (isDesktop ? sidebarPinned : sidebarOpen));

  function toggleSidebar() {
    if (isDesktop) {
      sidebarPinned = !sidebarPinned;
      return;
    }
    sidebarOpen = !sidebarOpen;
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarPinned', String(sidebarPinned));
    }
  });
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
  <header class="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
    <div class="h-12 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          onclick={toggleSidebar}
          aria-label="Toggle navigation"
          aria-expanded={sidebarVisible}
        >
          <Menu class="w-5 h-5" />
        </button>
        <a href="/chat" class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <div class="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">AI</div>
          <span>{$isLoading ? '' : $_('common.brand')}</span>
        </a>
      </div>

      <div class="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <LanguageSwitcher />
        <span class="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">v6.0.0</span>
        {#if userEmail}
          <span class="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {userEmail} {userRole ? `(${userRole})` : ''}
          </span>
          <a
            href="/logout"
            data-testid="header-logout"
            class="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 flex items-center gap-1"
          >
            <LogOut class="w-4 h-4" /> <span>{$isLoading ? '' : $_('auth.logout')}</span>
          </a>
        {:else}
          <a href="/login" class="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100 flex items-center gap-1">
            <LogIn class="w-4 h-4" /> <span>{$isLoading ? '' : $_('auth.login')}</span>
          </a>
        {/if}
      </div>
    </div>
  </header>

  <div class="flex">
    <aside
      class="
        fixed left-0 top-[49px] bottom-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transform transition-transform
        {sidebarVisible ? 'translate-x-0' : '-translate-x-full'}
      "
    >
      <div class="h-12 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 lg:hidden">
        <span class="text-sm font-semibold text-slate-600 dark:text-slate-300">{$isLoading ? 'Navigation' : $_('nav.navigation')}</span>
      </div>
      <nav class="h-full overflow-y-auto px-3 py-4 space-y-4">
        {#if visibleMyItems.length > 0}
          <div>
            <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'My' : $_('nav.my')}</p>
            <div class="mt-2 space-y-1">
              {#each visibleMyItems as item}
                {@const Icon = item.icon}
                <a
                  href={item.href}
                  class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActiveItem(item) ? activeItemClass : inactiveItemClass}`}
                  onclick={() => (sidebarOpen = false)}
                >
                  <Icon class="w-4 h-4" />
                  <span>{$isLoading ? '' : $_(item.labelKey)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Main' : $_('nav.main')}</p>
          <div class="mt-2 space-y-1">
            {#each visibleMainItems as item}
              {@const Icon = item.icon}
              <a
                href={item.href}
                class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActiveItem(item) ? activeItemClass : inactiveItemClass}`}
                onclick={() => (sidebarOpen = false)}
              >
                <Icon class="w-4 h-4" />
                <span>{$isLoading ? '' : $_(item.labelKey)}</span>
              </a>
            {/each}
          </div>
        </div>

        {#if visibleAssetItems.length > 0}
          <div>
            <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Assets' : $_('nav.assets')}</p>
            <div class="mt-2 space-y-1">
              {#each visibleAssetItems as item}
                {@const Icon = item.icon}
                <a
                  href={item.href}
                  class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActiveItem(item) ? activeItemClass : inactiveItemClass}`}
                  onclick={() => (sidebarOpen = false)}
                >
                  <Icon class="w-4 h-4" />
                  <span>{$isLoading ? '' : $_(item.labelKey)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        {#if visibleNetopsItems.length > 0}
          <div>
            <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'NetOps' : $_('nav.netops')}</p>
            <div class="mt-2 space-y-1">
              {#each visibleNetopsItems as item}
                {@const Icon = item.icon}
                <a
                  href={item.href}
                  class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActiveItem(item) ? activeItemClass : inactiveItemClass}`}
                  onclick={() => (sidebarOpen = false)}
                >
                  <Icon class="w-4 h-4" />
                  <span>{$isLoading ? '' : $_(item.labelKey)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        {#if capabilities.isAdmin}
          <div>
            <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Admin' : $_('nav.admin')}</p>
            <div class="mt-2 space-y-1">
              {#each adminSections as section}
                {@const Icon = section.icon}
                <a
                  href={`/admin#${section.id}`}
                  class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${page.url.pathname === '/admin' && currentAdminSection === section.id ? activeItemClass : inactiveItemClass}`}
                  onclick={() => (sidebarOpen = false)}
                >
                  <Icon class="w-4 h-4" />
                  <span>{$isLoading ? '' : $_(section.labelKey)}</span>
                </a>
              {/each}
              <a
                href="/admin/rbac"
                class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${page.url.pathname.startsWith('/admin/rbac') ? activeItemClass : inactiveItemClass}`}
                onclick={() => (sidebarOpen = false)}
              >
                <ShieldCheck class="w-4 h-4" />
                <span>{$isLoading ? '' : $_('adminRbac.navLabel')}</span>
              </a>
              <a
                href="/admin/drivers"
                class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${page.url.pathname.startsWith('/admin/drivers') ? activeItemClass : inactiveItemClass}`}
                onclick={() => (sidebarOpen = false)}
              >
                <Cpu class="w-4 h-4" />
                <span>{$isLoading ? '' : $_('drivers.navLabel')}</span>
              </a>
              <a
                href="/admin/docs"
                class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${page.url.pathname.startsWith('/admin/docs') ? activeItemClass : inactiveItemClass}`}
                onclick={() => (sidebarOpen = false)}
              >
                <ClipboardList class="w-4 h-4" />
                <span>{$isLoading ? '' : $_('docs.navLabel')}</span>
              </a>
            </div>
          </div>
        {/if}

        {#if visibleSupportItems.length > 0}
          <div>
            <p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{$isLoading ? 'Support' : $_('nav.support')}</p>
            <div class="mt-2 space-y-1">
              {#each visibleSupportItems as item}
                {@const Icon = item.icon}
                <a
                  href={item.href}
                  class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActiveItem(item) ? activeItemClass : inactiveItemClass}`}
                  onclick={() => (sidebarOpen = false)}
                >
                  <Icon class="w-4 h-4" />
                  <span>{$isLoading ? '' : $_(item.labelKey)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}
        <div class="mt-6 border-t border-slate-200 dark:border-slate-800 pt-3 sm:hidden">
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {#if userEmail}
              <div class="font-semibold text-slate-700 dark:text-slate-200 truncate">{userEmail}</div>
              {#if userRole}
                <div class="text-[11px] uppercase tracking-wide">{userRole}</div>
              {/if}
            {:else}
              <div>{$isLoading ? 'Guest' : $_('auth.login')}</div>
            {/if}
          </div>
          <div class="mt-2">
            {#if userEmail}
              <a
                href="/logout"
                data-testid="sidebar-logout"
                class="inline-flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-300"
              >
                <LogOut class="w-4 h-4" />
                <span>{$isLoading ? '' : $_('auth.logout')}</span>
              </a>
            {:else}
              <a href="/login" class="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-300">
                <LogIn class="w-4 h-4" />
                <span>{$isLoading ? '' : $_('auth.login')}</span>
              </a>
            {/if}
          </div>
        </div>
      </nav>
    </aside>

    {#if sidebarOpen && !isDesktop}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="fixed inset-0 bg-black/40 z-30 lg:hidden cursor-pointer"
        onclick={() => (sidebarOpen = false)}
        onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
        role="button"
        tabindex="0"
      ></div>
    {/if}

    <main class={`flex-1 min-w-0 transition-[margin] duration-200 ${isDesktop && sidebarPinned ? 'lg:ml-64' : 'lg:ml-0'}`}>
      <div class="py-4 lg:py-6">
        {@render children()}
      </div>
    </main>
  </div>
</div>
