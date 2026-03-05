<script lang="ts">
    import { Card, Button, Input, Select } from 'flowbite-svelte'
    import { _ } from '$lib/i18n'
    import { onMount } from 'svelte'
    import {
        listOrchestrationRules,
        createOrchestrationRule,
        updateOrchestrationRule,
        deleteOrchestrationRule,
        listModels,
        type OrchestrationRule,
        type ModelConfig
    } from '$lib/api/chat'
    import { formatAdminError } from '$lib/admin/errors'

    let rules = $state<OrchestrationRule[]>([])
    let models = $state<ModelConfig[]>([])
    let loading = $state(false)
    let error = $state('')

    let newRule = $state({
        name: '',
        description: '',
        strategy: 'fallback',
        modelSequence: [] as string[],
        priority: 1
    })

    const ruleNameId = 'rule-name'
    const strategyId = 'rule-strategy'
    const modelSequenceId = 'rule-model-sequence'
    const priorityId = 'rule-priority'
    const descriptionId = 'rule-description'

    async function loadData() {
        loading = true
        error = ''
        try {
            const [rulesRes, modelsRes] = await Promise.all([listOrchestrationRules(false), listModels()])
            rules = rulesRes.data ?? []
            models = modelsRes.data ?? []
        } catch (err) {
            error = formatAdminError(err)
        } finally {
            loading = false
        }
    }

    async function createRule() {
        if (!newRule.name || newRule.modelSequence.length === 0) return
        await createOrchestrationRule({
            name: newRule.name,
            description: newRule.description || undefined,
            strategy: newRule.strategy as OrchestrationRule['strategy'],
            modelSequence: newRule.modelSequence,
            priority: newRule.priority
        })
        newRule = { name: '', description: '', strategy: 'fallback', modelSequence: [], priority: 1 }
        await loadData()
    }

    async function toggleRule(rule: OrchestrationRule) {
        await updateOrchestrationRule(rule.id, { enabled: !rule.enabled })
        await loadData()
    }

    async function updatePriority(rule: OrchestrationRule, priority: number) {
        if (Number.isNaN(priority)) return
        await updateOrchestrationRule(rule.id, { priority })
        await loadData()
    }

    async function removeRule(rule: OrchestrationRule) {
        if (!confirm(`Delete rule ${rule.name}?`)) return
        await deleteOrchestrationRule(rule.id)
        await loadData()
    }

    onMount(() => {
        void loadData()
    })
</script>

<Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Routing & Fallback Rules</h3>
            <p class="text-sm text-slate-500">Define orchestration strategies and failover order.</p>
        </div>
        <Button size="sm" color="light" onclick={loadData} disabled={loading}>
            {loading ? $_('common.refreshing') : $_('common.refresh')}
        </Button>
    </div>

    {#if error}
        <div class="mt-3 text-sm text-rose-600 break-words">{error}</div>
    {/if}

    <Card class="w-full max-w-none mt-4 border border-slate-200 dark:border-slate-800">
        <div class="grid gap-3 md:grid-cols-2">
            <div>
                <label class="text-sm text-slate-500" for={ruleNameId}>{$_('routingRules.ruleName')}</label>
                <Input id={ruleNameId} bind:value={newRule.name} placeholder={$_('routingRules.ruleNamePlaceholder')} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={strategyId}>{$_('routingRules.strategy')}</label>
                <Select id={strategyId} bind:value={newRule.strategy}>
                    <option value="fallback">{$_('routingRules.strategyFallback')}</option>
                    <option value="load_balance">{$_('routingRules.strategyLoadBalance')}</option>
                    <option value="cost_optimize">{$_('routingRules.strategyCostOptimize')}</option>
                    <option value="quality_first">{$_('routingRules.strategyQualityFirst')}</option>
                    <option value="custom">{$_('routingRules.strategyCustom')}</option>
                </Select>
            </div>
            <div class="md:col-span-2">
                <label class="text-sm text-slate-500" for={modelSequenceId}>{$_('routingRules.modelSequence')}</label>
                <Select id={modelSequenceId} multiple bind:value={newRule.modelSequence}>
                    {#each models as model}
                        <option value={model.id}>{model.displayName ?? model.id}</option>
                    {/each}
                </Select>
                <p class="text-xs text-slate-400 mt-1">{$_('routingRules.dragOrderNote')}</p>
            </div>
            <div>
                <label class="text-sm text-slate-500" for={priorityId}>{$_('routingRules.priority')}</label>
                <Input id={priorityId} type="number" bind:value={newRule.priority} />
            </div>
            <div>
                <label class="text-sm text-slate-500" for={descriptionId}>{$_('common.description')}</label>
                <Input id={descriptionId} bind:value={newRule.description} placeholder={$_('routingRules.descriptionPlaceholder')} />
            </div>
        </div>
        <div class="mt-3">
            <Button onclick={createRule} disabled={!newRule.name || newRule.modelSequence.length === 0}>
                {$_('routingRules.createRule')}
            </Button>
        </div>
    </Card>

    <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                    <th class="px-4 py-3">{$_('routingRules.colRule')}</th>
                    <th class="px-4 py-3">{$_('routingRules.strategy')}</th>
                    <th class="px-4 py-3">{$_('routingRules.colModels')}</th>
                    <th class="px-4 py-3">{$_('routingRules.priority')}</th>
                    <th class="px-4 py-3">{$_('routingRules.colEnabled')}</th>
                    <th class="px-4 py-3">{$_('common.actions')}</th>
                </tr>
            </thead>
            <tbody>
                {#if rules.length === 0}
                    <tr><td colspan="6" class="px-4 py-4 text-center text-slate-500">{$_('routingRules.noRules')}</td></tr>
                {:else}
                    {#each rules as rule}
                        <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
                            <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                {rule.name}
                                {#if rule.description}
                                    <div class="text-xs text-slate-500">{rule.description}</div>
                                {/if}
                            </td>
                            <td class="px-4 py-3">{rule.strategy}</td>
                            <td class="px-4 py-3 text-xs text-slate-500">{rule.modelSequence.join(', ')}</td>
                            <td class="px-4 py-3">
                                <Input
                                    size="sm"
                                    type="number"
                                    value={rule.priority}
                                    onchange={(e) => updatePriority(rule, Number((e.target as HTMLInputElement).value))}
                                />
                            </td>
                            <td class="px-4 py-3">
                                <Button size="sm" color={rule.enabled ? 'green' : 'red'} onclick={() => toggleRule(rule)}>
                                    {rule.enabled ? $_('routingRules.enabled') : $_('routingRules.disabled')}
                                </Button>
                            </td>
                            <td class="px-4 py-3">
                                <Button size="sm" color="red" onclick={() => removeRule(rule)}>{$_('common.delete')}</Button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</Card>
