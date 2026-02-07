<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Spinner } from 'flowbite-svelte';
  import { ArrowRight, RefreshCw } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { getCapabilities } from '$lib/auth/capabilities';
  import { listReminders, listWorkflowRequests, type Reminder, type WorkflowRequest } from '$lib/api/assetMgmt';

  let userRole = $state('');
  let userId = $state('');
  const caps = $derived.by(() => getCapabilities(userRole));

  let loading = $state(true);
  let error = $state('');

  let requests = $state<WorkflowRequest[]>([]);
  let reminders = $state<Reminder[]>([]);

  function statusColor(status: WorkflowRequest['status']): 'blue' | 'green' | 'red' | 'yellow' {
    if (status === 'approved' || status === 'done') return 'green';
    if (status === 'rejected' || status === 'canceled') return 'red';
    if (status === 'in_progress') return 'yellow';
    return 'blue';
  }

  async function load() {
    try {
      loading = true;
      error = '';

      const workflowsPromise = userId
        ? listWorkflowRequests({ requestedBy: userId, page: 1, limit: 20 })
        : Promise.resolve({ data: [] as WorkflowRequest[] });

      const remindersPromise = caps.canManageAssets
        ? listReminders({ status: 'pending', page: 1, limit: 20 })
        : Promise.resolve({ data: [] as Reminder[] });

      const [workflowResp, reminderResp] = await Promise.all([workflowsPromise, remindersPromise]);
      requests = workflowResp.data ?? [];
      reminders = reminderResp.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : $_('notifications.errors.loadFailed');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    userRole = localStorage.getItem('userRole') || '';
    userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || '';
    void load();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Notifications' : $_('notifications.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Updates for requests and operational reminders.' : $_('notifications.subtitle')}
      </p>
    </div>
    <Button color="light" onclick={load} disabled={loading}>
      <RefreshCw class="h-4 w-4 mr-2" />
      {$isLoading ? 'Refresh' : $_('common.refresh')}
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if loading && requests.length === 0 && reminders.length === 0}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else}
    <div class="grid gap-4 lg:grid-cols-2">
      <Card size="none" class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              {$isLoading ? 'My requests' : $_('notifications.sections.myRequests')}
            </div>
            <div class="text-sm text-slate-500">
              {$isLoading ? 'Latest workflow activity' : $_('notifications.sections.myRequestsSubtitle')}
            </div>
          </div>
          <Badge color="blue">{requests.length}</Badge>
        </div>

        <div class="mt-4 space-y-2">
          {#if requests.length === 0}
            <div class="text-sm text-slate-500">
              {$isLoading ? 'No request updates yet.' : $_('notifications.emptyRequests')}
            </div>
          {:else}
            {#each requests as req (req.id)}
              <a
                href={`/requests/${req.id}`}
                class="block rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {req.requestType} · {req.assetId || '-'}
                    </div>
                    <div class="text-xs text-slate-500">
                      {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <Badge color={statusColor(req.status)}>{req.status}</Badge>
                    <ArrowRight class="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </Card>

      <Card size="none" class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              {$isLoading ? 'Reminders' : $_('notifications.sections.reminders')}
            </div>
            <div class="text-sm text-slate-500">
              {$isLoading ? 'Asset warranty & maintenance reminders' : $_('notifications.sections.remindersSubtitle')}
            </div>
          </div>
          <Badge color="blue">{reminders.length}</Badge>
        </div>

        {#if !caps.canManageAssets}
          <Alert color="blue" class="mt-4">
            {$isLoading ? 'Reminders are visible to asset managers.' : $_('notifications.remindersRestricted')}
          </Alert>
        {:else}
          <div class="mt-4 space-y-2">
            {#if reminders.length === 0}
              <div class="text-sm text-slate-500">
                {$isLoading ? 'No reminders.' : $_('notifications.emptyReminders')}
              </div>
            {:else}
              {#each reminders as reminder (reminder.id)}
                <a
                  href={reminder.assetId ? `/assets/${reminder.assetId}` : '/assets'}
                  class="block rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {reminder.reminderType}
                      </div>
                      <div class="text-xs text-slate-500 truncate">{reminder.assetId || '-'}</div>
                    </div>
                    <div class="text-xs text-slate-500 shrink-0">
                      {new Date(reminder.dueAt).toLocaleDateString()}
                    </div>
                  </div>
                </a>
              {/each}
            {/if}
          </div>
        {/if}
      </Card>
    </div>
  {/if}
</div>

