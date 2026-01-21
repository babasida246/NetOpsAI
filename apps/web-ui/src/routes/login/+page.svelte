<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button, Alert, Input, Label, Card } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { login } from '$lib/api/auth';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');

  const redirectTo = $derived($page.url.searchParams.get('redirect') || '/chat');

  // Check if already logged in on mount.
  $effect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (token) {
      goto(redirectTo);
    }
  });

  async function handleLogin() {
    loading = true;
    errorMsg = '';
    try {
      const result = await login(email, password);
      localStorage.setItem('authToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('userId', result.user.id);
      localStorage.setItem('userEmail', result.user.email);
      localStorage.setItem('userRole', result.user.role);
      localStorage.setItem('userName', result.user.name);
      await goto(redirectTo);
    } catch (error: unknown) {
      const errorInfo = error && typeof error === 'object'
        ? (error as { response?: { status?: number }; message?: string })
        : undefined;
      // Handle different error types
      if (errorInfo?.response?.status === 422) {
        errorMsg = $_('auth.errors.invalidEmailFormat');
      } else if (errorInfo?.response?.status === 401) {
        errorMsg = $_('auth.errors.invalidCredentials');
      } else {
        errorMsg = errorInfo?.message || $_('auth.errors.loginFailed');
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$isLoading ? 'Login - NetOpsAI Gateway' : $_('auth.pageTitle')}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
  <Card class="w-full max-w-md bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
    <div class="text-center mb-4 space-y-1">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg mb-2">AI</div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Sign in to NetOpsAI' : $_('auth.signInTitle')}
      </h1>
      <p class="text-sm text-slate-500">
        {$isLoading ? 'Enter your email and password to continue.' : $_('auth.signInSubtitle')}
      </p>
    </div>

    {#if errorMsg}
      <Alert color="red" class="mb-3">{errorMsg}</Alert>
    {/if}

    <div class="space-y-3">
      <div>
        <Label for="email">{$isLoading ? 'Email' : $_('auth.email')}</Label>
        <Input id="email" type="email" bind:value={email} placeholder={$isLoading ? 'you@example.com' : $_('auth.placeholders.email')} />
      </div>
      <div>
        <Label for="password">{$isLoading ? 'Password' : $_('auth.password')}</Label>
        <Input id="password" type="password" bind:value={password} placeholder={$isLoading ? '********' : $_('auth.placeholders.password')} />
      </div>
      <Button class="w-full" onclick={handleLogin} disabled={!email || !password || loading}>
        {loading ? ($isLoading ? 'Signing in...' : $_('auth.signingIn')) : ($isLoading ? 'Login' : $_('auth.login'))}
      </Button>
    </div>
  </Card>
</div>
