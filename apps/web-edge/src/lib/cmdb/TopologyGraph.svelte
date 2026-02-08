<script lang="ts">
  import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
  import { Button, Badge, Card, Spinner, Modal, Heading } from 'flowbite-svelte';
  import { RefreshCw, Maximize2, Download, ZoomIn, ZoomOut, Zap, AlertTriangle } from 'lucide-svelte';
  import { getCmdbGraph, getCiDependencyPath, getCiImpact, type CiGraph } from '$lib/api/cmdb';

  interface Props {
    depth?: number;
    direction?: 'upstream' | 'downstream' | 'both';
    focusNodeId?: string;
  }

  let { depth = 2, direction = 'both', focusNodeId }: Props = $props();

  let container = $state<HTMLDivElement | undefined>(undefined);
  let cy: Core | null = null;
  let graphData = $state<CiGraph | null>(null);
  let loading = $state(true);
  let error = $state('');
  let selectedNode = $state<any>(null);
  let stats = $state({ nodes: 0, edges: 0 });
  let highlightedNodes = $state<Set<string>>(new Set());
  let highlightedEdges = $state<Set<string>>(new Set());
  let dependencyChain = $state<string[]>([]);
  let impactAnalysis = $state<{ affected: any[]; count: number; depth: number } | null>(null);
  let showImpactModal = $state(false);
  let analyzing = $state(false);

  // Cytoscape stylesheet
  const cytoscapeStyle = [
    {
      selector: 'node',
      style: {
        'background-color': '#4F46E5',
        'label': 'data(label)',
        'color': '#000',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'width': '60px',
        'height': '60px',
        'border-width': '2px',
        'border-color': '#312E81'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': '#F59E0B',
        'border-color': '#D97706',
        'border-width': '3px'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#CBD5E1',
        'target-arrow-color': '#CBD5E1',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#F59E0B',
        'target-arrow-color': '#F59E0B',
        'width': 3
      }
    },
    // Node types styling
    {
      selector: 'node[type="server"]',
      style: {
        'background-color': '#3B82F6',
        'shape': 'rectangle'
      }
    },
    {
      selector: 'node[type="database"]',
      style: {
        'background-color': '#10B981',
        'shape': 'diamond'
      }
    },
    {
      selector: 'node[type="application"]',
      style: {
        'background-color': '#8B5CF6',
        'shape': 'ellipse'
      }
    },
    {
      selector: 'node[type="network"]',
      style: {
        'background-color': '#F59E0B',
        'shape': 'hexagon'
      }
    },
    // Highlight styles for path highlighting
    {
      selector: 'node.highlighted',
      style: {
        'background-color': '#06B6D4',
        'border-width': '3px',
        'border-color': '#0891B2'
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#06B6D4',
        'target-arrow-color': '#06B6D4',
        'width': '3px'
      }
    },
    // Impact analysis highlighting (red for affected)
    {
      selector: 'node.impact',
      style: {
        'background-color': '#EF4444',
        'border-width': '3px',
        'border-color': '#DC2626'
      }
    }
  ];

  $effect(() => {
    void loadGraphData();
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  });

  async function loadGraphData() {
    try {
      loading = true;
      error = '';
      
      const response = await getCmdbGraph({ depth, direction });
      graphData = response.data;
      
      initializeCytoscape();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load graph data';
      console.error('Graph load error:', err);
    } finally {
      loading = false;
    }
  }

  function initializeCytoscape() {
    if (!graphData || !container) return;

    // Convert CMDB graph to Cytoscape elements
    const elements: ElementDefinition[] = [];

    // Add nodes - use relationship types to map edges with proper labels
    graphData.nodes.forEach(node => {
      elements.push({
        data: {
          id: node.id,
          label: node.name || node.ciCode,
          type: node.typeId?.toLowerCase() || 'unknown',
          status: node.status,
          environment: node.environment
        }
      });
    });

    // Add edges (relationships)  
    graphData.edges.forEach(edge => {
      elements.push({
        data: {
          id: edge.id,
          source: edge.fromCiId,
          target: edge.toCiId,
          label: edge.relTypeId || '',
          type: edge.relTypeId
        }
      });
    });

    // Initialize Cytoscape
    cy = cytoscape({
      container,
      elements,
      style: cytoscapeStyle as any,
      layout: {
        name: 'cose', // Force-directed layout
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2
    });

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      selectedNode = {
        id: node.id(),
        label: node.data('label'),
        type: node.data('type'),
        status: node.data('status'),
        environment: node.data('environment')
      };
      clearHighlighting();
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        selectedNode = null;
        clearHighlighting();
      }
    });

    // Update stats
    stats = {
      nodes: cy.nodes().length,
      edges: cy.edges().length
    };

    // Focus on specific node if provided
    if (focusNodeId && cy.$(`#${focusNodeId}`).length > 0) {
      cy.center(cy.$(`#${focusNodeId}`));
      cy.$(`#${focusNodeId}`).select();
    }
  }

  function clearHighlighting() {
    if (!cy) return;
    highlightedNodes.clear();
    highlightedEdges.clear();
    dependencyChain = [];
    cy.nodes().removeClass('highlighted impact');
    cy.edges().removeClass('highlighted');
  }

  async function handleShowDependencies(ciId: string, direction: 'upstream' | 'downstream') {
    try {
      analyzing = true;
      const result = await getCiDependencyPath(ciId, direction);
      const pathData = result.data;
      
      // Highlight path nodes and edges
      highlightedNodes = new Set(pathData.path.map(ci => ci.id));
      dependencyChain = pathData.chain;
      
      if (cy) {
        highlightedNodes.forEach(nodeId => {
          const node = cy!.$(`#${nodeId}`);
          if (node.length > 0) node.addClass('highlighted');
        });
        
        // Find and highlight edges in the path
        for (let i = 0; i < pathData.path.length - 1; i++) {
          const edge = cy!.edges().filter((edge: cytoscape.EdgeSingular) => 
            (edge.source().id() === pathData.path[i].id && edge.target().id() === pathData.path[i + 1].id) ||
            (edge.target().id() === pathData.path[i].id && edge.source().id() === pathData.path[i + 1].id)
          );
          edge.addClass('highlighted');
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dependency path';
    } finally {
      analyzing = false;
    }
  }

  async function handleShowImpact(ciId: string) {
    try {
      analyzing = true;
      const result = await getCiImpact(ciId);
      impactAnalysis = result.data;
      
      // Highlight affected nodes
      highlightedNodes = new Set(result.data.affected.map(ci => ci.id));
      
      if (cy) {
        highlightedNodes.forEach(nodeId => {
          const node = cy!.$(`#${nodeId}`);
          if (node.length > 0) node.addClass('impact');
        });
      }
      
      showImpactModal = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load impact analysis';
    } finally {
      analyzing = false;
    }
  }

  function handleRefresh() {
    loadGraphData();
  }

  function handleFit() {
    if (cy) {
      cy.fit(undefined, 50);
    }
  }

  function handleZoomIn() {
    if (cy) {
      cy.zoom(cy.zoom() * 1.2);
      cy.center();
    }
  }

  function handleZoomOut() {
    if (cy) {
      cy.zoom(cy.zoom() * 0.8);
      cy.center();
    }
  }

  function handleExport() {
    if (!cy) return;
    
    const png = cy.png({ scale: 2, full: true });
    const link = document.createElement('a');
    link.download = `cmdb-topology-${new Date().toISOString().split('T')[0]}.png`;
    link.href = png;
    link.click();
  }

  function changeLayout(layoutName: string) {
    if (!cy) return;
    
    cy.layout({
      name: layoutName,
      fit: true,
      padding: 30
    } as any).run();
  }
</script>

<div class="space-y-4">
  <!-- Toolbar -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <h3 class="text-lg font-semibold">CMDB Topology</h3>
      {#if !loading}
        <div class="flex gap-2 text-sm text-gray-600">
          <Badge color="blue">{stats.nodes} CIs</Badge>
          <Badge color="green">{stats.edges} Relationships</Badge>
        </div>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <Button size="xs" color="light" onclick={handleZoomIn} title="Zoom In">
        <ZoomIn class="h-4 w-4" />
      </Button>
      <Button size="xs" color="light" onclick={handleZoomOut} title="Zoom Out">
        <ZoomOut class="h-4 w-4" />
      </Button>
      <Button size="xs" color="light" onclick={handleFit} title="Fit to View">
        <Maximize2 class="h-4 w-4" />
      </Button>
      <Button size="xs" color="light" onclick={() => changeLayout('circle')} title="Circle Layout">
        Circle
      </Button>
      <Button size="xs" color="light" onclick={() => changeLayout('breadthfirst')} title="Hierarchical">
        Tree
      </Button>
      <Button size="xs" color="light" onclick={() => changeLayout('cose')} title="Force-directed">
        Force
      </Button>
      <Button size="xs" color="light" onclick={handleExport} title="Export PNG">
        <Download class="h-4 w-4" />
      </Button>
      <Button size="xs" color="light" onclick={handleRefresh} title="Refresh">
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Error Alert -->
  {#if error}
    <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
      {error}
    </div>
  {/if}

  <!-- Graph Container -->
  <div class="relative rounded-lg border border-gray-200 bg-white h-[600px]">
    {#if loading}
      <div class="flex h-full items-center justify-center">
        <Spinner size="12" />
        <span class="ml-3 text-gray-600">Loading topology...</span>
      </div>
    {:else}
      <div bind:this={container} class="h-full w-full rounded-lg"></div>
    {/if}
  </div>

  <!-- Selected Node Details -->
  {#if selectedNode}
    <Card class="mt-4">
      <h4 class="mb-3 font-semibold">Selected CI: {selectedNode.label}</h4>
      <dl class="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt class="text-gray-500">Type</dt>
          <dd class="font-medium">{selectedNode.type || 'Unknown'}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Status</dt>
          <dd>
            <Badge color={selectedNode.status === 'active' ? 'green' : 'dark'}>
              {selectedNode.status}
            </Badge>
          </dd>
        </div>
        {#if selectedNode.environment}
          <div>
            <dt class="text-gray-500">Environment</dt>
            <dd class="font-medium">{selectedNode.environment}</dd>
          </div>
        {/if}
      </dl>
      <div class="flex flex-wrap gap-2">
        <Button size="xs" href="/cmdb/cis/{selectedNode.id}">View Details</Button>
        <Button size="xs" color="light" disabled={analyzing} onclick={() => handleShowDependencies(selectedNode.id, 'downstream')}>
          {#if analyzing}
            <Spinner size="3" class="mr-2" />
          {:else}
            <Zap class="h-3 w-3 mr-2" />
          {/if}
          Downstream
        </Button>
        <Button size="xs" color="light" disabled={analyzing} onclick={() => handleShowDependencies(selectedNode.id, 'upstream')}>
          {#if analyzing}
            <Spinner size="3" class="mr-2" />
          {:else}
            <Zap class="h-3 w-3 mr-2" />
          {/if}
          Upstream
        </Button>
        <Button size="xs" color="red" disabled={analyzing} onclick={() => handleShowImpact(selectedNode.id)}>
          {#if analyzing}
            <Spinner size="3" class="mr-2" />
          {:else}
            <AlertTriangle class="h-3 w-3 mr-2" />
          {/if}
          Impact
        </Button>
        {#if dependencyChain.length > 0}
          <Button size="xs" color="blue" onclick={() => clearHighlighting()}>Clear</Button>
        {/if}
      </div>
      
      {#if dependencyChain.length > 0}
        <div class="mt-3 rounded bg-blue-50 p-3 text-sm">
          <p class="mb-2 font-semibold text-blue-900">Dependency Path:</p>
          <p class="text-blue-800">{dependencyChain.join(' → ')}</p>
        </div>
      {/if}
    </Card>
  {/if}

  <!-- Legend -->
  <Card class="mt-4">
    <h4 class="mb-3 text-sm font-semibold">Legend</h4>
    <div class="mb-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
      <div class="flex items-center gap-2">
        <div class="h-4 w-4 rounded bg-blue-500"></div>
        <span>Server</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 w-4 rounded bg-green-500"></div>
        <span>Database</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 w-4 rounded bg-purple-500"></div>
        <span>Application</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 w-4 rounded bg-orange-500"></div>
        <span>Network</span>
      </div>
    </div>
    <div class="border-t pt-3">
      <p class="mb-2 text-xs font-semibold text-gray-600">Highlighting:</p>
      <div class="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 rounded border-2 border-cyan-600 bg-cyan-400"></div>
          <span>Dependency Path</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 rounded border-2 border-red-600 bg-red-400"></div>
          <span>Impact Zone</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 border-2 border-orange-400"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  </Card>

  <!-- Impact Modal -->
  <Modal bind:open={showImpactModal} size="md" title="Impact Analysis">
    {#if impactAnalysis}
      <div class="space-y-4">
        <div class="rounded-lg bg-red-50 p-4">
          <div class="mb-2 flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-red-600" />
            <h3 class="font-semibold text-red-900">Impact Summary</h3>
          </div>
          <p class="text-sm text-red-800">
            If <strong>{selectedNode?.label}</strong> fails, <strong>{impactAnalysis.count}</strong> CI(s) across <strong>{impactAnalysis.depth}</strong> level(s) will be affected.
          </p>
        </div>
        
        <div>
          <h4 class="mb-2 font-semibold text-sm">Affected CIs:</h4>
          <div class="max-h-64 overflow-y-auto">
            <div class="space-y-2">
              {#each impactAnalysis.affected as ci}
                <div class="flex items-center justify-between rounded border border-red-200 bg-red-50 p-2">
                  <div>
                    <p class="font-medium text-sm">{ci.name || ci.ciCode}</p>
                    <p class="text-xs text-gray-600">{ci.ciCode}</p>
                  </div>
                  <Badge color="red">{ci.status}</Badge>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </Modal>
</div>
