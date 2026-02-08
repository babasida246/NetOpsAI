<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { _ , isLoading } from '$lib/i18n';
  import { isBrowser } from '$lib/admin/storage';
  import { loadRbacState, saveRbacState } from '$lib/rbac/state';
  import type { AuditEvent, RolePermissionOverride, User } from '$lib/rbac/types';

  import AuditLogTab from '$lib/components/admin/rbac/AuditLogTab.svelte';
  import ExplainAccessTab from '$lib/components/admin/rbac/ExplainAccessTab.svelte';
  import GroupAssignmentTab from '$lib/components/admin/rbac/GroupAssignmentTab.svelte';
  import RoleMatrixTab from '$lib/components/admin/rbac/RoleMatrixTab.svelte';

  type TabId = 'matrix' | 'groups' | 'explain' | 'audit';

  const TAB_QUERY_KEY = 'tab';

  const initial = loadRbacState();

  let roles = initial.roles;
  let permissionDefs = initial.permissionDefs;
  let groups = initial.groups;
  let departments = initial.departments;

  let overrides = $state<RolePermissionOverride[]>(initial.overrides);
  let users = $state<User[]>(initial.users);
  let audit = $state<AuditEvent[]>(initial.audit);

  let actorId = $state('user_admin');
  let actorEmail = $state('admin@hospital.local');

  function normalizeTab(value: string | null): TabId {
    if (value === 'groups' || value === 'explain' || value === 'audit') return value;
    return 'matrix';
  }

  let activeTab = $state<TabId>(normalizeTab(page.url.searchParams.get(TAB_QUERY_KEY)));

  $effect(() => {
    if (!isBrowser) return;
    const params = new URLSearchParams(page.url.searchParams);
    params.set(TAB_QUERY_KEY, activeTab);
    const nextUrl = `${page.url.pathname}?${params.toString()}${page.url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  });

  onMount(() => {
    if (!isBrowser) return;
    actorId = localStorage.getItem('userId') || actorId;
    actorEmail = localStorage.getItem('userEmail') || actorEmail;
  });

  let matrixFocus = $state<{ permKey: string; roleId?: string } | null>(null);

  function persist(next: { overrides?: RolePermissionOverride[]; users?: User[]; audit?: AuditEvent[] }) {
    if (next.overrides) overrides = next.overrides;
    if (next.users) users = next.users;
    if (next.audit) audit = next.audit;
    saveRbacState({ overrides: next.overrides ?? overrides, users: next.users ?? users, audit: next.audit ?? audit });
  }

  function handleMatrixSaved(nextOverrides: RolePermissionOverride[], auditEvent: AuditEvent | null) {
    const nextAudit = auditEvent ? [auditEvent, ...audit] : audit;
    persist({ overrides: nextOverrides, audit: nextAudit });
    activeTab = 'audit';
  }

  function handleUsersUpdated(nextUsers: User[], auditEvent: AuditEvent | null) {
    const nextAudit = auditEvent ? [auditEvent, ...audit] : audit;
    persist({ users: nextUsers, audit: nextAudit });
  }
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
      {$isLoading ? 'Admin RBAC' : $_('adminRbac.title')}
    </h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      {$isLoading ? 'Roles, permissions, and auditability' : $_('adminRbac.subtitle')}
    </p>
  </div>

  <div class="border-b border-slate-200 dark:border-slate-800">
    <nav class="-mb-px flex flex-wrap gap-2" aria-label="RBAC Tabs">
      <button
        type="button"
        class={`px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
          activeTab === 'matrix'
            ? 'border-blue-600 text-blue-700 dark:text-blue-200'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        onclick={() => (activeTab = 'matrix')}
      >
        {$isLoading ? 'Matrix' : $_('adminRbac.tabs.matrix')}
      </button>
      <button
        type="button"
        class={`px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
          activeTab === 'groups'
            ? 'border-blue-600 text-blue-700 dark:text-blue-200'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        onclick={() => (activeTab = 'groups')}
      >
        {$isLoading ? 'Groups' : $_('adminRbac.tabs.groups')}
      </button>
      <button
        type="button"
        class={`px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
          activeTab === 'explain'
            ? 'border-blue-600 text-blue-700 dark:text-blue-200'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        onclick={() => (activeTab = 'explain')}
      >
        {$isLoading ? 'Explain' : $_('adminRbac.tabs.explain')}
      </button>
      <button
        type="button"
        class={`px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
          activeTab === 'audit'
            ? 'border-blue-600 text-blue-700 dark:text-blue-200'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        onclick={() => (activeTab = 'audit')}
      >
        {$isLoading ? 'Audit' : $_('adminRbac.tabs.audit')}
      </button>
    </nav>
  </div>

  {#if activeTab === 'matrix'}
    <RoleMatrixTab
      {roles}
      {permissionDefs}
      {overrides}
      {actorId}
      {actorEmail}
      focus={matrixFocus}
      onSave={(nextOverrides, auditEvent) => handleMatrixSaved(nextOverrides, auditEvent)}
      onOpenAudit={() => (activeTab = 'audit')}
    />
  {:else if activeTab === 'groups'}
    <GroupAssignmentTab
      {roles}
      {groups}
      {users}
      {actorId}
      {actorEmail}
      onUpdate={(nextUsers, auditEvent) => handleUsersUpdated(nextUsers, auditEvent)}
    />
  {:else if activeTab === 'explain'}
    <ExplainAccessTab
      {roles}
      {permissionDefs}
      {groups}
      {departments}
      {users}
      {overrides}
      onOpenMatrix={(payload) => {
        matrixFocus = payload;
        activeTab = 'matrix';
      }}
    />
  {:else}
    <AuditLogTab {roles} {groups} {users} events={audit} />
  {/if}
</div>

