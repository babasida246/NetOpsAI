<script lang="ts">
  import { Button, Card, Input, Label, Select, Toggle, Spinner, Modal, Badge } from 'flowbite-svelte';
  import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
  import { onMount } from 'svelte';
  import { RefreshCw, Play, Filter, Network, Activity } from 'lucide-svelte';
  import { getTopologyGraph, triggerTopologyDiscovery, getTopologyEdge, getTopologyNode, type TopologyGraph } from '$lib/api/topology';

  let graph = $state<TopologyGraph>({ nodes: [], edges: [] });
  let loading = $state(true);
  let error = $state('');
  let showEndpoints = $state(true);
  let selectedNode = $state<any>(null);
  let selectedEdge = $state<any>(null);
  let isRunning = $state(false);
  let showDiscovery = $state(false);
  let container = $state<HTMLDivElement | null>(null);
  let cy: Core | null = null;

  let siteFilter = $state('');
  let zoneFilter = $state('');

  let discoveryPayload = $state({
    seedDevices: ['dev-1'],
    includeNmap: true,
    nmapTargets: ['10.0.0.0/30'],
    snmpTargets: ['dev-1'],
    mode: 'fast' as 'fast' | 'full'
  });
  let seedDevicesText = $state('dev-1');
  let nmapTargetsText = $state('10.0.0.0/30');

  const mockGraph: TopologyGraph = {
    nodes: [
      { id: 'node-1', kind: 'switch', hostname: 'core-sw-1', mgmtIp: '10.0.0.1', vendor: 'MikroTik', model: 'CCR2004', lastSeenAt: new Date().toISOString() },
      { id: 'node-2', kind: 'switch', hostname: 'core-sw-2', mgmtIp: '10.0.0.2', vendor: 'MikroTik', model: 'CSS610', lastSeenAt: new Date().toISOString() },
      { id: 'node-3', kind: 'server', hostname: 'app-01', mgmtIp: '10.0.0.100', vendor: 'Dell', model: 'R640', lastSeenAt: new Date().toISOString() }
    ],
    edges: [
      { id: 'edge-1', a: { nodeId: 'node-1', port: 'ether1' }, b: { nodeId: 'node-2', port: 'ether1' }, confidence: 98, evidenceCount: 1, lastSeenAt: new Date().toISOString() },
      { id: 'edge-2', a: { nodeId: 'node-1', port: 'ether3' }, b: { nodeId: 'node-3', port: 'eth0' }, confidence: 70, evidenceCount: 1, lastSeenAt: new Date().toISOString() }
    ]
  };

  const nodeColors: Record<string, string> = {
    router: '#1d4ed8',
    switch: '#0f766e',
    server: '#9333ea',
    ap: '#d97706',
    printer: '#e11d48',
    unknown: '#64748b'
  };

  async function loadGraph() {
    try {
      loading = true;
      error = '';
      const data = await getTopologyGraph({
        site: siteFilter || undefined,
        zone: zoneFilter || undefined
      });
      graph = data.nodes.length ? data : mockGraph;
      renderGraph();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load topology';
      graph = mockGraph;
      renderGraph();
    } finally {
      loading = false;
    }
  }

  function renderGraph() {
    if (!container) return;
    if (cy) cy.destroy();

    const elements: ElementDefinition[] = [];
    const visibleNodes = graph.nodes.filter((node) => showEndpoints || node.kind !== 'unknown');
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    visibleNodes.forEach((node) => {
      elements.push({
        data: {
          id: node.id,
          label: node.hostname || node.mgmtIp || node.id,
          kind: node.kind,
          meta: node
        }
      });
    });

    graph.edges
      .filter((edge) => visibleNodeIds.has(edge.a.nodeId) && visibleNodeIds.has(edge.b.nodeId))
      .forEach((edge) => {
        elements.push({
          data: {
            id: edge.id,
            source: edge.a.nodeId,
            target: edge.b.nodeId,
            label: `${edge.a.port} ↔ ${edge.b.port ?? '?'}`,
            confidence: edge.confidence
          }
        });
      });

    cy = cytoscape({
      container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => nodeColors[ele.data('kind')] || nodeColors.unknown,
            'label': 'data(label)',
            'color': '#0f172a',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '10px',
            'width': '70px',
            'height': '70px',
            'border-width': '2px',
            'border-color': '#e2e8f0'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, ele.data('confidence') / 30),
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '9px',
            'text-margin-y': -8
          }
        }
      ],
      layout: {
        name: 'cose',
        fit: true,
        padding: 40,
        randomize: false,
        idealEdgeLength: 100,
        nodeRepulsion: 500000,
        edgeElasticity: 120
      }
    });

    cy.on('tap', 'node', async (event) => {
      const node = event.target;
      selectedEdge = null;
      const detail = await getTopologyNode(node.data('id')).catch(() => node.data('meta'));
      selectedNode = detail;
    });

    cy.on('tap', 'edge', async (event) => {
      const edge = event.target;
      selectedNode = null;
      const detail = await getTopologyEdge(edge.data('id')).catch(() => ({ id: edge.data('id') }));
      selectedEdge = detail;
    });
  }

  async function runDiscovery() {
    try {
      isRunning = true;
      const payload = { ...discoveryPayload };
      await triggerTopologyDiscovery(payload);
      await loadGraph();
      showDiscovery = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Discovery failed';
    } finally {
      isRunning = false;
    }
  }

  onMount(() => {
    void loadGraph();
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="page-shell page-content py-6 lg:py-8 space-y-6 font-['Space Grotesk']">
  <div class="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="flex items-center gap-2 text-slate-700">
          <Network class="h-5 w-5 text-slate-500" />
          <span class="text-sm font-semibold uppercase tracking-[0.2em]">Topology</span>
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">Network discovery workspace</h1>
        <p class="text-sm text-slate-500">LLDP and bridge-host signals blended into a live graph.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button color="alternative" on:click={loadGraph}>
          <RefreshCw class="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button on:click={() => showDiscovery = true}>
          <Play class="mr-2 h-4 w-4" />
          Run discovery
        </Button>
      </div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[1.1fr_2fr]">
      <Card class="border border-slate-200 shadow-none">
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter class="h-4 w-4" /> Filters
          </div>
          <div>
            <Label>Site</Label>
            <Input placeholder="DC1" bind:value={siteFilter} on:change={loadGraph} />
          </div>
          <div>
            <Label>Zone</Label>
            <Input placeholder="A" bind:value={zoneFilter} on:change={loadGraph} />
          </div>
          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <p class="text-sm font-semibold text-slate-700">Show endpoints</p>
              <p class="text-xs text-slate-400">Toggle servers & unknown hosts</p>
            </div>
            <Toggle bind:checked={showEndpoints} on:change={renderGraph} />
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-3">
            <div class="text-xs text-slate-500">Nodes</div>
            <div class="text-lg font-semibold">{graph.nodes.length}</div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-3">
            <div class="text-xs text-slate-500">Edges</div>
            <div class="text-lg font-semibold">{graph.edges.length}</div>
          </div>
        </div>
      </Card>

      <Card class="border border-slate-200 shadow-none">
        {#if loading}
          <div class="flex h-[520px] items-center justify-center text-slate-500">
            <Spinner class="mr-3" /> Loading topology...
          </div>
        {:else}
          <div class="h-[520px] w-full rounded-2xl border border-slate-200" bind:this={container}></div>
        {/if}
      </Card>
    </div>
  </div>

  {#if error}
    <Card class="border border-rose-200 bg-rose-50 text-rose-800 shadow-none">
      {error}
    </Card>
  {/if}

  <div class="grid gap-4 lg:grid-cols-2">
    <Card class="border border-slate-200 shadow-none">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Activity class="h-4 w-4" /> Node detail
      </div>
      {#if selectedNode}
        <div class="mt-3 space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <Badge color="blue">{selectedNode.node?.kind ?? selectedNode.kind ?? 'node'}</Badge>
            <span class="font-semibold">{selectedNode.node?.hostname ?? selectedNode.hostname ?? selectedNode.node?.mgmtIp ?? selectedNode.mgmtIp}</span>
          </div>
          <div class="text-slate-500">Vendor: {selectedNode.node?.vendor ?? selectedNode.vendor ?? 'Unknown'}</div>
          <div class="text-slate-500">Model: {selectedNode.node?.model ?? selectedNode.model ?? 'Unknown'}</div>
          <div class="text-slate-500">Last seen: {selectedNode.node?.lastSeenAt ?? selectedNode.lastSeenAt ?? 'n/a'}</div>
          {#if selectedNode.ports}
            <div class="mt-3 text-xs uppercase tracking-wide text-slate-400">Ports</div>
            <ul class="space-y-1 text-sm text-slate-600">
              {#each selectedNode.ports as port}
                <li>{port.ifName} {port.mac ? `(${port.mac})` : ''}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <p class="mt-3 text-sm text-slate-500">Select a node to inspect interfaces and metadata.</p>
      {/if}
    </Card>

    <Card class="border border-slate-200 shadow-none">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Activity class="h-4 w-4" /> Edge evidence
      </div>
      {#if selectedEdge}
        <div class="mt-3 space-y-2 text-sm">
          <div class="text-slate-500">Confidence: {selectedEdge.confidence ?? 'n/a'}</div>
          <div class="text-slate-500">Last seen: {selectedEdge.lastSeenAt ?? 'n/a'}</div>
          {#if selectedEdge.evidence}
            <div class="mt-3 text-xs uppercase tracking-wide text-slate-400">Evidence</div>
            <ul class="space-y-2 text-sm text-slate-600">
              {#each selectedEdge.evidence as ev}
                <li>
                  <strong>{ev.source}</strong> · {ev.capturedAt}
                  <div class="text-xs text-slate-400">{JSON.stringify(ev.detail)}</div>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <p class="mt-3 text-sm text-slate-500">Select an edge to see evidence and confidence.</p>
      {/if}
    </Card>
  </div>
</div>

<Modal bind:open={showDiscovery} size="lg">
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Run topology discovery</h3>
    <div>
      <Label>Seed device IDs (comma separated)</Label>
      <Input bind:value={seedDevicesText} on:input={(e) => {
        const target = e.currentTarget as HTMLInputElement | null;
        if (!target) return;
        seedDevicesText = target.value;
        discoveryPayload.seedDevices = seedDevicesText.split(',').map((v) => v.trim()).filter(Boolean);
      }} />
    </div>
    <div>
      <Label>Nmap targets (comma separated)</Label>
      <Input bind:value={nmapTargetsText} on:input={(e) => {
        const target = e.currentTarget as HTMLInputElement | null;
        if (!target) return;
        nmapTargetsText = target.value;
        discoveryPayload.nmapTargets = nmapTargetsText.split(',').map((v) => v.trim()).filter(Boolean);
      }} />
    </div>
    <div>
      <Label>Mode</Label>
      <Select bind:value={discoveryPayload.mode}>
        <option value="fast">Fast</option>
        <option value="full">Full</option>
      </Select>
    </div>
    <div class="flex items-center gap-3">
      <Toggle bind:checked={discoveryPayload.includeNmap} />
      <span class="text-sm">Include Nmap enrichment</span>
    </div>
    <div class="flex justify-end gap-2">
      <Button color="alternative" on:click={() => showDiscovery = false}>Cancel</Button>
      <Button on:click={runDiscovery} disabled={isRunning}>
        {#if isRunning}
          <Spinner class="mr-2" size="sm" />
        {/if}
        Run discovery
      </Button>
    </div>
  </div>
</Modal>
