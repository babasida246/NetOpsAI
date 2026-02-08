<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import { page } from '$app/state';
  import { Button, Alert, Spinner, Tabs, TabItem, Accordion, AccordionItem } from 'flowbite-svelte';
  import { ArrowLeft, Play, CheckCircle, AlertTriangle, Rocket, X } from 'lucide-svelte';
  import { changesApi, devicesApi } from '$lib/netops/api/netopsApi';
  import type { ChangeRequest, ChangeSet, Device } from '$lib/netops/types';
  import StatusBadge from '$lib/netops/components/StatusBadge.svelte';
  import CodeViewer from '$lib/netops/components/CodeViewer.svelte';
  import LintFindingsList from '$lib/netops/components/LintFindingsList.svelte';
  import JsonViewer from '$lib/netops/components/JsonViewer.svelte';
  import { formatDate } from '$lib/netops/utils/format';
  
  let changeId = $derived(page.params.id);
  
  let change: (ChangeRequest & { changeSets?: ChangeSet[] }) | null = $state(null);
  let devices: Device[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  // Action states
  let planning = $state(false);
  let generating = $state(false);
  let verifying = $state(false);
  let submitting = $state(false);
  let deploying = $state(false);
  let closing = $state(false);
  
  // Results
  let planResult: any = $state(null);
  let generateResult: any = $state(null);
  let verifyResult: any = $state(null);
  let approvalResult: any = $state(null);
  
  let activeDeviceTab = $state('');
  
  async function loadChange() {
    try {
      loading = true;
      error = '';
      change = await changesApi.get(changeId);
      
      // Load device names
      if (change.device_scope && change.device_scope.length > 0) {
        const devicePromises = change.device_scope.map(id => 
          devicesApi.get(id).catch(() => null)
        );
        devices = (await Promise.all(devicePromises)).filter(Boolean) as Device[];
      }
      
      // Set first device as active tab
      if (change.changeSets && change.changeSets.length > 0) {
        activeDeviceTab = change.changeSets[0].device_id;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load change';
    } finally {
      loading = false;
    }
  }
  
  async function handlePlan() {
    try {
      planning = true;
      planResult = await changesApi.plan(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to run plan');
    } finally {
      planning = false;
    }
  }
  
  async function handleGenerate() {
    try {
      generating = true;
      generateResult = await changesApi.generate(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      generating = false;
    }
  }
  
  async function handleVerify() {
    try {
      verifying = true;
      verifyResult = await changesApi.verify(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to verify');
    } finally {
      verifying = false;
    }
  }
  
  async function handleSubmitApproval() {
    try {
      submitting = true;
      approvalResult = await changesApi.submitApproval(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit approval');
    } finally {
      submitting = false;
    }
  }
  
  async function handleDeploy() {
    if (!confirm('Are you sure you want to deploy this change?')) return;
    
    try {
      deploying = true;
      await changesApi.deploy(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to deploy');
    } finally {
      deploying = false;
    }
  }
  
  async function handleClose() {
    try {
      closing = true;
      await changesApi.close(changeId);
      await loadChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to close');
    } finally {
      closing = false;
    }
  }
  
  function getDeviceName(deviceId: string): string {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : deviceId.substring(0, 8);
  }
  
  $effect(() => {
    void loadChange();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <!-- Back button -->
  <div class="mb-4">
    <Button href="/netops/changes" color="alternative" size="sm">
      <ArrowLeft class="w-4 h-4 mr-2" />
      {$isLoading ? 'Back to Changes' : $_('netops.backToChanges')}
    </Button>
  </div>
  
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if error}
    <Alert color="red">{error}</Alert>
  {:else if change}
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <h1 class="text-2xl font-semibold">{change.title}</h1>
            <StatusBadge type="status" value={change.status} />
            <StatusBadge type="risk" value={change.risk_tier} />
          </div>
          
          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>Intent: {change.intent_type}</p>
            <p>Created by: {change.created_by}</p>
            <p>Created at: {formatDate(change.created_at)}</p>
            <p>Devices: {change.device_scope.length}</p>
          </div>
        </div>
        
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button size="sm" onclick={handlePlan} disabled={planning}>
              <Play class="w-4 h-4 mr-2" />
              {planning ? 'Planning...' : 'Plan'}
            </Button>
            <Button size="sm" color="alternative" onclick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          <div class="flex gap-2">
            <Button size="sm" color="alternative" onclick={handleVerify} disabled={verifying}>
              <CheckCircle class="w-4 h-4 mr-2" />
              {verifying ? 'Verifying...' : 'Verify'}
            </Button>
            <Button size="sm" color="alternative" onclick={handleSubmitApproval} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Approval'}
            </Button>
          </div>
          <div class="flex gap-2">
            <Button size="sm" color="red" onclick={handleDeploy} disabled={deploying || change.status !== 'approved'}>
              <Rocket class="w-4 h-4 mr-2" />
              {deploying ? 'Deploying...' : 'Deploy'}
            </Button>
            <Button size="sm" color="alternative" onclick={handleClose} disabled={closing}>
              <X class="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Content Sections -->
    <div class="space-y-6">
      <!-- Intent Parameters -->
      <Accordion>
        <AccordionItem>
          <svelte:fragment slot="header">
                            <span >{$isLoading ? 'Intent Parameters' : $_('netops.changeDetail.intentParameters')}</span>
                          </svelte:fragment>
          <JsonViewer data={change.params} />
        </AccordionItem>
        
        <!-- Plan Results -->
        {#if planResult}
          <AccordionItem>
            <svelte:fragment slot="header">
                                <span >{$isLoading ? 'Plan Results' : $_('netops.changeDetail.planResults')}</span>
                              </svelte:fragment>
            <div class="space-y-4">
              {#if planResult.missing_info && planResult.missing_info.length > 0}
                <Alert color="yellow">
                  <p class="font-semibold mb-2">Missing Information:</p>
                  <ul class="list-disc list-inside space-y-1">
                    {#each planResult.missing_info as info}
                      <li>{info}</li>
                    {/each}
                  </ul>
                </Alert>
              {/if}
              
              {#if planResult.task_graph}
                <div>
                  <p class="font-semibold mb-2">Task Graph:</p>
                  <JsonViewer data={planResult.task_graph} />
                </div>
              {/if}
            </div>
          </AccordionItem>
        {/if}
        
        <!-- Verify Results -->
        {#if verifyResult}
          <AccordionItem>
            <svelte:fragment slot="header">
                                <span >{$isLoading ? 'Verification Results' : $_('netops.changeDetail.verificationResults')}</span>
                              </svelte:fragment>
            <JsonViewer data={verifyResult} />
          </AccordionItem>
        {/if}
        
        <!-- Approval Results -->
        {#if approvalResult}
          <AccordionItem>
            <svelte:fragment slot="header">
                                <span >{$isLoading ? 'Approval Decision' : $_('netops.changeDetail.approvalDecision')}</span>
                              </svelte:fragment>
            <div class="space-y-4">
              <div>
                <p class="font-semibold mb-2">Decision:</p>
                <StatusBadge type="status" value={approvalResult.judge_decision} />
              </div>
              
              {#if approvalResult.reasons && approvalResult.reasons.length > 0}
                <div>
                  <p class="font-semibold mb-2">Reasons:</p>
                  <ul class="list-disc list-inside space-y-1">
                    {#each approvalResult.reasons as reason}
                      <li>{reason}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
              
              {#if approvalResult.required_fixes && approvalResult.required_fixes.length > 0}
                <Alert color="yellow">
                  <p class="font-semibold mb-2">Required Fixes:</p>
                  <ul class="list-disc list-inside space-y-1">
                    {#each approvalResult.required_fixes as fix}
                      <li>{fix}</li>
                    {/each}
                  </ul>
                </Alert>
              {/if}
            </div>
          </AccordionItem>
        {/if}
      </Accordion>
      
      <!-- Change Sets per Device -->
      {#if change.changeSets && change.changeSets.length > 0}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold mb-4">{$isLoading ? 'Device Change Sets' : $_('netops.changeDetail.deviceChangeSets')}</h2>
          
          <Tabs>
            {#each change.changeSets as changeSet}
              <TabItem 
                open={activeDeviceTab === changeSet.device_id} 
                onclick={() => activeDeviceTab = changeSet.device_id}
                title={getDeviceName(changeSet.device_id)}
              >
                <div class="space-y-6 py-4">
                  <!-- Candidate Config -->
                  <div>
                    <h3 class="font-semibold mb-2">{$isLoading ? 'Candidate Configuration' : $_('netops.changeDetail.candidateConfiguration')}</h3>
                    <CodeViewer code={changeSet.candidate_config} />
                  </div>
                  
                  <!-- Diff -->
                  {#if changeSet.diff}
                    <div>
                      <h3 class="font-semibold mb-2">{$isLoading ? 'Configuration Diff' : $_('netops.changeDetail.configurationDiff')}</h3>
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
                        <pre class="p-4 overflow-auto text-xs text-gray-100 font-mono max-h-96">{@html changeSet.diff.split('\n').map(line => {
                          if (line.startsWith('+') && !line.startsWith('+++')) {
                            return `<span class="bg-green-900/30 text-green-300">${line}</span>`;
                          } else if (line.startsWith('-') && !line.startsWith('---')) {
                            return `<span class="bg-red-900/30 text-red-300">${line}</span>`;
                          } else if (line.startsWith('@@')) {
                            return `<span class="text-blue-400">${line}</span>`;
                          }
                          return line;
                        }).join('\n')}</pre>
                      </div>
                    </div>
                  {/if}
                  
                  <!-- Steps -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 class="font-semibold mb-2">{$isLoading ? 'Precheck Steps' : $_('netops.changeDetail.precheckSteps')}</h3>
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        {#each changeSet.precheck_steps as step}
                          <div class="text-sm">
                            <div class="font-medium">{step.description}</div>
                            {#if step.command}
                              <code class="text-xs text-gray-600 dark:text-gray-400">{step.command}</code>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                    
                    <div>
                      <h3 class="font-semibold mb-2">{$isLoading ? 'Apply Steps' : $_('netops.changeDetail.applySteps')}</h3>
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        {#each changeSet.apply_steps as step}
                          <div class="text-sm">
                            <div class="font-medium">{step.description}</div>
                            {#if step.command}
                              <code class="text-xs text-gray-600 dark:text-gray-400">{step.command}</code>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                    
                    <div>
                      <h3 class="font-semibold mb-2">{$isLoading ? 'Postcheck Steps' : $_('netops.changeDetail.postcheckSteps')}</h3>
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        {#each changeSet.postcheck_steps as step}
                          <div class="text-sm">
                            <div class="font-medium">{step.description}</div>
                            {#if step.command}
                              <code class="text-xs text-gray-600 dark:text-gray-400">{step.command}</code>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                    
                    <div>
                      <h3 class="font-semibold mb-2">{$isLoading ? 'Rollback Plan' : $_('netops.changeDetail.rollbackPlan')}</h3>
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        {#each changeSet.rollback_plan as step}
                          <div class="text-sm">
                            <div class="font-medium">{step.description}</div>
                            {#if step.command}
                              <code class="text-xs text-gray-600 dark:text-gray-400">{step.command}</code>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              </TabItem>
            {/each}
          </Tabs>
        </div>
      {:else}
        <Alert color="blue">
          No change sets generated yet. Run "Generate" to create candidate configurations.
        </Alert>
      {/if}
    </div>
  {/if}
</div>

