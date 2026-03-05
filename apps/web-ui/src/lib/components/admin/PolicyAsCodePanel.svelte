<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Checkbox, Input, Label, Select, Textarea } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
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
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('policyCode.title')}</h3>
      <p class="text-sm text-slate-500">{$_('policyCode.subtitle')}</p>
    </div>
    <Badge color="blue">{$_('policyCode.govBadge')}</Badge>
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <div class="space-y-2">
      <Label>{$_('common.name')}</Label>
      <Input bind:value={name} placeholder={$_('policyCode.namePlaceholder')} />
      <Label>{$_('changeCal.environment')}</Label>
      <Select bind:value={environment}>
        <option value="all">{$_('common.all')}</option>
        <option value="dev">{$_('common.envDev')}</option>
        <option value="staging">{$_('common.envStaging')}</option>
        <option value="prod">{$_('common.envProd')}</option>
      </Select>
      <div class="flex items-center gap-2">
        <Checkbox bind:checked={requireApproval} />
        <span class="text-sm">{$_('policyCode.requireApproval')}</span>
      </div>
    </div>
    <div class="space-y-2">
      <Label>{$_('policyCode.allowlist')}</Label>
      <Textarea rows={2} bind:value={allowList} placeholder={$_('policyCode.allowlistPlaceholder')} />
      <Label>{$_('policyCode.denylist')}</Label>
      <Textarea rows={2} bind:value={denyList} />
      <Label>{$_('policyCode.dangerous')}</Label>
      <Textarea rows={2} bind:value={dangerousList} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Button size="sm" onclick={createPolicy} disabled={!name.trim()}>{$_('policyCode.createPolicy')}</Button>
    {#if status}
      <span class="text-xs text-slate-500">{status}</span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if policies.length === 0}
      <p class="text-sm text-slate-500">{$_('policyCode.noPolicies')}</p>
    {:else}
      {#each policies as policy}
        <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">{policy.name}</div>
              <div class="text-xs text-slate-500">{policy.environment.toUpperCase()}</div>
            </div>
            <Badge color={policy.requireApproval ? 'yellow' : 'green'}>
              {policy.requireApproval ? $_('policyCode.approval') : $_('policyCode.auto')}
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
