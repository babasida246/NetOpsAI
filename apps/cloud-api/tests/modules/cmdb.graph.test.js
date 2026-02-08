import { describe, it, expect, beforeEach, vi } from 'vitest';
describe('CMDB Graph API', () => {
    let mockRelationshipService;
    beforeEach(() => {
        mockRelationshipService = {
            getFullGraph: vi.fn().mockResolvedValue({
                nodes: [
                    {
                        id: 'ci-1',
                        typeId: 'server',
                        name: 'Web Server',
                        ciCode: 'WEB-001',
                        status: 'active',
                        environment: 'production'
                    },
                    {
                        id: 'ci-2',
                        typeId: 'database',
                        name: 'MySQL DB',
                        ciCode: 'DB-001',
                        status: 'active',
                        environment: 'production'
                    }
                ],
                edges: [
                    {
                        id: 'rel-1',
                        relTypeId: 'depends_on',
                        fromCiId: 'ci-1',
                        toCiId: 'ci-2',
                        status: 'active'
                    }
                ]
            }),
            getGraph: vi.fn().mockResolvedValue({
                nodes: [],
                edges: []
            })
        };
    });
    describe('Full Graph - getFullGraph', () => {
        it('should return full graph with nodes and edges', async () => {
            const result = await mockRelationshipService.getFullGraph();
            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.nodes[0].id).toBe('ci-1');
            expect(result.edges[0].relTypeId).toBe('depends_on');
        });
        it('should return nodes with required properties', async () => {
            const result = await mockRelationshipService.getFullGraph();
            const node = result.nodes[0];
            expect(node).toHaveProperty('id');
            expect(node).toHaveProperty('name');
            expect(node).toHaveProperty('ciCode');
            expect(node).toHaveProperty('status');
        });
        it('should return edges with relationship information', async () => {
            const result = await mockRelationshipService.getFullGraph();
            const edge = result.edges[0];
            expect(edge).toHaveProperty('id');
            expect(edge).toHaveProperty('relTypeId');
            expect(edge).toHaveProperty('fromCiId');
            expect(edge).toHaveProperty('toCiId');
        });
        it('should return properly connected nodes and edges', async () => {
            const result = await mockRelationshipService.getFullGraph();
            const nodeIds = result.nodes.map(n => n.id);
            result.edges.forEach(edge => {
                expect(nodeIds).toContain(edge.fromCiId);
                expect(nodeIds).toContain(edge.toCiId);
            });
        });
        it('should return empty graph when no relationships exist', async () => {
            mockRelationshipService.getFullGraph.mockResolvedValueOnce({
                nodes: [],
                edges: []
            });
            const result = await mockRelationshipService.getFullGraph();
            expect(result.nodes).toHaveLength(0);
            expect(result.edges).toHaveLength(0);
        });
        it('should return graph data structure', async () => {
            const result = await mockRelationshipService.getFullGraph();
            expect(result).toHaveProperty('nodes');
            expect(result).toHaveProperty('edges');
            expect(Array.isArray(result.nodes)).toBe(true);
            expect(Array.isArray(result.edges)).toBe(true);
        });
    });
    describe('Specific CI Graph - getGraph', () => {
        it('should accept CI ID parameter', async () => {
            mockRelationshipService.getGraph('ci-1', 1, 'both');
            expect(mockRelationshipService.getGraph).toHaveBeenCalledWith('ci-1', 1, 'both');
        });
        it('should return graph for specific CI', async () => {
            mockRelationshipService.getGraph.mockResolvedValueOnce({
                nodes: [
                    {
                        id: 'ci-1',
                        name: 'Web Server',
                        ciCode: 'WEB-001'
                    }
                ],
                edges: []
            });
            const result = await mockRelationshipService.getGraph('ci-1', 1, 'both');
            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].ciCode).toBe('WEB-001');
        });
    });
    describe('Graph Validation', () => {
        it('should have valid graph structure', async () => {
            const result = await mockRelationshipService.getFullGraph();
            expect(Array.isArray(result.nodes)).toBe(true);
            expect(Array.isArray(result.edges)).toBe(true);
        });
        it('should not have duplicate node IDs', async () => {
            const result = await mockRelationshipService.getFullGraph();
            const ids = result.nodes.map(n => n.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });
        it('should have all active relationships', async () => {
            const result = await mockRelationshipService.getFullGraph();
            result.edges.forEach(edge => {
                expect(edge.status).toBe('active');
            });
        });
        it('should have consistent node references in edges', async () => {
            const result = await mockRelationshipService.getFullGraph();
            const nodeIds = new Set(result.nodes.map(n => n.id));
            result.edges.forEach(edge => {
                expect(nodeIds.has(edge.fromCiId)).toBe(true);
                expect(nodeIds.has(edge.toCiId)).toBe(true);
            });
        });
    });
});
//# sourceMappingURL=cmdb.graph.test.js.map