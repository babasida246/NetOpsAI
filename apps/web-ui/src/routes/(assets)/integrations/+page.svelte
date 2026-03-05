<script lang="ts">
  import {
    Alert, Badge, Button, Card, Input, Label, Modal, Select, Spinner,
    Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell,
    Tabs, TabItem
  } from 'flowbite-svelte';
  import { Plus, Trash2, Link, Settings, Zap } from 'lucide-svelte';
  import {
    listConnectors, createConnector, updateConnector, deleteConnector, testConnection,
    listWebhooks, createWebhook, deleteWebhook,
    type IntegrationConnector, type Webhook
  } from '$lib/api/integrations';
  import { _, isLoading } from '$lib/i18n';

  let loading = $state(true);
  let error = $state('');
  let connectors = $state<IntegrationConnector[]>([]);
  let webhooks = $state<Webhook[]>([]);

  // Connector form
  let showConnectorModal = $state(false);
  let connName = $state('');
  let connProvider = $state<string>('api_generic');
  let connConfig = $state('{}');
  let connActive = $state(false);
  let saving = $state(false);
  let testResult = $state<{ healthy: boolean; message: string } | null>(null);

  // Webhook form
  let showWebhookModal = $state(false);
  let whName = $state('');
  let whUrl = $state('');
  let whEvents = $state('');
  let whActive = $state(true);

  async function loadData() {
    try {
      loading = true;
      error = '';
      const [connRes, whRes] = await Promise.all([
        listConnectors().catch(() => ({ data: [] })),
        listWebhooks().catch(() => ({ data: [] }))
      ]);
      connectors = connRes.data ?? [];
      webhooks = whRes.data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  function openNewConnector() {
    connName = '';
    connProvider = 'api_generic';
    connConfig = '{}';
    connActive = false;
    showConnectorModal = true;
  }

  async function handleSaveConnector() {
    if (!connName) return;
    try {
      saving = true;
      let config: Record<string, unknown>;
      try { config = JSON.parse(connConfig); } catch { error = 'Invalid JSON'; return; }
      await createConnector({ name: connName, provider: connProvider, config, isActive: connActive });
      showConnectorModal = false;
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed';
    } finally {
      saving = false;
    }
  }

  async function handleDeleteConnector(id: string) {
    if (!confirm('Delete this connector?')) return;
    try {
      await deleteConnector(id);
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Delete failed';
    }
  }

  async function handleTestConnection(id: string) {
    try {
      testResult = null;
      const res = await testConnection(id);
      testResult = res.data;
    } catch (err) {
      testResult = { healthy: false, message: err instanceof Error ? err.message : 'Test failed' };
    }
  }

  function openNewWebhook() {
    whName = '';
    whUrl = '';
    whEvents = '';
    whActive = true;
    showWebhookModal = true;
  }

  async function handleSaveWebhook() {
    if (!whName || !whUrl) return;
    try {
      saving = true;
      const events = whEvents.split(',').map(e => e.trim()).filter(Boolean);
      await createWebhook({ name: whName, url: whUrl, events, isActive: whActive });
      showWebhookModal = false;
      await loadData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed';
    } finally {
      saving = false;
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm('Delete?')) return;
    try {
      await deleteWebhook(id);
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
      <Link class="w-6 h-6 text-purple-500" /> {$_('integrations.title')}
    </h1>
    <p class="text-sm text-gray-500 mt-1">{$_('integrations.subtitle')}</p>
  </div>

  {#if error}
    <Alert color="red" class="mb-4" dismissable>{error}</Alert>
  {/if}

  {#if testResult}
    <Alert color={testResult.healthy ? 'green' : 'red'} class="mb-4" dismissable>
      {$_('integrations.connectionTest')}: {testResult.healthy ? $_('integrations.success') : $_('integrations.failed')} — {testResult.message}
    </Alert>
  {/if}

  <Tabs style="underline">
    <TabItem open title={$_('integrations.connectorsTab')}>
      <div class="flex justify-end mb-4 mt-4">
        <Button data-testid="btn-new-connector" onclick={openNewConnector}>
          <Plus class="w-4 h-4 mr-2" /> {$_('integrations.newConnector')}
        </Button>
      </div>
      {#if loading}
        <div class="flex justify-center py-10"><Spinner size="8" /></div>
      {:else}
        <Table>
          <TableHead>
            <TableHeadCell>{$_('common.name')}</TableHeadCell>
            <TableHeadCell>{$_('integrations.provider')}</TableHeadCell>
            <TableHeadCell>{$_('common.status')}</TableHeadCell>
            <TableHeadCell>{$_('integrations.health')}</TableHeadCell>
            <TableHeadCell>{$_('integrations.lastSync')}</TableHeadCell>
            <TableHeadCell>{$_('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each connectors as conn}
              <TableBodyRow data-testid="connector-row">
                <TableBodyCell class="font-semibold">{conn.name}</TableBodyCell>
                <TableBodyCell><Badge color="purple">{conn.provider}</Badge></TableBodyCell>
                <TableBodyCell>
                  <Badge color={conn.isActive ? 'green' : 'gray'}>{conn.isActive ? $_('common.active') : $_('common.inactive')}</Badge>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color={conn.healthStatus === 'healthy' ? 'green' : conn.healthStatus === 'error' ? 'red' : 'yellow'}>
                    {conn.healthStatus}
                  </Badge>
                </TableBodyCell>
                <TableBodyCell>{conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : $_('integrations.never')}</TableBodyCell>
                <TableBodyCell>
                  <div class="flex gap-2">
                    <Button size="xs" color="blue" data-testid="btn-test-conn" onclick={() => handleTestConnection(conn.id)}>
                      <Zap class="w-3 h-3" />
                    </Button>
                    <Button size="xs" color="red" data-testid="btn-delete-conn" onclick={() => handleDeleteConnector(conn.id)}>
                      <Trash2 class="w-3 h-3" />
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              <TableBodyRow><TableBodyCell colspan="6" class="text-center text-gray-500">{$_('integrations.noConnectors')}</TableBodyCell></TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </TabItem>

    <TabItem title={$_('integrations.webhooksTab')}>
      <div class="flex justify-end mb-4 mt-4">
        <Button data-testid="btn-new-webhook" onclick={openNewWebhook}>
          <Plus class="w-4 h-4 mr-2" /> {$_('integrations.newWebhook')}
        </Button>
      </div>
      <Table>
        <TableHead>
          <TableHeadCell>{$_('common.name')}</TableHeadCell>
          <TableHeadCell>{$_('integrations.url')}</TableHeadCell>
          <TableHeadCell>{$_('integrations.events')}</TableHeadCell>
          <TableHeadCell>{$_('common.status')}</TableHeadCell>
          <TableHeadCell>{$_('common.actions')}</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each webhooks as wh}
            <TableBodyRow data-testid="webhook-row">
              <TableBodyCell class="font-semibold">{wh.name}</TableBodyCell>
              <TableBodyCell class="text-xs truncate max-w-[200px]">{wh.url}</TableBodyCell>
              <TableBodyCell>
                {#each wh.events.slice(0, 3) as ev}
                  <Badge color="indigo" class="mr-1 text-xs">{ev}</Badge>
                {/each}
                {#if wh.events.length > 3}
                  <Badge color="gray">+{wh.events.length - 3}</Badge>
                {/if}
              </TableBodyCell>
              <TableBodyCell>
                <Badge color={wh.isActive ? 'green' : 'gray'}>{wh.isActive ? $_('common.active') : $_('common.inactive')}</Badge>
              </TableBodyCell>
              <TableBodyCell>
                <Button size="xs" color="red" data-testid="btn-delete-wh" onclick={() => handleDeleteWebhook(wh.id)}>
                  <Trash2 class="w-3 h-3" />
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {:else}
            <TableBodyRow><TableBodyCell colspan="5" class="text-center text-gray-500">{$_('integrations.noWebhooks')}</TableBodyCell></TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </TabItem>
  </Tabs>
</div>

<!-- Connector Modal -->
<Modal bind:open={showConnectorModal} size="lg">
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$_('integrations.newConnectorTitle')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$_('integrations.connectorName')}</Label>
      <Input data-testid="input-conn-name" bind:value={connName} placeholder={$_('integrations.connectorNamePlaceholder')} />
    </div>
    <div>
      <Label class="mb-2">{$_('integrations.provider')}</Label>
      <Select data-testid="select-provider" bind:value={connProvider}>
        <option value="servicenow">{$_('integrations.typeServiceNow')}</option>
        <option value="jira">{$_('integrations.typeJira')}</option>
        <option value="slack">{$_('integrations.typeSlack')}</option>
        <option value="teams">{$_('integrations.typeTeams')}</option>
        <option value="aws">AWS</option>
        <option value="azure">{$_('integrations.typeAzure')}</option>
        <option value="email">{$_('integrations.typeEmail')}</option>
        <option value="webhook">{$_('integrations.typeWebhook')}</option>
        <option value="csv_import">{$_('integrations.typeCsvImport')}</option>
        <option value="api_generic">{$_('integrations.typeGenericApi')}</option>
      </Select>
    </div>
    <div>
      <Label class="mb-2">{$_('integrations.configJson')}</Label>
      <Input data-testid="input-conn-config" bind:value={connConfig} placeholder={'{\"url\": \"...\"}'} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showConnectorModal = false}>{$_('common.cancel')}</Button>
      <Button data-testid="btn-save-connector" onclick={handleSaveConnector} disabled={saving || !connName}>
        {saving ? $_('common.saving') : $_('integrations.create')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Webhook Modal -->
<Modal bind:open={showWebhookModal}>
  <svelte:fragment slot="header">
    <h3 class="text-lg font-semibold">{$_('integrations.newWebhookTitle')}</h3>
  </svelte:fragment>
  <div class="space-y-4">
    <div>
      <Label class="mb-2">{$_('common.name')}</Label>
      <Input data-testid="input-wh-name" bind:value={whName} placeholder="e.g. Slack alerts" />
    </div>
    <div>
      <Label class="mb-2">{$_('integrations.url')}</Label>
      <Input data-testid="input-wh-url" bind:value={whUrl} placeholder="https://hooks.slack.com/..." />
    </div>
    <div>
      <Label class="mb-2">{$_('integrations.eventsLabel')}</Label>
      <Input data-testid="input-wh-events" bind:value={whEvents} placeholder="asset.created, asset.updated" />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-2">
      <Button color="alternative" onclick={() => showWebhookModal = false}>{$_('common.cancel')}</Button>
      <Button data-testid="btn-save-webhook" onclick={handleSaveWebhook} disabled={saving || !whName || !whUrl}>
        {saving ? $_('common.saving') : $_('integrations.create')}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
