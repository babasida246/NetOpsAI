<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Badge, Card, Spinner, Toggle, Modal, Label, Input, Select, Textarea } from 'flowbite-svelte';
  import { Settings, TrendingUp, Zap, DollarSign, Plus, Edit, Trash2, Eye } from 'lucide-svelte';
  import {
    listModels,
    listProviders,
    listOrchestrationRules,
    updateModelPriority,
    createOrchestrationRule,
    updateOrchestrationRule,
    deleteOrchestrationRule,
    type ModelConfig,
    type AIProvider,
    type OrchestrationRule
  } from '$lib/api/chat';

  let models = $state<ModelConfig[]>([]);
  let providers = $state<AIProvider[]>([]);
  let orchestrationRules = $state<OrchestrationRule[]>([]);
  let loading = $state(false);
  let selectedTab = $state<'models' | 'providers' | 'orchestration'>('models');
  
  // Modal states
  let showOrchestrationModal = $state(false);
  let showDiagramModal = $state(false);
  let editingRule = $state<OrchestrationRule | null>(null);
  
  // Form state
  let ruleForm = $state({
    name: '',
    description: '',
    strategy: 'fallback' as OrchestrationRule['strategy'],
    modelSequence: [] as string[],
    enabled: true,
    priority: 100
  });

  let mermaidDiagram = $state('');
  let diagramContainer: HTMLElement;

  onMount(async () => {
    await loadData();

    if (typeof window !== 'undefined') {
      if (!(window as any).mermaid) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load mermaid from CDN'));
          document.head.appendChild(s);
        });
      }

      (window as any).mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      });
    }
  });

  async function loadData() {
    loading = true;
    try {
      const [modelsRes, providersRes, rulesRes] = await Promise.all([
        listModels(),
        listProviders(),
        listOrchestrationRules()
      ]);
      models = modelsRes.data;
      providers = providersRes.data;
      orchestrationRules = rulesRes.data;
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      loading = false;
    }
  }

  async function handleUpdatePriority(modelId: string, delta: number) {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    const newPriority = Math.max(0, model.priority + delta);
    try {
      await updateModelPriority(modelId, newPriority);
      await loadData();
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }

  function openOrchestrationModal(rule?: OrchestrationRule) {
    if (rule) {
      editingRule = rule;
      ruleForm = {
        name: rule.name,
        description: rule.description || '',
        strategy: rule.strategy,
        modelSequence: [...rule.modelSequence],
        enabled: rule.enabled,
        priority: rule.priority
      };
    } else {
      editingRule = null;
      ruleForm = {
        name: '',
        description: '',
        strategy: 'fallback',
        modelSequence: [],
        enabled: true,
        priority: 100
      };
    }
    showOrchestrationModal = true;
  }

  async function handleSaveRule() {
    try {
      if (editingRule) {
        await updateOrchestrationRule(editingRule.id, ruleForm);
      } else {
        await createOrchestrationRule(ruleForm);
      }
      showOrchestrationModal = false;
      await loadData();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await deleteOrchestrationRule(ruleId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  }

  function generateMermaidDiagram() {
    const activeRules = orchestrationRules.filter(r => r.enabled);
    
    let diagram = 'graph TD\n';
    diagram += '    Start[User Request] --> Router{Orchestrator}\n';
    
    activeRules.forEach((rule, idx) => {
      const ruleNode = `Rule${idx}`;
      diagram += `    Router --> ${ruleNode}["${rule.name}<br/>${rule.strategy}"]\n`;
      
      rule.modelSequence.forEach((model, mIdx) => {
        const modelNode = `${ruleNode}_M${mIdx}`;
        const modelName = model.split('/').pop();
        diagram += `    ${ruleNode} --> ${modelNode}["${modelName}"]\n`;
        
        if (mIdx < rule.modelSequence.length - 1 && rule.strategy === 'fallback') {
          diagram += `    ${modelNode} -->|Fails| ${ruleNode}_M${mIdx + 1}\n`;
        }
      });
    });
    
    diagram += '    style Start fill:#e3f2fd\n';
    diagram += '    style Router fill:#fff9c4\n';
    
    mermaidDiagram = diagram;
    renderDiagram();
  }

  async function renderDiagram() {
    if (!diagramContainer || !mermaidDiagram) return;
    
    try {
      const { svg } = await mermaid.render('mermaid-diagram', mermaidDiagram);
      diagramContainer.innerHTML = svg;
    } catch (error) {
      console.error('Failed to render diagram:', error);
      diagramContainer.innerHTML = '<div class="text-red-500">Failed to render diagram</div>';
    }
  }

  function showDiagram() {
    generateMermaidDiagram();
    showDiagramModal = true;
  }

  $effect(() => {
    if (showDiagramModal && diagramContainer) {
      renderDiagram();
    }
  });
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Model Management</h1>
    <p class="text-gray-600 dark:text-gray-400">Configure models, providers, and orchestration strategies</p>
  </div>

  <!-- Tabs -->
  <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
    <nav class="flex gap-4">
      <button
        onclick={() => selectedTab = 'models'}
        class="pb-3 px-4 {selectedTab === 'models' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
      >
        <Settings class="w-5 h-5 inline-block mr-2" />
        Models ({models.length})
      </button>
      <button
        onclick={() => selectedTab = 'providers'}
        class="pb-3 px-4 {selectedTab === 'providers' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
      >
        <Zap class="w-5 h-5 inline-block mr-2" />
        Providers ({providers.length})
      </button>
      <button
        onclick={() => selectedTab = 'orchestration'}
        class="pb-3 px-4 {selectedTab === 'orchestration' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
      >
        <TrendingUp class="w-5 h-5 inline-block mr-2" />
        Orchestration ({orchestrationRules.length})
      </button>
    </nav>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner size="12" />
    </div>
  {:else if selectedTab === 'models'}
    <!-- Models List -->
    <div class="grid gap-4">
      {#each models.sort((a, b) => a.priority - b.priority) as model}
        <Card class="p-4">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{model.id}</h3>
                <Badge color={model.enabled ? 'green' : 'gray'}>{model.status}</Badge>
                <Badge color="blue">Tier {model.tier}</Badge>
                <Badge color="purple">Priority {model.priority}</Badge>
              </div>
              
              {#if model.description}
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{model.description}</p>
              {/if}

              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span class="text-gray-500">Provider:</span>
                  <span class="ml-2 font-medium">{model.provider}</span>
                </div>
                <div>
                  <span class="text-gray-500">Context:</span>
                  <span class="ml-2 font-medium">{model.contextWindow?.toLocaleString() || 'N/A'}</span>
                </div>
                <div>
                  <span class="text-gray-500">Input:</span>
                  <span class="ml-2 font-medium">${model.costPer1kInput || 'N/A'}/1K</span>
                </div>
                <div>
                  <span class="text-gray-500">Output:</span>
                  <span class="ml-2 font-medium">${model.costPer1kOutput || 'N/A'}/1K</span>
                </div>
              </div>

              <div class="flex gap-2 mt-3">
                {#if model.supportsStreaming}
                  <Badge color="indigo">Streaming</Badge>
                {/if}
                {#if model.supportsFunctions}
                  <Badge color="purple">Functions</Badge>
                {/if}
                {#if model.supportsVision}
                  <Badge color="pink">Vision</Badge>
                {/if}
              </div>
            </div>

            <div class="flex gap-2">
              <Button size="xs" color="light" onclick={() => handleUpdatePriority(model.id, -10)}>↑</Button>
              <Button size="xs" color="light" onclick={() => handleUpdatePriority(model.id, 10)}>↓</Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>

  {:else if selectedTab === 'providers'}
    <!-- Providers List -->
    <div class="grid md:grid-cols-2 gap-4">
      {#each providers as provider}
        <Card class="p-4">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{provider.name}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{provider.id}</p>
            </div>
            <Badge color={provider.status === 'active' ? 'green' : provider.status === 'maintenance' ? 'yellow' : 'gray'}>
              {provider.status}
            </Badge>
          </div>

          {#if provider.description}
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{provider.description}</p>
          {/if}

          <div class="text-sm space-y-2">
            {#if provider.apiEndpoint}
              <div>
                <span class="text-gray-500">Endpoint:</span>
                <span class="ml-2 font-mono text-xs">{provider.apiEndpoint}</span>
              </div>
            {/if}
            {#if provider.authType}
              <div>
                <span class="text-gray-500">Auth:</span>
                <span class="ml-2">{provider.authType}</span>
              </div>
            {/if}
            {#if provider.rateLimitPerMinute}
              <div>
                <span class="text-gray-500">Rate Limit:</span>
                <span class="ml-2">{provider.rateLimitPerMinute}/min</span>
              </div>
            {/if}
          </div>

          <div class="flex gap-2 mt-3">
            {#if provider.capabilities.streaming}
              <Badge color="blue">Streaming</Badge>
            {/if}
            {#if provider.capabilities.functions}
              <Badge color="purple">Functions</Badge>
            {/if}
            {#if provider.capabilities.vision}
              <Badge color="pink">Vision</Badge>
            {/if}
          </div>
        </Card>
      {/each}
    </div>

  {:else if selectedTab === 'orchestration'}
    <!-- Orchestration Rules -->
    <div class="mb-4 flex justify-between items-center">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Orchestration Rules</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">Define model selection and fallback strategies</p>
      </div>
      <div class="flex gap-2">
        <Button onclick={showDiagram} color="light">
          <Eye class="w-4 h-4 mr-2" />
          View Diagram
        </Button>
        <Button onclick={() => openOrchestrationModal()}>
          <Plus class="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </div>
    </div>

    <div class="grid gap-4">
      {#each orchestrationRules.sort((a, b) => a.priority - b.priority) as rule}
        <Card class="p-4">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                <Badge color={rule.enabled ? 'green' : 'gray'}>{rule.enabled ? 'Enabled' : 'Disabled'}</Badge>
                <Badge color="blue">{rule.strategy}</Badge>
                <Badge color="purple">Priority {rule.priority}</Badge>
              </div>

              {#if rule.description}
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{rule.description}</p>
              {/if}

              <div class="mb-3">
                <span class="text-sm text-gray-500 font-medium">Model Sequence:</span>
                <div class="flex gap-2 mt-2 flex-wrap">
                  {#each rule.modelSequence as model, idx}
                    <div class="flex items-center">
                      <Badge color="indigo">{model}</Badge>
                      {#if idx < rule.modelSequence.length - 1 && rule.strategy === 'fallback'}
                        <span class="mx-2 text-gray-400">→</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <Button size="xs" color="light" onclick={() => openOrchestrationModal(rule)}>
                <Edit class="w-4 h-4" />
              </Button>
              <Button size="xs" color="red" onclick={() => handleDeleteRule(rule.id)}>
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Orchestration Rule Modal -->
<Modal bind:open={showOrchestrationModal} size="lg">
  <h3 class="text-xl font-semibold mb-4">
    {editingRule ? 'Edit' : 'Create'} Orchestration Rule
  </h3>

  <div class="space-y-4">
    <div>
      <Label for="rule-name">Name</Label>
      <Input id="rule-name" bind:value={ruleForm.name} placeholder="My Orchestration Rule" />
    </div>

    <div>
      <Label for="rule-description">Description</Label>
      <Textarea id="rule-description" bind:value={ruleForm.description} rows="2" placeholder="Optional description" />
    </div>

    <div>
      <Label for="rule-strategy">Strategy</Label>
      <Select id="rule-strategy" bind:value={ruleForm.strategy}>
        <option value="fallback">Fallback (try models in order)</option>
        <option value="load_balance">Load Balance</option>
        <option value="cost_optimize">Cost Optimize</option>
        <option value="quality_first">Quality First</option>
        <option value="custom">Custom</option>
      </Select>
    </div>

    <div>
      <Label for="rule-priority">Priority (lower = higher priority)</Label>
      <Input id="rule-priority" type="number" bind:value={ruleForm.priority} />
    </div>

    <div>
      <Label>Model Sequence</Label>
      <div class="space-y-2">
        {#each ruleForm.modelSequence as model, idx}
          <div class="flex gap-2">
            <Input bind:value={ruleForm.modelSequence[idx]} placeholder="e.g., openai/gpt-4o-mini" class="flex-1" />
            <Button size="sm" color="red" onclick={() => {
              ruleForm.modelSequence = ruleForm.modelSequence.filter((_, i) => i !== idx);
            }}>
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        {/each}
        <Button size="sm" color="light" onclick={() => {
          ruleForm.modelSequence = [...ruleForm.modelSequence, ''];
        }}>
          <Plus class="w-4 h-4 mr-2" />
          Add Model
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Toggle bind:checked={ruleForm.enabled} />
      <Label>Enabled</Label>
    </div>
  </div>

  <div class="flex gap-2 mt-6">
    <Button onclick={handleSaveRule} disabled={!ruleForm.name || ruleForm.modelSequence.length === 0}>
      Save Rule
    </Button>
    <Button color="light" onclick={() => showOrchestrationModal = false}>
      Cancel
    </Button>
  </div>
</Modal>

<!-- Diagram Modal -->
<Modal bind:open={showDiagramModal} size="xl">
  <h3 class="text-xl font-semibold mb-4">Orchestration Flow Diagram</h3>
  
  <div bind:this={diagramContainer} class="bg-white dark:bg-gray-800 p-4 rounded-lg overflow-auto">
    <!-- Mermaid diagram will render here -->
  </div>

  <div class="mt-4">
    <Button color="light" onclick={() => showDiagramModal = false}>Close</Button>
  </div>
</Modal>

<style>
  :global(.mermaid) {
    display: flex;
    justify-content: center;
  }
</style>
