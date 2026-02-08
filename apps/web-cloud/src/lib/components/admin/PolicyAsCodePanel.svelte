<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Checkbox, Input, Label, Select, Textarea } from 'flowbite-svelte';
  import { governanceApi, type GovernancePolicy } from '$lib/netops/api/governanceApi';

  let policies = $state<GovernancePolicy[]>([]);
  let name = $state('');
  let environment = $state<'dev' | 'staging' | 'prod' | 'all'>('all');
  let allowList = $state('');
  let denyList = $state('reload\nerase');
  let dangerousList = $state('reload\nwrite erase');
  let requireApproval = $state(false);
  let status = $state('');

  async function loadPolicies() {
    policies = await governanceApi.listPolicies();
  }

  async function createPolicy() {
    status = '';
    const policy = await governanceApi.createPolicy({
      name,
      environment,
      allowList: allowList.split('\n').map((item) => item.trim()).filter(Boolean),
      denyList: denyList.split('\n').map((item) => item.trim()).filter(Boolean),
      dangerousList: dangerousList.split('\n').map((item) => item.trim()).filter(Boolean),
      requireApproval
    });
    policies = [policy, ...policies];
    status = `Policy created: ${policy.name}`;
    name = '';
  }

  onMount(() => {
    void loadPolicies();
  });
</script>

<Card class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">Policy as Code</h3>
      <p class="text-sm text-slate-500">Define allow/deny/dangerous rules per environment.</p>
    </div>
    <Badge color="blue">Governance</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <div class="space-y-2">
      <Label>Name</Label>
      <Input bind:value={name} placeholder="Prod Guardrails" />
      <Label>Environment</Label>
      <Select bind:value={environment}>
        <option value="all">All</option>
        <option value="dev">Dev</option>
        <option value="staging">Staging</option>
        <option value="prod">Prod</option>
      </Select>
      <div class="flex items-center gap-2">
        <Checkbox bind:checked={requireApproval} />
        <span class="text-sm">Require approval for risky actions</span>
      </div>
    </div>
    <div class="space-y-2">
      <Label>Allowlist (one per line)</Label>
      <Textarea rows={2} bind:value={allowList} placeholder="show\nprint" />
      <Label>Denylist (one per line)</Label>
      <Textarea rows={2} bind:value={denyList} />
      <Label>Dangerous (one per line)</Label>
      <Textarea rows={2} bind:value={dangerousList} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createPolicy} disabled={!name.trim()}>Create policy</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if policies.length === 0}
      <p class="text-sm text-slate-500">No policies configured.</p>
    {:else}
      {#each policies as policy}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">{policy.name}</div>
              <div class="text-xs text-slate-500">{policy.environment.toUpperCase()}</div>
            </div>
            <Badge color={policy.requireApproval ? 'yellow' : 'green'}>
              {policy.requireApproval ? 'Approval' : 'Auto'}
            </Badge>
          </div>
          <div class="text-xs text-slate-500 mt-2">Allow: {policy.allowList.join(', ') || 'none'}</div>
          <div class="text-xs text-slate-500">Deny: {policy.denyList.join(', ') || 'none'}</div>
          <div class="text-xs text-slate-500">Danger: {policy.dangerousList.join(', ') || 'none'}</div>
        </div>
      {/each}
    {/if}
  </div>
</Card>
