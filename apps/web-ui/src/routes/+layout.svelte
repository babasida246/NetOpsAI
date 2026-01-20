<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { locale, _, isLoading } from '$lib/i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import {
    HardDrive,
    LogIn,
    LogOut,
    MessageSquare,
    Network,
    Settings,
    Shield,
    TrendingUp,
    Wrench
  } from 'lucide-svelte';
  
  let { children } = $props();

  // Load saved locale from localStorage on mount
  onMount(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale');
      if (savedLocale) {
        locale.set(savedLocale);
      }
    }
  });
  
  const navLinks = [
    { href: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
    { href: '/stats', labelKey: 'nav.stats', icon: TrendingUp },
    { href: '/models', labelKey: 'nav.models', icon: Settings },
    { href: '/tools', labelKey: 'nav.tools', icon: Wrench },
    { href: '/assets', labelKey: 'nav.assets', icon: HardDrive },
    { href: '/netops/devices', labelKey: 'nav.netops', icon: Network }
  ];

  let userEmail = $state('');
  let userRole = $state('');

  $effect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      userEmail = localStorage.getItem('userEmail') || '';
      userRole = localStorage.getItem('userRole') || '';
      if (!token && !$page.url.pathname.startsWith('/login')) {
        goto(`/login?redirect=${encodeURIComponent($page.url.pathname + $page.url.search)}`);
      }
    }
  });

  const assetRoutes = ['/assets', '/inventory', '/warehouse', '/maintenance', '/requests', '/reports', '/cmdb'];
  const isActive = (href: string) => {
    if (href === '/assets') {
      return assetRoutes.some((route) => $page.url.pathname.startsWith(route));
    }
    if (href === '/netops/devices') {
      return $page.url.pathname.startsWith('/netops');
    }
    return $page.url.pathname.startsWith(href);
  };
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
  <header class="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
    <div class="page-shell h-14 flex items-center justify-between gap-4">
      <a href="/chat" class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <div class="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">AI</div>
        <span>NetOpsAI</span>
      </a>

      <nav class="flex items-center gap-2">
        {#each navLinks as link (link.href)}
          {@const Icon = link.icon}
          <a
            href={link.href}
            class="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors {isActive(link.href) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
          >
            <Icon class="w-4 h-4" />
            <span>{$isLoading ? '' : $_(link.labelKey)}</span>
          </a>
        {/each}
        {#if userRole === 'admin' || userRole === 'super_admin'}
          <a
            href="/admin"
            class="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors {isActive('/admin') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
          >
            <Shield class="w-4 h-4" />
            <span>{$isLoading ? '' : $_('nav.admin')}</span>
          </a>
        {/if}
      </nav>

      <div class="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <LanguageSwitcher />
        <span class="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">v6.0.0</span>
        {#if userEmail}
          <span class="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {userEmail} {userRole ? `(${userRole})` : ''}
          </span>
          <a href="/logout" class="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 flex items-center gap-1">
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

  <main class="py-4 lg:py-6">
    {@render children()}
  </main>
</div>
