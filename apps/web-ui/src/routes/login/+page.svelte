<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button, Alert, Input, Label, Card } from 'flowbite-svelte';
  import { login } from '$lib/api/auth';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');

  const redirectTo = $derived($page.url.searchParams.get('redirect') || '/chat');

  $effect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        goto(redirectTo);
      }
    }
  });

  async function handleLogin() {
    loading = true;
    errorMsg = '';
    try {
      const result = await login(email, password);
      localStorage.setItem('authToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('userEmail', result.user.email);
      localStorage.setItem('userRole', result.user.role);
      localStorage.setItem('userName', result.user.name);
      await goto(redirectTo);
    } catch (error: any) {
      errorMsg = error.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
  <Card class="w-full max-w-md bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
    <div class="text-center mb-4 space-y-1">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg mb-2">AI</div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Sign in to NetOpsAI</h1>
      <p class="text-sm text-slate-500">Enter your email and password to continue.</p>
    </div>

    {#if errorMsg}
      <Alert color="red" class="mb-3">{errorMsg}</Alert>
    {/if}

    <div class="space-y-3">
      <div>
        <Label for="email">Email</Label>
        <Input id="email" type="email" bind:value={email} placeholder="you@example.com" />
      </div>
      <div>
        <Label for="password">Password</Label>
        <Input id="password" type="password" bind:value={password} placeholder="********" />
      </div>
      <Button class="w-full" onclick={handleLogin} disabled={!email || !password || loading}>
        {loading ? 'Signing in...' : 'Login'}
      </Button>
    </div>
  </Card>
</div>
