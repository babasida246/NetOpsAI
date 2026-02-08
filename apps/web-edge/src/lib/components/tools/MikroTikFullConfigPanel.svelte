<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Badge, Button, Card, Checkbox, Input, Label, Modal, Select, Textarea } from 'flowbite-svelte';
  import { Download, Play, Plus, RefreshCw, ShieldAlert } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { devicesApi } from '$lib/netops/api/netopsApi';
  import type { Device } from '$lib/netops/types';
  import PageHeader from '$lib/components/tools/PageHeader.svelte';
  import SummaryPanel from '$lib/components/tools/SummaryPanel.svelte';
  import CodePreview from '$lib/components/tools/CodePreview.svelte';
  import EmptyState from '$lib/components/tools/EmptyState.svelte';
  import WarningBadge from '$lib/components/tools/WarningBadge.svelte';
  import {
    diffMikrotikRunningConfig,
    generateMikrotikFullConfig,
    pushMikrotikConfigSsh,
    type MikroTikDiffOutput,
    type MikroTikEnvironment,
    type MikroTikFullConfigIntent,
    type MikroTikFullConfigOutput,
    type MikroTikIntentInterface,
    type MikroTikIntentStaticRoute,
    type MikroTikIntentVlan,
    type MikroTikRoleTemplate,
    type MikroTikSecurityPreset
  } from '$lib/tools/mikrotik/service';

  type WizardStep = 'device' | 'network' | 'routing' | 'preview';

  const steps: Array<{ id: WizardStep; labelKey: string }> = [
    { id: 'device', labelKey: 'netops.mikrotik.steps.device' },
    { id: 'network', labelKey: 'netops.mikrotik.steps.network' },
    { id: 'routing', labelKey: 'netops.mikrotik.steps.routing' },
    { id: 'preview', labelKey: 'netops.mikrotik.steps.preview' }
  ];

  let step = $state<WizardStep>('device');

  let userRole = $state('');

  let devices = $state<Device[]>([]);
  let deviceLoading = $state(false);
  let deviceError = $state('');

  let selectedDeviceId = $state('');
  const selectedDevice = $derived.by(() => devices.find((d) => d.id === selectedDeviceId) || null);

  let role = $state<MikroTikRoleTemplate>('edge-internet');
  let environment = $state<MikroTikEnvironment>('dev');
  let securityPreset = $state<MikroTikSecurityPreset>('hospital-secure');
  let labMode = $state(false);

  let hostname = $state('');
  let routerOsVersion = $state('7.0.0');
  let model = $state('MikroTik');

  // Management / day-0
  let mgmtSubnet = $state('');
  let allowedSubnetsText = $state('');
  let sshPort = $state(22);
  let sshAllowPassword = $state(false);
  let sshAuthorizedKeysText = $state('');
  let winboxEnabled = $state(true);
  let winboxPort = $state(8291);
  let dnsAllowRemoteRequests = $state(false);
  let timezone = $state('Asia/Ho_Chi_Minh');
  let ntpServersText = $state('');
  let syslogRemote = $state('');
  let snmpEnabled = $state(false);
  let snmpCommunity = $state('public');
  let snmpAllowedSubnet = $state('');

  // Interfaces / VLAN
  let interfaces = $state<MikroTikIntentInterface[]>([]);
  let vlans = $state<MikroTikIntentVlan[]>([]);

  // Modals
  let showInterfaceModal = $state(false);
  let showVlanModal = $state(false);
  let showRouteModal = $state(false);

  let interfaceDraft = $state<{
    name: string;
    purpose: MikroTikIntentInterface['purpose'];
    comment: string;
    accessVlanId: string;
    trunkVlanIds: string;
  }>({ name: '', purpose: 'wan', comment: '', accessVlanId: '', trunkVlanIds: '' });

  let vlanDraft = $state<{
    id: number;
    name: string;
    subnet: string;
    gateway: string;
    group: MikroTikIntentVlan['group'] | '';
    dhcpEnabled: boolean;
  }>({ id: 10, name: 'mgmt', subnet: '', gateway: '', group: 'MGMT', dhcpEnabled: false });

  // Routing
  let staticRoutes = $state<MikroTikIntentStaticRoute[]>([]);
  let routeDraft = $state<MikroTikIntentStaticRoute>({ dst: '', gateway: '' });

  let publicType = $state<'dhcp' | 'static' | 'pppoe'>('dhcp');
  let wanInterface = $state('');
  let wanAddress = $state('');
  let wanGateway = $state('');
  let pppoeUser = $state('');
  let pppoePassword = $state('');
  let dnsServersText = $state('');

  let ospfEnabled = $state(false);
  let ospfRouterId = $state('');
  let ospfArea = $state('0.0.0.0');
  let ospfNetworksText = $state('');
  let ospfPassiveText = $state('');

  // Output
  let generating = $state(false);
  let generateError = $state('');
  let output = $state<MikroTikFullConfigOutput | null>(null);

  // Optional diff
  let runningConfig = $state('');
  let diff = $state<MikroTikDiffOutput | null>(null);
  let diffError = $state('');

  const isPrivileged = $derived.by(() => userRole === 'admin' || userRole === 'super_admin');

  const interfaceNames = $derived.by(() => interfaces.map((i) => i.name).filter(Boolean));
  const canGenerate = $derived.by(() => hostname.trim().length > 0 && mgmtSubnet.trim().length > 0 && interfaces.length > 0);

  const summary = $derived.by(() => ({
    device: selectedDevice?.name || '',
    vendor: 'MikroTik',
    environment,
    role,
    vlans: vlans.length,
    interfaces: interfaces.length,
    routes: staticRoutes.length
  }));

  function parseRouterOsMajor(version: string): number {
    const match = version.trim().match(/^(\\d+)/);
    const major = match ? Number(match[1]) : 7;
    return major >= 7 ? 7 : 6;
  }

  function parseLines(value: string): string[] {
    return value
      .split(/\\r?\\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseCommaNumbers(value: string): number[] | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numbers = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part))
      .filter((n) => Number.isFinite(n));
    return numbers.length ? numbers : undefined;
  }

  function buildIntent(): MikroTikFullConfigIntent {
    const deviceModel = model.trim() || selectedDevice?.model || 'MikroTik';
    const version = routerOsVersion.trim() || selectedDevice?.os_version || '7.0.0';

    const sshKeys = parseLines(sshAuthorizedKeysText);
    const allowed = parseLines(allowedSubnetsText);
    const dnsServers = parseLines(dnsServersText);
    const ntpServers = parseLines(ntpServersText);

    const intent: MikroTikFullConfigIntent = {
      device: {
        model: deviceModel,
        routerOsMajor: parseRouterOsMajor(version),
        routerOsVersion: version
      },
      role,
      hostname: hostname.trim(),
      environment,
      labMode,
      interfaces,
      vlans: vlans.length ? vlans : undefined,
      routing: {
        staticRoutes: staticRoutes.length ? staticRoutes : undefined,
        ospf: ospfEnabled
          ? {
              enabled: true,
              routerId: ospfRouterId.trim() || undefined,
              area: ospfArea.trim() || undefined,
              networks: parseLines(ospfNetworksText),
              passiveInterfaces: parseLines(ospfPassiveText)
            }
          : undefined
      },
      securityProfile: { preset: securityPreset },
      management: {
        mgmtSubnet: mgmtSubnet.trim(),
        allowedSubnets: allowed.length ? allowed : undefined,
        ssh: {
          port: sshPort,
          allowPassword: sshAllowPassword,
          authorizedKeys: sshKeys.length ? sshKeys : undefined
        },
        winbox: {
          enabled: winboxEnabled,
          port: winboxPort
        },
        dnsAllowRemoteRequests,
        timezone: timezone.trim() || undefined,
        ntpServers: ntpServers.length ? ntpServers : undefined,
        syslog: syslogRemote.trim()
          ? {
              remote: syslogRemote.trim()
            }
          : undefined,
        snmp: snmpEnabled
          ? {
              enabled: true,
              community: snmpCommunity.trim() || undefined,
              allowedSubnet: snmpAllowedSubnet.trim() || undefined
            }
          : undefined
      },
      notes: selectedDevice?.id ? `deviceId=${selectedDevice.id}` : undefined
    };

    if (wanInterface.trim()) {
      if (publicType === 'dhcp') {
        intent.internet = {
          wanInterface: wanInterface.trim(),
          publicType: 'dhcp',
          dnsServers: dnsServers.length ? dnsServers : undefined
        };
      } else if (publicType === 'static') {
        intent.internet = {
          wanInterface: wanInterface.trim(),
          publicType: 'static',
          address: wanAddress.trim(),
          gateway: wanGateway.trim(),
          dnsServers: dnsServers.length ? dnsServers : undefined
        };
      } else {
        intent.internet = {
          wanInterface: wanInterface.trim(),
          publicType: 'pppoe',
          username: pppoeUser.trim(),
          password: pppoePassword,
          dnsServers: dnsServers.length ? dnsServers : undefined
        };
      }
    }

    return intent;
  }

  async function loadDevices() {
    deviceLoading = true;
    deviceError = '';
    try {
      devices = await devicesApi.list({ vendor: 'mikrotik' });
    } catch (error) {
      deviceError = error instanceof Error ? error.message : String(error);
    } finally {
      deviceLoading = false;
    }
  }

  function applyDeviceDefaults(device: Device) {
    hostname = hostname || device.name;
    routerOsVersion = routerOsVersion || device.os_version || '7.0.0';
    model = device.model || model;
  }

  function resetOutput() {
    generateError = '';
    output = null;
    diff = null;
    diffError = '';
  }

  function addInterfaceFromDraft() {
    const name = interfaceDraft.name.trim();
    if (!name) return;
    const newInterface: MikroTikIntentInterface = {
      name,
      purpose: interfaceDraft.purpose,
      comment: interfaceDraft.comment.trim() || undefined,
      accessVlanId: interfaceDraft.accessVlanId.trim() ? Number(interfaceDraft.accessVlanId) : undefined,
      trunkVlanIds: parseCommaNumbers(interfaceDraft.trunkVlanIds)
    };
    interfaces = [...interfaces, newInterface];
    interfaceDraft = { name: '', purpose: 'wan', comment: '', accessVlanId: '', trunkVlanIds: '' };
    showInterfaceModal = false;
  }

  function removeInterface(name: string) {
    interfaces = interfaces.filter((i) => i.name !== name);
    if (wanInterface === name) wanInterface = '';
  }

  function addVlanFromDraft() {
    const name = vlanDraft.name.trim();
    if (!name || !vlanDraft.subnet.trim() || !vlanDraft.gateway.trim()) return;
    const newVlan: MikroTikIntentVlan = {
      id: vlanDraft.id,
      name,
      subnet: vlanDraft.subnet.trim(),
      gateway: vlanDraft.gateway.trim(),
      group: vlanDraft.group || undefined,
      dhcp: vlanDraft.dhcpEnabled ? { enabled: true } : undefined
    };
    vlans = [...vlans, newVlan];
    vlanDraft = { id: vlanDraft.id + 10, name: '', subnet: '', gateway: '', group: '', dhcpEnabled: false };
    showVlanModal = false;
  }

  function removeVlan(id: number) {
    vlans = vlans.filter((v) => v.id !== id);
  }

  function addRouteFromDraft() {
    const dst = routeDraft.dst.trim();
    const gateway = routeDraft.gateway.trim();
    if (!dst || !gateway) return;
    staticRoutes = [...staticRoutes, { ...routeDraft, dst, gateway }];
    routeDraft = { dst: '', gateway: '' };
    showRouteModal = false;
  }

  function removeRoute(dst: string) {
    staticRoutes = staticRoutes.filter((r) => r.dst !== dst);
  }

  async function runGenerate() {
    if (!canGenerate) return;
    generating = true;
    resetOutput();
    try {
      const intent = buildIntent();
      output = await generateMikrotikFullConfig(intent);
      step = 'preview';
    } catch (error) {
      generateError = error instanceof Error ? error.message : String(error);
    } finally {
      generating = false;
    }
  }

  async function runDiff() {
    if (!output?.config || !runningConfig.trim()) return;
    diffError = '';
    diff = null;
    try {
      diff = await diffMikrotikRunningConfig({ runningConfig, desiredConfig: output.config });
    } catch (error) {
      diffError = error instanceof Error ? error.message : String(error);
    }
  }

  function downloadScript(kind: 'apply' | 'rollback') {
    const text = kind === 'apply' ? output?.config : output?.rollback;
    if (!text) return;
    const filename = `${hostname || 'mikrotik'}-${kind}.rsc`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function pushDryRun() {
    if (!output?.config || !isPrivileged) return;
    try {
      const result = await pushMikrotikConfigSsh({
        target: {
          host: selectedDevice?.mgmt_ip || '127.0.0.1',
          user: 'admin'
        },
        auth: { type: 'key' },
        config: output.config,
        dryRun: true,
        environment
      });
      generateError = JSON.stringify(result, null, 2);
    } catch (error) {
      generateError = error instanceof Error ? error.message : String(error);
    }
  }

  onMount(async () => {
    userRole = localStorage.getItem('userRole') || '';
    await loadDevices();
  });
</script>

<div class="space-y-4">
  <PageHeader title={$_('netops.mikrotik.title')} subtitle={$_('netops.mikrotik.subtitle')} sticky>
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
      {#each steps as item}
        <button
          class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-transparent {step === item.id ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-900' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
          onclick={() => (step = item.id)}
        >
          {$isLoading ? item.id : $_(item.labelKey)}
        </button>
      {/each}
      <div class="flex-1"></div>
      <Button size="sm" color="light" onclick={loadDevices} disabled={deviceLoading}>
        <RefreshCw class="w-4 h-4" />
        {$_('common.refresh')}
      </Button>
      <Button size="sm" onclick={runGenerate} disabled={!canGenerate || generating}>
        <Play class="w-4 h-4" />
        {generating ? $_('common.loading') : $_('netops.mikrotik.actions.generate')}
      </Button>
    </div>
    {#if !canGenerate}
      <p class="text-xs text-amber-600">{$_('netops.mikrotik.requirements')}</p>
    {/if}
  </PageHeader>

  {#if deviceError}
    <Alert color="red">{deviceError}</Alert>
  {/if}

  {#if generateError}
    <Alert color="red">
      <pre class="text-xs whitespace-pre-wrap">{generateError}</pre>
    </Alert>
  {/if}

  <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div class="space-y-4 min-w-0">
      {#if step === 'device'}
        <Card size="none" class="space-y-4 w-full min-w-0">
          <div class="grid gap-3 lg:grid-cols-3 items-end">
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.device')}</Label>
              <Select
                bind:value={selectedDeviceId}
                disabled={deviceLoading}
                onchange={(e) => {
                  const id = (e.target as HTMLSelectElement).value;
                  const device = devices.find((d) => d.id === id);
                  if (device) applyDeviceDefaults(device);
                }}
              >
                <option value="">{$_('common.chooseOption')}</option>
                {#each devices as d}
                  <option value={d.id}>{d.name} · {d.mgmt_ip}</option>
                {/each}
              </Select>
              <p class="text-xs text-slate-400">{$_('netops.mikrotik.deviceHelp')}</p>
            </div>
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.role')}</Label>
              <Select bind:value={role}>
                <option value="edge-internet">edge-internet</option>
                <option value="core-router">core-router</option>
                <option value="distribution-l3">distribution-l3</option>
                <option value="access-switch-crs">access-switch-crs</option>
                <option value="mgmt-only">mgmt-only</option>
              </Select>
              <p class="text-xs text-slate-400">{$_('netops.mikrotik.roleHelp')}</p>
            </div>
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.environment')}</Label>
              <Select bind:value={environment}>
                <option value="dev">Dev</option>
                <option value="staging">Staging</option>
                <option value="prod">Prod</option>
              </Select>
              <p class="text-xs text-slate-400">{$_('netops.mikrotik.environmentHelp')}</p>
            </div>
          </div>

          <div class="grid gap-3 lg:grid-cols-3">
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.hostname')}</Label>
              <Input bind:value={hostname} placeholder="CORE-EDGE-01" />
            </div>
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.routerOsVersion')}</Label>
              <Input bind:value={routerOsVersion} placeholder="7.12.1" />
            </div>
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.securityPreset')}</Label>
              <Select bind:value={securityPreset}>
                <option value="hospital-secure">hospital-secure</option>
                <option value="standard-secure">standard-secure</option>
                <option value="lab">lab</option>
              </Select>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Checkbox bind:checked={labMode} />
            <span class="text-sm text-slate-700 dark:text-slate-200">{$_('netops.mikrotik.labMode')}</span>
            {#if labMode}
              <WarningBadge label={$_('netops.mikrotik.labModeWarn')} tone="warning" />
            {/if}
          </div>

          <div class="grid gap-3 lg:grid-cols-2">
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.mgmtSubnet')}</Label>
              <Input bind:value={mgmtSubnet} placeholder="10.10.0.0/24" />
              <p class="text-xs text-slate-400">{$_('netops.mikrotik.mgmtHelp')}</p>
            </div>
            <div class="space-y-1">
              <Label>{$_('netops.mikrotik.allowedSubnets')}</Label>
              <Textarea rows={2} bind:value={allowedSubnetsText} placeholder="10.10.0.0/24&#10;10.20.0.0/24" />
              <p class="text-xs text-slate-400">{$_('netops.mikrotik.allowedHelp')}</p>
            </div>
          </div>
        </Card>
      {:else if step === 'network'}
        <div class="grid gap-4 lg:grid-cols-2">
          <Card size="none" class="space-y-3 w-full min-w-0">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('netops.mikrotik.interfaces')}</div>
              <Button size="xs" color="light" onclick={() => (showInterfaceModal = true)}>
                <Plus class="w-4 h-4" />
                {$_('common.add')}
              </Button>
            </div>

            {#if interfaces.length === 0}
              <EmptyState
                title={$_('netops.mikrotik.interfacesEmpty')}
                description={$_('netops.mikrotik.interfacesEmptyHelp')}
              />
            {:else}
              <div class="space-y-2">
                {#each interfaces as iface}
                  <div class="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">{iface.name}</div>
                      <div class="text-xs text-slate-500">{iface.purpose}{iface.accessVlanId ? ` · access VLAN ${iface.accessVlanId}` : ''}</div>
                    </div>
                    <Button size="xs" color="light" onclick={() => removeInterface(iface.name)}>{$_('common.remove')}</Button>
                  </div>
                {/each}
              </div>
            {/if}
          </Card>

          <Card size="none" class="space-y-3 w-full min-w-0">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('netops.mikrotik.vlans')}</div>
              <Button size="xs" color="light" onclick={() => (showVlanModal = true)}>
                <Plus class="w-4 h-4" />
                {$_('common.add')}
              </Button>
            </div>

            {#if vlans.length === 0}
              <EmptyState title={$_('netops.mikrotik.vlansEmpty')} description={$_('netops.mikrotik.vlansEmptyHelp')} />
            {:else}
              <div class="space-y-2">
                {#each vlans as vlan}
                  <div class="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">VLAN {vlan.id} · {vlan.name}</div>
                      <div class="text-xs text-slate-500 truncate">{vlan.subnet} → {vlan.gateway}{vlan.dhcp?.enabled ? ' · DHCP' : ''}</div>
                    </div>
                    <Button size="xs" color="light" onclick={() => removeVlan(vlan.id)}>{$_('common.remove')}</Button>
                  </div>
                {/each}
              </div>
            {/if}
          </Card>
        </div>
      {:else if step === 'routing'}
        <div class="grid gap-4 lg:grid-cols-2">
          <Card size="none" class="space-y-3 w-full min-w-0">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('netops.mikrotik.internet')}</div>
              <Badge color="blue">{role}</Badge>
            </div>
            <div class="grid gap-3 lg:grid-cols-3 items-end">
              <div class="space-y-1">
                <Label>{$_('netops.mikrotik.wanInterface')}</Label>
                <Select bind:value={wanInterface}>
                  <option value="">{$_('common.chooseOption')}</option>
                  {#each interfaceNames as name}
                    <option value={name}>{name}</option>
                  {/each}
                </Select>
              </div>
              <div class="space-y-1">
                <Label>{$_('netops.mikrotik.publicType')}</Label>
                <Select bind:value={publicType}>
                  <option value="dhcp">DHCP</option>
                  <option value="static">Static</option>
                  <option value="pppoe">PPPoE</option>
                </Select>
              </div>
              <div class="space-y-1">
                <Label>{$_('netops.mikrotik.dnsServers')}</Label>
                <Textarea rows={2} bind:value={dnsServersText} placeholder="1.1.1.1&#10;8.8.8.8" />
              </div>
            </div>

            {#if publicType === 'static'}
              <div class="grid gap-3 lg:grid-cols-2">
                <div class="space-y-1">
                  <Label>{$_('netops.mikrotik.wanAddress')}</Label>
                  <Input bind:value={wanAddress} placeholder="203.0.113.2/30" />
                </div>
                <div class="space-y-1">
                  <Label>{$_('netops.mikrotik.wanGateway')}</Label>
                  <Input bind:value={wanGateway} placeholder="203.0.113.1" />
                </div>
              </div>
            {:else if publicType === 'pppoe'}
              <div class="grid gap-3 lg:grid-cols-2">
                <div class="space-y-1">
                  <Label>{$_('netops.mikrotik.pppoeUser')}</Label>
                  <Input bind:value={pppoeUser} />
                </div>
                <div class="space-y-1">
                  <Label>{$_('netops.mikrotik.pppoePassword')}</Label>
                  <Input bind:value={pppoePassword} type="password" />
                </div>
              </div>
            {/if}
          </Card>

          <Card size="none" class="space-y-3 w-full min-w-0">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('netops.mikrotik.staticRoutes')}</div>
              <Button size="xs" color="light" onclick={() => (showRouteModal = true)}>
                <Plus class="w-4 h-4" />
                {$_('common.add')}
              </Button>
            </div>

            {#if staticRoutes.length === 0}
              <EmptyState title={$_('netops.mikrotik.routesEmpty')} description={$_('netops.mikrotik.routesEmptyHelp')} />
            {:else}
              <div class="space-y-2">
                {#each staticRoutes as route}
                  <div class="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold truncate">{route.dst}</div>
                      <div class="text-xs text-slate-500 truncate">via {route.gateway}{route.distance ? ` · distance ${route.distance}` : ''}</div>
                    </div>
                    <Button size="xs" color="light" onclick={() => removeRoute(route.dst)}>{$_('common.remove')}</Button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div class="flex items-center gap-2">
                <Checkbox bind:checked={ospfEnabled} />
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{$_('netops.mikrotik.ospf')}</span>
              </div>
              {#if ospfEnabled}
                <div class="grid gap-3 lg:grid-cols-2">
                  <div class="space-y-1">
                    <Label>{$_('netops.mikrotik.ospfRouterId')}</Label>
                    <Input bind:value={ospfRouterId} placeholder="10.10.0.1" />
                  </div>
                  <div class="space-y-1">
                    <Label>{$_('netops.mikrotik.ospfArea')}</Label>
                    <Input bind:value={ospfArea} placeholder="0.0.0.0" />
                  </div>
                </div>
                <div class="grid gap-3 lg:grid-cols-2">
                  <div class="space-y-1">
                    <Label>{$_('netops.mikrotik.ospfNetworks')}</Label>
                    <Textarea rows={3} bind:value={ospfNetworksText} placeholder="10.10.0.0/24&#10;10.20.0.0/24" />
                  </div>
                  <div class="space-y-1">
                    <Label>{$_('netops.mikrotik.ospfPassive')}</Label>
                    <Textarea rows={3} bind:value={ospfPassiveText} placeholder="br-core&#10;vlan10-mgmt" />
                  </div>
                </div>
              {/if}
            </div>
          </Card>
        </div>
      {:else}
        <div class="space-y-4">
          {#if output}
            <div class="flex flex-wrap items-center gap-2">
              <Badge color={output.risk.level === 'high' ? 'red' : output.risk.level === 'medium' ? 'yellow' : 'green'}>
                {$_('netops.mikrotik.risk')}: {output.risk.level.toUpperCase()}
              </Badge>
              {#if output.validation.errors.length > 0}
                <Badge color="red">{output.validation.errors.length} {$_('netops.mikrotik.errors')}</Badge>
              {/if}
              {#if output.validation.warnings.length > 0}
                <Badge color="yellow">{output.validation.warnings.length} {$_('netops.mikrotik.warnings')}</Badge>
              {/if}
            </div>

            {#if output.validation.errors.length > 0}
              <Alert color="red">
                <div class="text-sm font-semibold">{$_('netops.mikrotik.validationErrors')}</div>
                <ul class="mt-2 list-disc list-inside text-sm">
                  {#each output.validation.errors as err}
                    <li>{err.message}</li>
                  {/each}
                </ul>
              </Alert>
            {/if}

            {#if output.validation.warnings.length > 0}
              <Alert color="yellow">
                <div class="text-sm font-semibold">{$_('netops.mikrotik.validationWarnings')}</div>
                <ul class="mt-2 list-disc list-inside text-sm">
                  {#each output.validation.warnings as warn}
                    <li>{warn.message}</li>
                  {/each}
                </ul>
              </Alert>
            {/if}

            <div class="grid gap-4 lg:grid-cols-2">
              <Card size="none" class="space-y-3 w-full">
                <CodePreview title={$_('netops.mikrotik.preview.apply')} code={output.config} copyLabel={$_('common.copy')} />
                <div class="flex flex-wrap gap-2">
                  <Button size="xs" color="light" onclick={() => downloadScript('apply')}>
                    <Download class="w-4 h-4" />
                    {$_('netops.mikrotik.actions.downloadApply')}
                  </Button>
                  {#if isPrivileged}
                    <Button size="xs" color="light" onclick={pushDryRun}>
                      <ShieldAlert class="w-4 h-4" />
                      {$_('netops.mikrotik.actions.pushDryRun')}
                    </Button>
                  {/if}
                </div>
              </Card>
              <Card size="none" class="space-y-3 w-full">
                <CodePreview title={$_('netops.mikrotik.preview.rollback')} code={output.rollback} copyLabel={$_('common.copy')} />
                <Button size="xs" color="light" onclick={() => downloadScript('rollback')}>
                  <Download class="w-4 h-4" />
                  {$_('netops.mikrotik.actions.downloadRollback')}
                </Button>
              </Card>
            </div>

            <Card size="none" class="space-y-3 w-full">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('netops.mikrotik.diff.title')}</div>
              <Textarea rows={5} bind:value={runningConfig} placeholder={$_('netops.mikrotik.diff.placeholder')} class="font-mono text-xs" />
              <div class="flex gap-2">
                <Button size="sm" color="light" onclick={runDiff} disabled={!runningConfig.trim()}>{$_('netops.mikrotik.diff.run')}</Button>
              </div>
              {#if diffError}
                <Alert color="red">{diffError}</Alert>
              {/if}
              {#if diff}
                <div class="text-xs text-slate-500">{$_('netops.mikrotik.diff.summary')} +{diff.summary.added} / -{diff.summary.removed}</div>
                <pre class="text-xs bg-slate-900 text-slate-100 rounded-md p-3 whitespace-pre-wrap max-h-72 overflow-y-auto">{#each diff.lines as line}{line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '} {line.line}\n{/each}</pre>
              {/if}
            </Card>
          {:else}
            <EmptyState
              title={$_('netops.mikrotik.empty.title')}
              description={$_('netops.mikrotik.empty.subtitle')}
            />
          {/if}
        </div>
      {/if}
    </div>

    <SummaryPanel title={$_('netops.mikrotik.summary.title')} subtitle={$_('netops.mikrotik.summary.subtitle')}>
      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.device')}</span>
          <span class="font-semibold text-slate-900 dark:text-white truncate">{summary.device || '—'}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.role')}</span>
          <span class="font-semibold text-slate-900 dark:text-white">{summary.role}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.environment')}</span>
          <span class="font-semibold text-slate-900 dark:text-white">{summary.environment}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.vlans')}</span>
          <span class="font-semibold text-slate-900 dark:text-white">{summary.vlans}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.interfaces')}</span>
          <span class="font-semibold text-slate-900 dark:text-white">{summary.interfaces}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-slate-500">{$_('netops.mikrotik.summary.routes')}</span>
          <span class="font-semibold text-slate-900 dark:text-white">{summary.routes}</span>
        </div>
      </div>
    </SummaryPanel>
  </div>

  <Modal bind:open={showInterfaceModal} size="md" title={$_('netops.mikrotik.modals.interfaceTitle')}>
    <div class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.interfaceName')}</Label>
          <Input bind:value={interfaceDraft.name} placeholder="ether1" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.interfacePurpose')}</Label>
          <Select bind:value={interfaceDraft.purpose}>
            <option value="wan">{$_('netops.mikrotik.modals.purpose.wan')}</option>
            <option value="trunk">{$_('netops.mikrotik.modals.purpose.trunk')}</option>
            <option value="access">{$_('netops.mikrotik.modals.purpose.access')}</option>
            <option value="mgmt">{$_('netops.mikrotik.modals.purpose.mgmt')}</option>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.interfaceAccessVlan')}</Label>
          <Input
            type="number"
            bind:value={interfaceDraft.accessVlanId}
            placeholder="10"
          />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.interfaceTrunkVlans')}</Label>
          <Input bind:value={interfaceDraft.trunkVlanIds} placeholder="10,20,30" />
        </div>
        <div class="space-y-1 md:col-span-2">
          <Label>{$_('netops.mikrotik.modals.interfaceComment')}</Label>
          <Input bind:value={interfaceDraft.comment} placeholder={$_('netops.mikrotik.modals.optional')} />
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button color="light" onclick={() => (showInterfaceModal = false)}>{$_('common.cancel')}</Button>
        <Button onclick={addInterfaceFromDraft} disabled={!interfaceDraft.name.trim()}>{$_('common.add')}</Button>
      </div>
    </div>
  </Modal>

  <Modal bind:open={showVlanModal} size="md" title={$_('netops.mikrotik.modals.vlanTitle')}>
    <div class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.vlanId')}</Label>
          <Input type="number" bind:value={vlanDraft.id} placeholder="10" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.vlanName')}</Label>
          <Input bind:value={vlanDraft.name} placeholder="mgmt" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.vlanSubnet')}</Label>
          <Input bind:value={vlanDraft.subnet} placeholder="10.10.0.0/24" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.vlanGateway')}</Label>
          <Input bind:value={vlanDraft.gateway} placeholder="10.10.0.1" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.vlanGroup')}</Label>
          <Select bind:value={vlanDraft.group}>
            <option value="">{$_('netops.mikrotik.modals.optional')}</option>
            <option value="MGMT">MGMT</option>
            <option value="STAFF">STAFF</option>
            <option value="GUEST">GUEST</option>
            <option value="SERVER">SERVER</option>
            <option value="IOT">IOT</option>
          </Select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <Checkbox bind:checked={vlanDraft.dhcpEnabled} />
          <span>{$_('netops.mikrotik.modals.vlanDhcp')}</span>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button color="light" onclick={() => (showVlanModal = false)}>{$_('common.cancel')}</Button>
        <Button
          onclick={addVlanFromDraft}
          disabled={!vlanDraft.name.trim() || !vlanDraft.subnet.trim() || !vlanDraft.gateway.trim()}
        >
          {$_('common.add')}
        </Button>
      </div>
    </div>
  </Modal>

  <Modal bind:open={showRouteModal} size="md" title={$_('netops.mikrotik.modals.routeTitle')}>
    <div class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1 md:col-span-2">
          <Label>{$_('netops.mikrotik.modals.routeDst')}</Label>
          <Input bind:value={routeDraft.dst} placeholder="0.0.0.0/0" />
        </div>
        <div class="space-y-1 md:col-span-2">
          <Label>{$_('netops.mikrotik.modals.routeGateway')}</Label>
          <Input bind:value={routeDraft.gateway} placeholder="192.0.2.1" />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.routeDistance')}</Label>
          <Input type="number" bind:value={routeDraft.distance} placeholder={$_('netops.mikrotik.modals.optional')} />
        </div>
        <div class="space-y-1">
          <Label>{$_('netops.mikrotik.modals.routeComment')}</Label>
          <Input bind:value={routeDraft.comment} placeholder={$_('netops.mikrotik.modals.optional')} />
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button color="light" onclick={() => (showRouteModal = false)}>{$_('common.cancel')}</Button>
        <Button onclick={addRouteFromDraft} disabled={!routeDraft.dst.trim() || !routeDraft.gateway.trim()}>{$_('common.add')}</Button>
      </div>
    </div>
  </Modal>
</div>
