<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Textarea, Label, Alert, Input, Select } from 'flowbite-svelte';
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
    { id: 'mermaid', label: 'Mermaid' },
    { id: 'field-kit', label: 'Field kit' },
    { id: 'ssh-terminal', label: 'SSH terminal' }
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
      title: 'nmap: fast service scan',
      command: 'nmap -sV -T4 -Pn <target>',
      description: 'Skip host discovery (-Pn) and fingerprint common services quickly.'
    },
    {
      title: 'nmap: top UDP ports',
      command: 'nmap -sU --top-ports 50 <target>',
      description: 'Quick UDP sweep for common ports that are often missed.'
    },
    {
      title: 'snmpwalk baseline',
      command: 'snmpwalk -v2c -c <community> <host> 1.3.6.1.2.1',
      description: 'Enumerate standard MIB-2 tree; swap OID for vendor-specific branches.'
    },
    {
      title: 'snmp interface table (bulk)',
      command: 'snmpbulkwalk -v2c -c <community> -Cr10 <host> 1.3.6.1.2.1.2.2',
      description: 'Walk IF-MIB efficiently; increase -Cr for larger batches.'
    },
    {
      title: 'Path & loss check (mtr)',
      command: 'mtr -rw <target>',
      description: 'Continuous traceroute+ping to find loss/latency across hops.'
    },
    {
      title: 'Packet capture with rotation',
      command: 'tcpdump -i eth0 -G 300 -W 4 -w capture-%Y%m%d-%H%M%S.pcap port 443',
      description: 'Rotate pcap every 5 minutes, keep 4 files, focused on TLS traffic.'
    },
    {
      title: 'HTTP health probe',
      command: 'curl -fsSL http://<host>:3000/health/live',
      description: 'Simple health check you can drop into cron or monitoring.'
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
    sshError = 'SSH backend not wired yet — please connect to server API.';
    sshStatus = 'connected';
    sshOutput = [
      ...sshOutput,
      `[local] Connecting to ${sshUser}@${sshHost}:${sshPort} (${sshAuth})`,
      `! Backend missing: add server-side SSH proxy to enable execution.`
    ];
  }

  function mockSend() {
    if (sshStatus !== 'connected') {
      sshError = 'Not connected.';
      return;
    }
    sshOutput = [...sshOutput, `$ ${sshCommand}`, '... awaiting backend implementation ...'];
  }

  onMount(() => {
    renderDiagram();
  });
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="flex items-start gap-6">
    <aside class="w-48 shrink-0 hidden md:block">
      <div class="sticky top-20 space-y-2">
        <p class="text-xs font-semibold text-slate-500 uppercase">Sections</p>
        <div class="flex flex-col gap-2">
          {#each sections as sec}
            <button
              class="text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors {activeSection === sec.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
              onclick={() => activeSection = sec.id as typeof activeSection}
            >
              {sec.label}
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <div class="flex-1 space-y-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Tools & Utils</h1>
          <p class="text-sm text-slate-500 dark:text-slate-300">
            Quick helpers for diagrams, network troubleshooting, and SSH access.
          </p>
        </div>
      </div>

      {#if activeSection === 'mermaid'}
        <div class="grid lg:grid-cols-2 gap-4">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">Diagram</p>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Mermaid playground</h3>
              </div>
              <div class="flex gap-2">
                <Button color="light" size="xs" on:click={() => mermaidInput = mermaidInput.trim()} aria-label="Reset whitespace">
                  <RefreshCw class="w-4 h-4" />
                </Button>
                <Button size="xs" on:click={renderDiagram} disabled={rendering}>
                  <Play class="w-4 h-4" />
                  {rendering ? 'Rendering...' : 'Render'}
                </Button>
              </div>
            </div>

            <div class="space-y-2">
              <Label>Mermaid definition</Label>
              <Textarea rows={10} bind:value={mermaidInput} class="font-mono text-xs" />
            </div>

            {#if mermaidError}
              <Alert color="red">{mermaidError}</Alert>
            {/if}

            <div class="border rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 min-h-[200px]">
              {#if mermaidSvg}
                <div class="mermaid">{@html mermaidSvg}</div>
              {:else}
                <p class="text-sm text-slate-500">Render to preview your diagram.</p>
              {/if}
            </div>
          </Card>

          <Card class="space-y-3">
            <div class="flex items-center gap-2">
              <Terminal class="w-4 h-4 text-blue-600" />
              <div>
                <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">Quick help</p>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Mermaid tips</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Use subgraphs, links, and styles to keep diagrams readable.</p>
              </div>
            </div>
            <ul class="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li>Group flows with <code class="bg-slate-100 px-1 rounded">subgraph</code> blocks.</li>
              <li>Align left-to-right with <code class="bg-slate-100 px-1 rounded">flowchart LR</code> or top-down with <code class="bg-slate-100 px-1 rounded">TD</code>.</li>
              <li>Use <code class="bg-slate-100 px-1 rounded">style</code> for emphasis and <code class="bg-slate-100 px-1 rounded">linkStyle</code> for edges.</li>
            </ul>
          </Card>
        </div>
      {:else if activeSection === 'field-kit'}
        <Card class="space-y-3">
          <div class="flex items-center gap-2">
            <Terminal class="w-4 h-4 text-blue-600" />
            <div>
              <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">Field kit</p>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Network quick commands</h3>
            </div>
          </div>
          <div class="space-y-3">
            {#each cliTools as tool (tool.title)}
              <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    {#if tool.title.toLowerCase().includes('nmap')}
                      <Radar class="w-4 h-4 text-blue-500" />
                    {:else if tool.title.toLowerCase().includes('snmp')}
                      <SatelliteDish class="w-4 h-4 text-emerald-500" />
                    {:else if tool.title.toLowerCase().includes('mtr')}
                      <Route class="w-4 h-4 text-indigo-500" />
                    {:else}
                      <Activity class="w-4 h-4 text-slate-500" />
                    {/if}
                    <div>
                      <p class="text-sm font-semibold text-slate-900 dark:text-white">{tool.title}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">{tool.description}</p>
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
              <p class="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Remote</p>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">SSH terminal (UI)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Frontend shell; backend proxy needed to run commands.</p>
            </div>
          </div>

          {#if sshError}
            <Alert color="red">{sshError}</Alert>
          {/if}

          <div class="grid md:grid-cols-2 gap-3">
            <div class="space-y-2">
              <Label>Host</Label>
              <Input bind:value={sshHost} placeholder="hostname or IP" />
            </div>
            <div class="space-y-2">
              <Label>Port</Label>
              <Input type="number" bind:value={sshPort} min="1" max="65535" />
            </div>
            <div class="space-y-2">
              <Label>Username</Label>
              <Input bind:value={sshUser} />
            </div>
            <div class="space-y-2">
              <Label>Auth</Label>
              <Select bind:value={sshAuth}>
                <option value="password">Password</option>
                <option value="key">SSH key</option>
              </Select>
            </div>
            <div class="space-y-2 md:col-span-2">
              <Label>{sshAuth === 'password' ? 'Password' : 'Private key'}</Label>
              <Textarea rows={sshAuth === 'password' ? 2 : 4} bind:value={sshSecret} class="font-mono text-xs" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button on:click={mockConnect} color="primary" size="sm">
              <Link2 class="w-4 h-4" /> {sshStatus === 'connected' ? 'Reconnect' : 'Connect'}
            </Button>
            <Button on:click={() => { sshOutput = []; sshError=''; }} color="light" size="sm">
              <RefreshCw class="w-4 h-4" /> Clear
            </Button>
          </div>

          <div class="space-y-2">
            <Label>Command</Label>
            <div class="flex gap-2">
              <Input bind:value={sshCommand} class="flex-1" />
              <Button on:click={mockSend} color="primary" size="sm">
                <Play class="w-4 h-4" /> Send
              </Button>
            </div>
          </div>

          <div class="border rounded-lg bg-slate-900 text-slate-100 min-h-[180px] max-h-80 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {#if sshOutput.length === 0}
              <p class="text-slate-400">No session output yet.</p>
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
