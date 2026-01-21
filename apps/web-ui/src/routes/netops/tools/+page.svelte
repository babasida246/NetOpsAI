<script lang="ts">
  import { Button, Card, Input, Label, Select, Textarea, Alert } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import { generateConfig } from '$lib/netops/api/tools';

  const actionLabels: Record<string, string> = {
    secure_baseline: 'netops.toolsPage.actions.secureBaseline',
    baseline: 'netops.toolsPage.actions.baseline',
    wan_uplink: 'netops.toolsPage.actions.wanUplink',
    lan_vlan: 'netops.toolsPage.actions.lanVlan',
    dhcp_server: 'netops.toolsPage.actions.dhcpServer',
    static_route: 'netops.toolsPage.actions.staticRoute',
    ospf: 'netops.toolsPage.actions.ospf',
    nat_overload: 'netops.toolsPage.actions.natOverload',
    firewall_basic: 'netops.toolsPage.actions.firewallBasic',
    load_balancing: 'netops.toolsPage.actions.loadBalancing',
    bridge: 'netops.toolsPage.actions.bridge'
  };

  const vendorActions: Record<string, Array<{ value: string; label: string; sample: string }>> = {
    cisco: [
      { value: 'secure_baseline', label: 'Secure baseline', sample: '{\n  "hostname": "SEC-CORE",\n  "mgmtAcl": "MGMT-ACL",\n  "mgmtNetwork": "10.0.100.0 0.0.0.255",\n  "syslog": "10.0.200.10",\n  "ntpServers": ["1.pool.ntp.org", "2.pool.ntp.org"]\n}' },
      { value: 'baseline', label: 'Baseline', sample: '{\n  "hostname": "CORE1",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'wan_uplink', label: 'WAN uplink', sample: '{\n  "interface": "GigabitEthernet0/0",\n  "ip": "1.1.1.2",\n  "mask": "255.255.255.252",\n  "gateway": "1.1.1.1"\n}' },
      { value: 'lan_vlan', label: 'LAN VLAN', sample: '{\n  "vlanId": 10,\n  "name": "Users",\n  "ip": "192.168.10.1",\n  "mask": "255.255.255.0"\n}' },
      { value: 'dhcp_server', label: 'DHCP server', sample: '{\n  "pool": "LAN10",\n  "network": "192.168.10.0",\n  "mask": "255.255.255.0",\n  "gateway": "192.168.10.1",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'static_route', label: 'Static route', sample: '{\n  "network": "10.20.0.0",\n  "mask": "255.255.0.0",\n  "nextHop": "192.168.10.254"\n}' },
      { value: 'ospf', label: 'OSPF', sample: '{\n  "processId": 1,\n  "area": "0",\n  "networks": ["10.0.0.0 0.0.0.255"]\n}' },
      { value: 'nat_overload', label: 'NAT overload', sample: '{\n  "insideInterfaces": ["Vlan10"],\n  "outsideInterface": "GigabitEthernet0/0",\n  "insideNetworks": ["192.168.10.0 0.0.0.255"]\n}' },
      { value: 'firewall_basic', label: 'Basic firewall', sample: '{\n  "insideInterface": "Vlan10",\n  "outsideInterface": "GigabitEthernet0/0"\n}' },
      { value: 'load_balancing', label: 'Load balancing', sample: '{\n  "gateway1": "1.1.1.1",\n  "gateway2": "2.2.2.2"\n}' },
      { value: 'bridge', label: 'Bridge/access VLAN', sample: '{\n  "vlanId": 10,\n  "ports": ["GigabitEthernet0/2", "GigabitEthernet0/3"]\n}' }
    ],
    fortigate: [
      { value: 'secure_baseline', label: 'Secure baseline', sample: '{\n  "hostname": "FGT-SEC",\n  "adminPassword": "Admin@123",\n  "syslog": "10.0.200.10",\n  "mgmtSubnet": "10.0.100.0 255.255.255.0",\n  "ntpServers": ["1.pool.ntp.org"]\n}' },
      { value: 'baseline', label: 'Baseline', sample: '{\n  "hostname": "FGT-01",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'wan_uplink', label: 'WAN uplink', sample: '{\n  "interface": "wan1",\n  "ip": "1.1.1.2",\n  "mask": "255.255.255.252",\n  "gateway": "1.1.1.1"\n}' },
      { value: 'lan_vlan', label: 'LAN VLAN', sample: '{\n  "vlanId": 10,\n  "interface": "internal",\n  "name": "LAN10",\n  "ip": "192.168.10.1",\n  "mask": "255.255.255.0"\n}' },
      { value: 'dhcp_server', label: 'DHCP server', sample: '{\n  "interface": "LAN10",\n  "start": "192.168.10.10",\n  "end": "192.168.10.200",\n  "gateway": "192.168.10.1",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'static_route', label: 'Static route', sample: '{\n  "network": "10.20.0.0",\n  "mask": "255.255.0.0",\n  "nextHop": "192.168.10.254",\n  "device": "wan1"\n}' },
      { value: 'ospf', label: 'OSPF', sample: '{\n  "routerId": "10.10.10.1",\n  "area": "0.0.0.0",\n  "networks": ["10.0.0.0/24"]\n}' },
      { value: 'nat_overload', label: 'NAT overload', sample: '{\n  "srcintf": "LAN10",\n  "dstintf": "wan1"\n}' },
      { value: 'firewall_basic', label: 'Basic firewall', sample: '{\n  "srcintf": "LAN10",\n  "dstintf": "wan1"\n}' },
      { value: 'load_balancing', label: 'Load balancing', sample: '{\n  "gateway1": "1.1.1.1",\n  "gateway2": "2.2.2.2",\n  "dstintf1": "wan1",\n  "dstintf2": "wan2"\n}' },
      { value: 'bridge', label: 'Bridge', sample: '{\n  "name": "br0",\n  "ports": ["port2", "port3"]\n}' }
    ],
    mikrotik: [
      { value: 'secure_baseline', label: 'Secure baseline', sample: '{\n  "hostname": "RB-SEC",\n  "syslog": "10.0.200.10",\n  "mgmtCidr": "10.0.100.0/24",\n  "ntpServers": ["pool.ntp.org"]\n}' },
      { value: 'baseline', label: 'Baseline', sample: '{\n  "hostname": "RB01",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'wan_uplink', label: 'WAN uplink', sample: '{\n  "interface": "ether1",\n  "cidr": "1.1.1.2/30",\n  "gateway": "1.1.1.1"\n}' },
      { value: 'lan_vlan', label: 'LAN VLAN', sample: '{\n  "vlanId": 10,\n  "interface": "bridge1",\n  "name": "LAN10",\n  "cidr": "192.168.10.1/24"\n}' },
      { value: 'dhcp_server', label: 'DHCP server', sample: '{\n  "interface": "LAN10",\n  "start": "192.168.10.10",\n  "end": "192.168.10.200",\n  "gateway": "192.168.10.1",\n  "dnsServers": ["8.8.8.8"]\n}' },
      { value: 'static_route', label: 'Static route', sample: '{\n  "dst": "10.20.0.0/16",\n  "gateway": "192.168.10.254"\n}' },
      { value: 'ospf', label: 'OSPF', sample: '{\n  "area": "backbone",\n  "networks": ["10.0.0.0/24"]\n}' },
      { value: 'nat_overload', label: 'NAT overload', sample: '{\n  "outInterface": "ether1"\n}' },
      { value: 'firewall_basic', label: 'Basic firewall', sample: '{\n  "lan": "bridge1"\n}' },
      { value: 'load_balancing', label: 'Load balancing', sample: '{\n  "gateway1": "1.1.1.1",\n  "gateway2": "2.2.2.2"\n}' },
      { value: 'bridge', label: 'Bridge', sample: '{\n  "name": "bridge1",\n  "ports": ["ether2", "ether3"]\n}' }
    ]
  };

  let vendor = $state<'cisco' | 'fortigate' | 'mikrotik'>('cisco');
  let action = $state<string>('');
  let paramsJson = $state(vendorActions['cisco'][0].sample);
  let command = $state('');
  let errorMsg = $state('');
  let loading = $state(false);

  $effect(() => {
    const first = vendorActions[vendor][0];
    if (first && !vendorActions[vendor].some(a => a.value === action)) {
      action = first.value;
      paramsJson = first.sample;
    } else if (first && action === '') {
      action = first.value;
      paramsJson = first.sample;
    }
  });

  async function handleGenerate() {
    loading = true;
    errorMsg = '';
    command = '';
    try {
      const parsed = JSON.parse(paramsJson);
      const res = await generateConfig({ vendor, action: action as any, params: parsed });
      command = res.command;
    } catch (error: any) {
      errorMsg = error?.message || $_('netops.toolsPage.errors.generateFailed');
    } finally {
      loading = false;
    }
  }

  function getActionLabel(value: string, fallback: string) {
    const key = actionLabels[value];
    return key ? $_(key) : fallback;
  }
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{$isLoading ? 'NetOps Config Generator' : $_('netops.toolsPage.title')}</h1>
    <p class="text-sm text-slate-500">{$isLoading ? 'Generate vendor-specific CLI snippets for network devices.' : $_('netops.toolsPage.subtitle')}</p>
  </div>

  {#if errorMsg}
    <Alert color="red">{errorMsg}</Alert>
  {/if}

  <Card class="space-y-3">
    <div class="grid md:grid-cols-2 gap-3">
      <div>
        <Label>{$isLoading ? 'Vendor' : $_('netops.toolsPage.vendor')}</Label>
        <Select bind:value={vendor}>
          <option value="cisco">{$isLoading ? 'Cisco' : $_('netops.toolsPage.vendorOptions.cisco')}</option>
          <option value="fortigate">{$isLoading ? 'Fortigate' : $_('netops.toolsPage.vendorOptions.fortigate')}</option>
          <option value="mikrotik">{$isLoading ? 'MikroTik' : $_('netops.toolsPage.vendorOptions.mikrotik')}</option>
        </Select>
      </div>
      <div>
        <Label>{$isLoading ? 'Action' : $_('netops.toolsPage.action')}</Label>
        <Select bind:value={action} on:change={(e) => {
          const val = (e.target as HTMLSelectElement).value;
          const found = vendorActions[vendor].find(a => a.value === val);
          if (found) paramsJson = found.sample;
        }}>
          {#each vendorActions[vendor] as act}
            <option value={act.value}>{$isLoading ? act.label : getActionLabel(act.value, act.label)}</option>
          {/each}
        </Select>
      </div>
    </div>

    <div>
      <Label>{$isLoading ? 'Params (JSON)' : $_('netops.toolsPage.params')}</Label>
      <Textarea rows={8} bind:value={paramsJson} class="font-mono text-xs" />
    </div>

    <Button on:click={handleGenerate} disabled={loading}>
      {loading ? ($isLoading ? 'Generating...' : $_('netops.toolsPage.generating')) : ($isLoading ? 'Generate' : $_('netops.toolsPage.generate'))}
    </Button>
  </Card>

  {#if command}
    <Card>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$isLoading ? 'Command' : $_('netops.toolsPage.command')}</h3>
      </div>
      <pre class="text-sm bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{command}</pre>
    </Card>
  {/if}
</div>
