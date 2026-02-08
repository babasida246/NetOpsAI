<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card } from 'flowbite-svelte';
  import { governanceApi, type ApprovalRequest } from '$lib/netops/api/governanceApi';

  let approvals = $state<ApprovalRequest[]>([]);
  let status = $state('');

  async function loadApprovals() {
    approvals = await governanceApi.listApprovals();
  }

  async function resolve(id: string, next: 'approved' | 'rejected') {
    status = '';
    const updated = await governanceApi.resolveApproval(id, next);
    approvals = approvals.map((item) => (item.id === id ? updated : item));
    status = `Approval ${next}: ${updated.ticketId}`;
  }

  onMount(() => {
    void loadApprovals();
  });
</script>

<Card class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">Approval Workflow</h3>
      <p class="text-sm text-slate-500">Gate high-risk actions before execution.</p>
    </div>
    <Badge color="blue">Core</Badge>
  </div>

  {#if status}
    <Alert color="blue">{status}</Alert>
  {/if}

  <div class="space-y-2">
    {#if approvals.length === 0}
      <p class="text-sm text-slate-500">No approvals pending.</p>
    {:else}
      {#each approvals as approval}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">{approval.reason}</div>
              <div class="text-xs text-slate-500">
                Device {approval.deviceId} · Ticket {approval.ticketId}
              </div>
              <div class="text-xs text-slate-500">{approval.requestedBy}</div>
            </div>
            <Badge color={approval.status === 'approved' ? 'green' : approval.status === 'rejected' ? 'red' : 'yellow'}>
              {approval.status}
            </Badge>
          </div>
          {#if approval.status === 'pending'}
            <div class="flex gap-2 mt-2">
              <Button size="xs" onclick={() => resolve(approval.id, 'approved')}>Approve</Button>
              <Button size="xs" color="light" onclick={() => resolve(approval.id, 'rejected')}>Reject</Button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</Card>
