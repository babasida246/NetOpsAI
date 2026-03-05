<script lang="ts">
  import {
    Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner,
    Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell,
    Toggle, Textarea, Tabs, TabItem
  } from 'flowbite-svelte';
  import { Plus, Trash2, Edit, Zap, Bell, Clock } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    listRules, createRule, updateRule, deleteRule,
    listNotifications, listTasks, createTask, deleteTask,
    type AutomationRule, type Notification, type ScheduledTask
  } from '$lib/api/automation';

  let activeTab = $state<'rules' | 'notifications' | 'tasks'>('rules');

  // Rules state
  let rules = $state<AutomationRule[]>([]);
  let notifications = $state<Notification[]>([]);
  let tasks = $state<ScheduledTask[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Rule form
  let showRuleModal = $state(false);
  let editingRule = $state<AutomationRule | null>(null);
  let ruleName = $state('');
  let ruleEventType = $state('asset_status_change');
  let ruleConditions = $state('{}');
  let ruleActions = $state('{}');
  let ruleIsActive = $state(true);
  let rulePriority = $state(1);
  let saving = $state(false);

  // Task form
  let showTaskModal = $state(false);
  let taskName = $state('');
  let taskType = $state('maintenance_check');
  let taskSchedule = $state('0 9 * * 1');
  let taskConfig = $state('{}');
  let taskIsActive = $state(true);

  async function loadData() {
    try {
      loading = true;
      error = '';
      const [rulesRes, notifRes, tasksRes] = await Promise.all([
        listRules().catch(() => ({ data: [] })),
        listNotifications().catch(() => ({ data: [] })),
        listTasks().catch(() => ({ data: [] }))
      ]);
      rules = rulesRes.data ?? [];
      notifications = notifRes.data ?? [];
      tasks = tasksRes.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  function openNewRule() {
    editingRule = null;
    ruleName = '';
    ruleEventType = 'asset_status_change';
    ruleConditions = '{}';
    ruleActions = '{}';
    ruleIsActive = true;
    rulePriority = 1;
    showRuleModal = true;
  }

  function openEditRule(rule: AutomationRule) {
    editingRule = rule;
    ruleName = rule.name;
    ruleEventType = rule.eventType;
    ruleConditions = JSON.stringify(rule.conditions, null, 2);
    ruleActions = JSON.stringify(rule.actions, null, 2);
    ruleIsActive = rule.isActive;
    rulePriority = rule.priority;
    showRuleModal = true;
  }

  async function handleSaveRule() {
    if (!ruleName) return;
    try {
      saving = true;
      let conditions: Record<string, unknown>, actions: Record<string, unknown>;
      try { conditions = JSON.parse(ruleConditions); } catch { error = 'Invalid JSON for conditions'; return; }
      try { actions = JSON.parse(ruleActions); } catch { error = 'Invalid JSON for actions'; return; }

      const data = { name: ruleName, eventType: ruleEventType, conditions, actions, isActive: ruleIsActive, priority: rulePriority };
      if (editingRule) {
        await updateRule(editingRule.id, data);
      } else {
        await createRule(data);
      }
      showRuleModal = false;
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    try {
      await deleteRule(id);
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Delete failed';
    }
  }

  function openNewTask() {
    taskName = '';
    taskType = 'maintenance_check';
    taskSchedule = '0 9 * * 1';
    taskConfig = '{}';
    taskIsActive = true;
    showTaskModal = true;
  }

  async function handleSaveTask() {
    if (!taskName) return;
    try {
      saving = true;
      let config: Record<string, unknown>;
      try { config = JSON.parse(taskConfig); } catch { error = 'Invalid JSON'; return; }
      await createTask({ name: taskName, taskType: taskType, schedule: taskSchedule, config, isActive: taskIsActive });
      showTaskModal = false;
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed';
    } finally {
      saving = false;
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Delete failed';
    }
  }

  $effect(() => { void loadData(); });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-6">
    <h1 class="text-2xl font-semibold flex items-center gap-2">
      <Zap class="w-6 h-6 text-yellow-500" /> {$_('automation.title')}
    </h1>
    <p class="text-sm text-gray-500 mt-1">{$_('automation.subtitle')}</p>
  </div>

  {#if error}
    <Alert color="red" class="mb-4" dismissable>{error}</Alert>
  {/if}

  <Tabs style="underline">
    <TabItem open={activeTab === 'rules'} title={$_('automation.rulesTab')} on:click={() => activeTab = 'rules'}>
      <div class="flex justify-end mb-4">
        <Button data-testid="btn-new-rule" onclick={openNewRule}><Plus class="w-4 h-4 mr-2" /> {$_('automation.newRule')}</Button>
      </div>
      {#if loading}
        <div class="flex justify-center py-10"><Spinner size="8" /></div>
      {:else}
        <Table>
          <TableHead>
            <TableHeadCell>{$_('common.name')}</TableHeadCell>
            <TableHeadCell>{$_('automation.event')}</TableHeadCell>
            <TableHeadCell>{$_('automation.priority')}</TableHeadCell>
            <TableHeadCell>{$_('common.status')}</TableHeadCell>
            <TableHeadCell>{$_('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each rules as rule}
              <TableBodyRow data-testid="rule-row">
                <TableBodyCell>{rule.name}</TableBodyCell>
                <TableBodyCell><Badge>{rule.eventType}</Badge></TableBodyCell>
                <TableBodyCell>{rule.priority}</TableBodyCell>
                <TableBodyCell>
                  <Badge color={rule.isActive ? 'green' : 'gray'}>{rule.isActive ? $_('common.active') : $_('common.inactive')}</Badge>
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex gap-2">
                    <Button size="xs" color="light" data-testid="btn-edit-rule" onclick={() => openEditRule(rule)}>
                      <Edit class="w-3 h-3" />
                    </Button>
                    <Button size="xs" color="red" data-testid="btn-delete-rule" onclick={() => handleDeleteRule(rule.id)}>
                      <Trash2 class="w-3 h-3" />
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              <TableBodyRow><TableBodyCell colspan="5" class="text-center text-gray-500">{$_('automation.noRules')}</TableBodyCell></TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </TabItem>

    <TabItem title={$_('automation.notificationsTab')} on:click={() => activeTab = 'notifications'}>
      <div class="space-y-3 mt-4">
        {#if notifications.length === 0}
          <p class="text-center text-gray-500 py-8">{$_('automation.noNotifications')}</p>
        {:else}
          {#each notifications as notif}
            <Card class="p-4">
              <div class="flex items-start gap-3">
                <Bell class={`w-5 h-5 ${notif.isRead ? 'text-gray-400' : 'text-blue-600'}`} />
                <div class="flex-1">
                  <p class="font-semibold text-sm">{notif.title}</p>
                  <p class="text-sm text-gray-500">{notif.message}</p>
                  <p class="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
                {#if !notif.isRead}
                  <Badge color="blue">{$_('automation.newBadge')}</Badge>
                {/if}
              </div>
            </Card>
          {/each}
        {/if}
      </div>
    </TabItem>

    <TabItem title={$_('automation.tasksTab')} on:click={() => activeTab = 'tasks'}>
      <div class="flex justify-end mb-4 mt-4">
        <Button data-testid="btn-new-task" onclick={openNewTask}><Plus class="w-4 h-4 mr-2" /> {$_('automation.newTask')}</Button>
      </div>
      <Table>
        <TableHead>
          <TableHeadCell>{$_('common.name')}</TableHeadCell>
          <TableHeadCell>{$_('common.type')}</TableHeadCell>
          <TableHeadCell>{$_('automation.schedule')}</TableHeadCell>
          <TableHeadCell>{$_('common.status')}</TableHeadCell>
          <TableHeadCell>{$_('automation.lastRun')}</TableHeadCell>
          <TableHeadCell>{$_('common.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each tasks as task}
            <TableBodyRow data-testid="task-row">
              <TableBodyCell>{task.name}</TableBodyCell>
              <TableBodyCell><Badge color="purple">{task.taskType}</Badge></TableBodyCell>
              <TableBodyCell><code class="text-xs">{task.schedule}</code></TableBodyCell>
              <TableBodyCell>
                <Badge color={task.isActive ? 'green' : 'gray'}>{task.isActive ? $_('common.active') : $_('common.inactive')}</Badge>
              </TableBodyCell>
              <TableBodyCell>{task.lastRunAt ? new Date(task.lastRunAt).toLocaleString() : $_('automation.never')}</TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="red" data-testid="btn-delete-task" onclick={() => handleDeleteTask(task.id)}>
                  <Trash2 class="w-3 h-3" />
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {:else}
            <TableBodyRow><TableBodyCell colspan="6" class="text-center text-gray-500">{$_('automation.noTasks')}</TableBodyCell></TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </TabItem>
  </Tabs>
</div>

<!-- Rule Modal -->
<Modal bind:open={showRuleModal} size="lg">
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{editingRule ? $_('automation.editRule') : $_('automation.newRuleTitle')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$_('automation.ruleName')}</Label>
      <Input data-testid="input-rule-name" bind:value={ruleName} placeholder={$_('automation.ruleNamePlaceholder')} />
    </div>
    <div>
      <Label class="mb-2">{$_('automation.eventType')}</Label>
      <Select data-testid="select-event-type" bind:value={ruleEventType}>
        <option value="asset_status_change">{$_('automation.events.assetStatusChange')}</option>
        <option value="maintenance_created">{$_('automation.events.maintenanceCreated')}</option>
        <option value="warranty_expiring">{$_('automation.events.warrantyExpiring')}</option>
        <option value="inventory_low">{$_('automation.events.inventoryLow')}</option>
        <option value="cost_threshold">{$_('automation.events.costThreshold')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$_('automation.priorityLabel')}</Label>
      <Input data-testid="input-priority" type="number" min="1" max="10" bind:value={rulePriority} />
    </div>
    <div>
      <Label class="mb-2">{$_('automation.conditions')}</Label>
      <Textarea data-testid="input-conditions" bind:value={ruleConditions} rows={3} placeholder={'{"status": "in_repair"}'} />
    </div>
    <div>
      <Label class="mb-2">{$_('automation.actionsLabel')}</Label>
      <Textarea data-testid="input-actions" bind:value={ruleActions} rows={3} placeholder={'{"notify": true, "assignTo": "team-a"}'} />
    </div>
    <div class="flex items-center gap-2">
      <Toggle bind:checked={ruleIsActive} /> <span>{$_('common.active')}</span>
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showRuleModal = false}>{$_('common.cancel')}</Button>
      <Button data-testid="btn-save-rule" onclick={handleSaveRule} disabled={saving || !ruleName}>
        {saving ? $_('common.saving') : $_('common.save')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Task Modal -->
<Modal bind:open={showTaskModal} size="lg">
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$_('automation.newTaskTitle')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$_('automation.taskName')}</Label>
      <Input data-testid="input-task-name" bind:value={taskName} placeholder={$_('automation.taskNamePlaceholder')} />
    </div>
    <div>
      <Label class="mb-2">{$_('automation.taskType')}</Label>
      <Select data-testid="select-task-type" bind:value={taskType}>
        <option value="maintenance_check">{$_('automation.taskTypes.maintenanceCheck')}</option>
        <option value="warranty_check">{$_('automation.taskTypes.warrantyCheck')}</option>
        <option value="inventory_audit">{$_('automation.taskTypes.inventoryAudit')}</option>
        <option value="report_generation">{$_('automation.taskTypes.reportGeneration')}</option>
        <option value="data_cleanup">{$_('automation.taskTypes.dataCleanup')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$_('automation.cronSchedule')}</Label>
      <Input data-testid="input-schedule" bind:value={taskSchedule} placeholder="0 9 * * 1" />
      <p class="text-xs text-gray-400 mt-1">Example: 0 9 * * 1 = every Monday at 9am</p>
    </div>
    <div>
      <Label class="mb-2">{$_('automation.configuration')}</Label>
      <Textarea data-testid="input-task-config" bind:value={taskConfig} rows={3} />
    </div>
    <div class="flex items-center gap-2">
      <Toggle bind:checked={taskIsActive} /> <span>{$_('common.active')}</span>
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showTaskModal = false}>{$_('common.cancel')}</Button>
      <Button data-testid="btn-save-task" onclick={handleSaveTask} disabled={saving || !taskName}>
        {saving ? $_('common.saving') : $_('automation.create')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
