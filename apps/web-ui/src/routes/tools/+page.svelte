<script lang="ts">
  import { Card, Button, Textarea, Label, Alert, Input, Select } from 'flowbite-svelte';
  import { _, isLoading } from '$lib/i18n';
  import {
    Copy,
    Play,
    RefreshCw,
    Terminal,
    Radar,
    SatelliteDish,
    Activity,
    Route,
    Link2
  } from 'lucide-svelte';

  let mermaidInput = $state(`flowchart TD
    A[Client] -->|HTTP| B(Load Balancer)
    B --> C[Gateway API]
    C -->|Redis cache| D[(Redis)]
    C -->|Queries| E[(Postgres)]
    C -->|LLM| F[(OpenRouter)]
    F --> G[Model]
  `);
  let mermaidSvg = $state('');
  let mermaidError = $state('');
  let rendering = $state(false);
  let activeSection = $state<'mermaid' | 'field-kit' | 'ssh-terminal'>('mermaid');
  const sections = [
    { id: 'mermaid', labelKey: 'tools.mermaid' },
    { id: 'field-kit', labelKey: 'tools.fieldKit' },
    { id: 'ssh-terminal', labelKey: 'tools.sshTerminal' }
  ];

  let sshHost = $state('127.0.0.1');
  let sshPort = $state(22);
  let sshUser = $state('root');
  let sshAuth = $state<'password' | 'key'>('password');
  let sshSecret = $state('');
  let sshCommand = $state('ls -la');
  let sshOutput = $state<string[]>([]);
  let sshStatus = $state<'disconnected' | 'connected'>('disconnected');
  let sshError = $state('');

  const cliTools = [
    {
      titleKey: 'tools.cli.nmapFast.title',
      command: 'nmap -sV -T4 -Pn <target>',
      descriptionKey: 'tools.cli.nmapFast.description'
    },
    {
      titleKey: 'tools.cli.nmapUdp.title',
      command: 'nmap -sU --top-ports 50 <target>',
      descriptionKey: 'tools.cli.nmapUdp.description'
    },
    {
      titleKey: 'tools.cli.snmpBaseline.title',
      command: 'snmpwalk -v2c -c <community> <host> 1.3.6.1.2.1',
      descriptionKey: 'tools.cli.snmpBaseline.description'
    },
    {
      titleKey: 'tools.cli.snmpBulk.title',
      command: 'snmpbulkwalk -v2c -c <community> -Cr10 <host> 1.3.6.1.2.1.2.2',
      descriptionKey: 'tools.cli.snmpBulk.description'
    },
    {
      titleKey: 'tools.cli.mtr.title',
      command: 'mtr -rw <target>',
      descriptionKey: 'tools.cli.mtr.description'
    },
    {
      titleKey: 'tools.cli.tcpdump.title',
      command: 'tcpdump -i eth0 -G 300 -W 4 -w capture-%Y%m%d-%H%M%S.pcap port 443',
      descriptionKey: 'tools.cli.tcpdump.description'
    },
    {
      titleKey: 'tools.cli.httpProbe.title',
      command: 'curl -fsSL http://<host>:3000/health/live',
      descriptionKey: 'tools.cli.httpProbe.description'
    }
  ];

  async function ensureMermaid() {
    if (typeof window === 'undefined') return null;
    if (!(window as any).mermaidLoader) {
      (window as any).mermaidLoader = new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load mermaid from CDN'));
        document.head.appendChild(s);
      });
    }
    await (window as any).mermaidLoader;
    const mermaid = (window as any).mermaid;
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    return mermaid;
  }

  async function renderDiagram() {
    rendering = true;
    mermaidError = '';
    try {
      const mermaid = await ensureMermaid();
      if (!mermaid) return;
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, mermaidInput);
      mermaidSvg = svg;
    } catch (error: any) {
      mermaidError = error?.message || 'Failed to render diagram';
      mermaidSvg = '';
    } finally {
      rendering = false;
    }
  }

  function copy(text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  function mockConnect() {
    sshError = $_('tools.errors.sshBackendMissing');
    sshStatus = 'connected';
    sshOutput = [
      ...sshOutput,
      $_('tools.ssh.connecting', { values: { user: sshUser, host: sshHost, port: sshPort, auth: sshAuth } }),
      $_('tools.errors.sshProxyMissing')
    ];
  }

  function mockSend() {
    if (sshStatus !== 'connected') {
      sshError = $_('tools.errors.sshNotConnected');
      return;
    }
    sshOutput = [
      ...sshOutput,
      $_('tools.ssh.commandEcho', { values: { command: sshCommand } }),
      $_('tools.errors.sshPending')
    ];
  }

  $effect(() => {
    void renderDiagram();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex items-start gap-6">
    <aside class="w-48 shrink-0 hidden md:block">
      <div class="sticky top-20 space-y-2">
        <p class="text-xs font-semibold text-slate-500 uppercase">{$isLoading ? 'Sections' : $_('tools.sections')}</p>
        <div class="flex flex-col gap-2">
          {#each sections as sec}
            <button
              class="text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors {activeSection === sec.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
              onclick={() => activeSection = sec.id as typeof activeSection}
            >
              {$isLoading ? sec.id : $_(sec.labelKey)}
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <div class="flex-1 space-y-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{$isLoading ? 'Tools & Utils' : $_('tools.title')}</h1>
          <p class="text-sm text-slate-500 dark:text-slate-300">
            {$isLoading ? 'Quick helpers for diagrams, network troubleshooting, and SSH access' : $_('tools.subtitle')}
          </p>
        </div>
      </div>

      {#if activeSection === 'mermaid'}
        <div class="grid lg:grid-cols-2 gap-4">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">{$isLoading ? 'Diagram' : $_('tools.diagram')}</p>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$isLoading ? 'Mermaid playground' : $_('tools.mermaidPlayground')}</h3>
              </div>
              <div class="flex gap-2">
                <Button color="light" size="xs" on:click={() => mermaidInput = mermaidInput.trim()} aria-label="Reset whitespace">
                  <RefreshCw class="w-4 h-4" />
                </Button>
                <Button size="xs" on:click={renderDiagram} disabled={rendering}>
                  <Play class="w-4 h-4" />
                  {rendering ? ($isLoading ? 'Rendering...' : $_('tools.rendering')) : ($isLoading ? 'Render' : $_('tools.render'))}
                </Button>
              </div>
            </div>

            <div class="space-y-2">
              <Label>{$isLoading ? 'Mermaid definition' : $_('tools.mermaidDefinition')}</Label>
              <Textarea rows={10} bind:value={mermaidInput} class="font-mono text-xs" />
            </div>

            {#if mermaidError}
              <Alert color="red">{mermaidError}</Alert>
            {/if}

            <div class="border rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 min-h-[200px]">
              {#if mermaidSvg}
                <div class="mermaid">{@html mermaidSvg}</div>
              {:else}
                <p class="text-sm text-slate-500">{$isLoading ? 'Render to preview your diagram.' : $_('tools.renderPreview')}</p>
              {/if}
            </div>
          </Card>

          <Card class="space-y-3">
            <div class="flex items-center gap-2">
              <Terminal class="w-4 h-4 text-blue-600" />
              <div>
                <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">{$isLoading ? 'Quick help' : $_('tools.quickHelp')}</p>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$isLoading ? 'Mermaid tips' : $_('tools.mermaidTips')}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">{$isLoading ? 'Use subgraphs, links, and styles to keep diagrams readable.' : $_('tools.tipsDescription')}</p>
              </div>
            </div>
            <ul class="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li>{$isLoading ? 'Group flows with subgraph blocks.' : $_('tools.mermaidTipsList.subgraph')}</li>
              <li>{$isLoading ? 'Align left-to-right with flowchart LR or top-down with TD.' : $_('tools.mermaidTipsList.flow')}</li>
              <li>{$isLoading ? 'Use style for emphasis and linkStyle for edges.' : $_('tools.mermaidTipsList.style')}</li>
            </ul>
          </Card>
        </div>
      {:else if activeSection === 'field-kit'}
        <Card class="space-y-3">
          <div class="flex items-center gap-2">
            <Terminal class="w-4 h-4 text-blue-600" />
            <div>
              <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">{$isLoading ? 'Field kit' : $_('tools.fieldKit')}</p>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$isLoading ? 'Network quick commands' : $_('tools.networkQuickCommands')}</h3>
            </div>
          </div>
          <div class="space-y-3">
            {#each cliTools as tool (tool.titleKey)}
              <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    {#if tool.titleKey.toLowerCase().includes('nmap')}
                      <Radar class="w-4 h-4 text-blue-500" />
                    {:else if tool.titleKey.toLowerCase().includes('snmp')}
                      <SatelliteDish class="w-4 h-4 text-emerald-500" />
                    {:else if tool.titleKey.toLowerCase().includes('mtr')}
                      <Route class="w-4 h-4 text-indigo-500" />
                    {:else}
                      <Activity class="w-4 h-4 text-slate-500" />
                    {/if}
                    <div>
                      <p class="text-sm font-semibold text-slate-900 dark:text-white">
                        {$isLoading ? tool.command : $_(tool.titleKey)}
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        {$isLoading ? tool.command : $_(tool.descriptionKey)}
                      </p>
                    </div>
                  </div>
                  <Button color="light" size="xs" on:click={() => copy(tool.command)} aria-label="Copy command">
                    <Copy class="w-4 h-4" />
                  </Button>
                </div>
                <pre class="mt-2 text-xs bg-slate-900 text-slate-100 rounded-md p-2 overflow-x-auto whitespace-pre">{tool.command}</pre>
              </div>
            {/each}
          </div>
        </Card>
      {:else if activeSection === 'ssh-terminal'}
        <Card class="space-y-3">
          <div class="flex items-center gap-2">
            <Terminal class="w-4 h-4 text-indigo-600" />
            <div>
              <p class="text-xs uppercase tracking-wide text-indigo-600 font-semibold">{$isLoading ? 'Remote' : $_('tools.remote')}</p>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$isLoading ? 'SSH terminal (UI)' : $_('tools.sshTerminalUI')}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">{$isLoading ? 'Frontend shell; backend proxy needed to run commands.' : $_('tools.sshDescription')}</p>
            </div>
          </div>

          {#if sshError}
            <Alert color="red">{sshError}</Alert>
          {/if}

          <div class="grid md:grid-cols-2 gap-3">
            <div class="space-y-2">
              <Label>{$isLoading ? 'Host' : $_('tools.host')}</Label>
              <Input bind:value={sshHost} placeholder={$isLoading ? 'hostname or IP' : $_('tools.placeholders.host')} />
            </div>
            <div class="space-y-2">
              <Label>{$isLoading ? 'Port' : $_('tools.port')}</Label>
              <Input type="number" bind:value={sshPort} min="1" max="65535" />
            </div>
            <div class="space-y-2">
              <Label>{$isLoading ? 'Username' : $_('tools.username')}</Label>
              <Input bind:value={sshUser} />
            </div>
            <div class="space-y-2">
              <Label>{$isLoading ? 'Auth' : $_('tools.auth')}</Label>
              <Select bind:value={sshAuth}>
                <option value="password">{$isLoading ? 'Password' : $_('tools.password')}</option>
                <option value="key">{$isLoading ? 'SSH key' : $_('tools.sshKey')}</option>
              </Select>
            </div>
            <div class="space-y-2 md:col-span-2">
              <Label>{sshAuth === 'password' ? ($isLoading ? 'Password' : $_('tools.password')) : ($isLoading ? 'Private key' : $_('tools.privateKey'))}</Label>
              <Textarea rows={sshAuth === 'password' ? 2 : 4} bind:value={sshSecret} class="font-mono text-xs" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button on:click={mockConnect} color="primary" size="sm">
              <Link2 class="w-4 h-4" /> {sshStatus === 'connected' ? ($isLoading ? 'Reconnect' : $_('tools.reconnect')) : ($isLoading ? 'Connect' : $_('tools.connect'))}
            </Button>
            <Button on:click={() => { sshOutput = []; sshError=''; }} color="light" size="sm">
              <RefreshCw class="w-4 h-4" /> {$isLoading ? 'Clear' : $_('common.clearText')}
            </Button>
          </div>

          <div class="space-y-2">
            <Label>{$isLoading ? 'Command' : $_('tools.command')}</Label>
            <div class="flex gap-2">
              <Input bind:value={sshCommand} class="flex-1" />
              <Button on:click={mockSend} color="primary" size="sm">
                <Play class="w-4 h-4" /> {$isLoading ? 'Send' : $_('tools.send')}
              </Button>
            </div>
          </div>

          <div class="border rounded-lg bg-slate-900 text-slate-100 min-h-[180px] max-h-80 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {#if sshOutput.length === 0}
              <p class="text-slate-400">{$isLoading ? 'No session output yet.' : $_('tools.noOutput')}</p>
            {:else}
              {#each sshOutput as line}
                <div>{line}</div>
              {/each}
            {/if}
          </div>
        </Card>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.mermaid) {
    display: block;
  }
</style>
