import { describe, it, expect } from 'vitest';
import { runTopologyDiscovery } from '../src/topology/job.js';
const store = {
    async upsertNodes(nodes) { return nodes.map((node, idx) => ({ ...node, id: node.id || `node-${idx}` })); },
    async upsertPorts(ports) { return ports.map((port, idx) => ({ ...port, id: port.id || `port-${idx}` })); },
    async upsertEdges(edges) { return edges.map((edge, idx) => ({ ...edge, id: edge.id || `edge-${idx}` })); }
};
const deps = {
    topologyStore: store,
    deviceLookup: async (deviceId) => ({
        deviceId,
        hostname: 'core-switch',
        mgmtIp: '10.0.0.1',
        vendor: 'mikrotik',
        model: 'CCR2004',
        site: 'DC1',
        zone: 'A',
        role: 'core'
    })
};
process.env.DEV_MOCK_NETTOOLS = 'true';
describe('Topology discovery job', () => {
    it('builds a non-empty graph summary', async () => {
        const result = await runTopologyDiscovery({
            seedDevices: ['dev-1'],
            includeNmap: true,
            nmapTargets: ['10.0.0.0/30'],
            mode: 'fast'
        }, deps);
        expect(result.summary.nodesUpserted).toBeGreaterThan(0);
        expect(result.summary.edgesUpserted).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=discovery-job.test.js.map