<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { MessageSquare, Network, Settings, TrendingUp, Shield, LogOut, LogIn } from 'lucide-svelte';
  
  let { children } = $props();
  
  const navLinks = [
    { href: '/chat', label: 'Chat', icon: MessageSquare },
    { href: '/stats', label: 'Stats', icon: TrendingUp },
    { href: '/models', label: 'Models', icon: Settings },
    { href: '/netops/devices', label: 'NetOps', icon: Network }
  ];

  let userEmail = $state('');
  let userRole = $state('');

  onMount(() => {
    const token = localStorage.getItem('authToken');
    userEmail = localStorage.getItem('userEmail') || '';
    userRole = localStorage.getItem('userRole') || '';
    if (!token && !$page.url.pathname.startsWith('/login')) {
      goto(`/login?redirect=${encodeURIComponent($page.url.pathname + $page.url.search)}`);
    }
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      userEmail = localStorage.getItem('userEmail') || '';
      userRole = localStorage.getItem('userRole') || '';
    }
  });

  const isNetOpsRoute = $derived($page.url.pathname.startsWith('/netops'));
  const isActive = (href: string) => $page.url.pathname.startsWith(href);
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
  <header class="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
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
            {link.label}
          </a>
        {/each}
        {#if userRole === 'admin' || userRole === 'super_admin'}
          <a
            href="/admin"
            class="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors {isActive('/admin') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
          >
            <Shield class="w-4 h-4" />
            Admin
          </a>
        {/if}
      </nav>

      <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span class="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">v6.0.0</span>
        {#if userEmail}
          <span class="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {userEmail} {userRole ? `(${userRole})` : ''}
          </span>
          <a href="/logout" class="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 flex items-center gap-1">
            <LogOut class="w-4 h-4" /> Logout
          </a>
        {:else}
          <a href="/login" class="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100 flex items-center gap-1">
            <LogIn class="w-4 h-4" /> Login
          </a>
        {/if}
      </div>
    </div>
  </header>

  <main class={isNetOpsRoute ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6'}>
    {@render children()}
  </main>
</div>
