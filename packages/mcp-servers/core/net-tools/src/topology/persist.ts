import type { TopologyGraphDraft, TopologyPersistSummary, TopologyStore } from '../types.js'

export async function persistTopologyGraph(store: TopologyStore, graph: TopologyGraphDraft): Promise<TopologyPersistSummary> {
    const nodes = await store.upsertNodes(graph.nodes)
    const nodeIdMap = new Map<string, string>()
    for (const node of nodes) {
        if (!node.id) continue
        if (node.key) nodeIdMap.set(node.key, node.id)
        if (node.mgmtIp) nodeIdMap.set(node.mgmtIp, node.id)
        if (node.hostname) nodeIdMap.set(node.hostname, node.id)
    }

    const ports = await store.upsertPorts(graph.ports.map((port) => ({
        ...port,
        nodeId: port.nodeId || (port.nodeKey ? nodeIdMap.get(port.nodeKey) : undefined)
    })))

    const portNameToNode = new Map<string, string>()
    for (const port of ports) {
        if (port.nodeId) {
            portNameToNode.set(`${port.nodeId}:${port.ifName}`, port.nodeId)
        }
    }

    const edges = await store.upsertEdges(graph.edges.map((edge) => ({
        ...edge,
        aNodeId: edge.aNodeId || (edge.aNodeKey ? nodeIdMap.get(edge.aNodeKey) : undefined),
        bNodeId: edge.bNodeId || (edge.bNodeKey ? nodeIdMap.get(edge.bNodeKey) : undefined)
    })))

    return {
        nodesUpserted: nodes.length,
        portsUpserted: ports.length,
        edgesUpserted: edges.length
    }
}
