<script lang="ts">
  import { Alert, Badge } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import { _, isLoading } from '$lib/i18n';
  import { getStoredTokens } from '$lib/api/httpClient';
  import { readLocal, writeLocal, isBrowser } from '$lib/admin/storage';
  import HealthErrorPanel from '$lib/components/admin/HealthErrorPanel.svelte';
  import UserManagementPanel from '$lib/components/admin/UserManagementPanel.svelte';
  import AuditLogsPanel from '$lib/components/admin/AuditLogsPanel.svelte';
  import RolePermissionMatrix from '$lib/components/admin/RolePermissionMatrix.svelte';
  import SessionManagementPanel from '$lib/components/admin/SessionManagementPanel.svelte';
  import ImpersonationPanel from '$lib/components/admin/ImpersonationPanel.svelte';
  import ModelGovernancePanel from '$lib/components/admin/ModelGovernancePanel.svelte';
  import AdminStatsPanel from '$lib/components/admin/AdminStatsPanel.svelte';
  import SecurityCompliancePanel from '$lib/components/admin/SecurityCompliancePanel.svelte';
  import PolicyAsCodePanel from '$lib/components/admin/PolicyAsCodePanel.svelte';
  import BreakGlassPanel from '$lib/components/admin/BreakGlassPanel.svelte';
  import EvidenceBuilderPanel from '$lib/components/admin/EvidenceBuilderPanel.svelte';
  import OpsMetricsPanel from '$lib/components/admin/OpsMetricsPanel.svelte';
  import FeatureFlagsPanel from '$lib/components/admin/FeatureFlagsPanel.svelte';
  import NotificationCenterPanel from '$lib/components/admin/NotificationCenterPanel.svelte';
  import ChangeCalendarPanel from '$lib/components/admin/ChangeCalendarPanel.svelte';
  import BaselineDriftPanel from '$lib/components/admin/BaselineDriftPanel.svelte';
  import GlobalSearchPanel from '$lib/components/admin/GlobalSearchPanel.svelte';
  import AdminActivityFeedPanel from '$lib/components/admin/AdminActivityFeedPanel.svelte';
  import JitAccessPanel from '$lib/components/admin/JitAccessPanel.svelte';
  import ApprovalWorkflowPanel from '$lib/components/admin/ApprovalWorkflowPanel.svelte';

  type ImpersonationState = {
    userId: string;
    email: string;
    startedAt: string;
  } | null;

  type SectionId = 'quick' | 'core' | 'stats' | 'models' | 'security' | 'ops' | 'ux';

  type AdminSection = {
    id: SectionId;
    labelKey: string;
    descriptionKey: string;
  };

  const SECTION_KEY = 'admin.activeSection.v1';

  const sections: AdminSection[] = [
    { id: 'quick', labelKey: 'admin.sections.quickWins', descriptionKey: 'admin.sectionDescriptions.quickWins' },
    { id: 'core', labelKey: 'admin.sections.coreAdmin', descriptionKey: 'admin.sectionDescriptions.coreAdmin' },
    { id: 'stats', labelKey: 'admin.sections.stats', descriptionKey: 'admin.sectionDescriptions.stats' },
    { id: 'models', labelKey: 'admin.sections.models', descriptionKey: 'admin.sectionDescriptions.models' },
    { id: 'security', labelKey: 'admin.sections.security', descriptionKey: 'admin.sectionDescriptions.security' },
    { id: 'ops', labelKey: 'admin.sections.ops', descriptionKey: 'admin.sectionDescriptions.ops' },
    { id: 'ux', labelKey: 'admin.sections.ux', descriptionKey: 'admin.sectionDescriptions.ux' }
  ];

  function normalizeSection(value: string | null): SectionId {
    if (!value) return 'quick';
    if (value === 'ai') return 'models';
    if (sections.some((section) => section.id === value)) return value as SectionId;
    return 'quick';
  }

  let activeSection = $state<SectionId>(normalizeSection(readLocal<string>(SECTION_KEY, 'quick')));
  let impersonation = $state<ImpersonationState>(readLocal<ImpersonationState>('admin.impersonation.v1', null));

  function init() {
    const { accessToken } = getStoredTokens();
    if (!accessToken && isBrowser) {
      window.location.replace(`/login?redirect=${encodeURIComponent('/admin')}`);
    }
  }

  onMount(() => {
    void init();
    if (!isBrowser) return;

    const handleStorage = () => {
      impersonation = readLocal<ImpersonationState>('admin.impersonation.v1', null);
    };
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      activeSection = normalizeSection(hash || activeSection);
    };

    handleStorage();
    handleHash();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('hashchange', handleHash);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hashchange', handleHash);
    };
  });

  $effect(() => {
    if (!isBrowser) return;
    writeLocal(SECTION_KEY, activeSection);
  });

  const activeMeta = $derived.by(() => sections.find((section) => section.id === activeSection) || sections[0]);
</script>

<div class="page-shell page-content py-6 lg:py-8 space-y-6">
  <div>
    <h1
      class="text-2xl font-bold text-slate-900 dark:text-white"
      data-testid="admin-title"
    >
      {$isLoading ? 'Admin Control Center' : $_('admin.title')}
    </h1>
    <p class="text-sm text-slate-500">{$isLoading ? 'Operations, security, and AI governance' : $_('admin.subtitle')}</p>
  </div>

  {#if impersonation}
    <Alert color="yellow">
      <div class="flex items-center gap-2">
        <Badge color="yellow">Impersonation</Badge>
        <span>Active session for {impersonation.email} since {new Date(impersonation.startedAt).toLocaleString()}</span>
      </div>
    </Alert>
  {/if}

  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_(activeMeta.labelKey)}</div>
      <div class="text-xs text-slate-500">{$_(activeMeta.descriptionKey)}</div>
    </div>
    <Badge color="blue">{$isLoading ? 'Section' : $_('admin.sectionLabel')}: {$_(activeMeta.labelKey)}</Badge>
  </div>

  <section class="space-y-6">
    {#if activeSection === 'quick'}
      <HealthErrorPanel />
      <UserManagementPanel />
      <AuditLogsPanel />
    {:else if activeSection === 'core'}
      <RolePermissionMatrix />
      <SessionManagementPanel />
      <ImpersonationPanel />
      <JitAccessPanel />
      <ApprovalWorkflowPanel />
    {:else if activeSection === 'stats'}
      <AdminStatsPanel />
    {:else if activeSection === 'models'}
      <ModelGovernancePanel />
    {:else if activeSection === 'security'}
      <SecurityCompliancePanel />
      <PolicyAsCodePanel />
      <BreakGlassPanel />
      <EvidenceBuilderPanel />
    {:else if activeSection === 'ops'}
      <OpsMetricsPanel />
      <FeatureFlagsPanel />
      <NotificationCenterPanel />
      <ChangeCalendarPanel />
      <BaselineDriftPanel />
    {:else if activeSection === 'ux'}
      <GlobalSearchPanel />
      <AdminActivityFeedPanel />
    {/if}
  </section>
</div>
