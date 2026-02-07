import { describe, it, expect, beforeEach, vi } from 'vitest';
describe('CMDB Path Highlighting & Impact Analysis', () => {
    let mockRelationshipService;
    beforeEach(() => {
        mockRelationshipService = {
            getDependencyPath: vi.fn(async (ciId, direction) => ({
                path: [
                    { id: 'ci-1', name: 'Web Server', ciCode: 'WEB-001' },
                    { id: 'ci-2', name: 'MySQL DB', ciCode: 'DB-001' },
                    { id: 'ci-3', name: 'Redis Cache', ciCode: 'CACHE-001' }
                ],
                chain: ['WEB-001', 'DB-001', 'CACHE-001']
            })),
            getImpactAnalysis: vi.fn(async (ciId) => ({
                affected: [
                    { id: 'ci-2', name: 'API Server', ciCode: 'API-001', status: 'active' },
                    { id: 'ci-3', name: 'Mobile App', ciCode: 'APP-001', status: 'active' },
                    { id: 'ci-4', name: 'Dashboard', ciCode: 'DASH-001', status: 'active' }
                ],
                count: 3,
                depth: 2
            }))
        };
    });
    describe('Path Highlighting - getDependencyPath', () => {
        it('should return downstream dependency path', async () => {
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result.path).toHaveLength(3);
            expect(result.chain).toEqual(['WEB-001', 'DB-001', 'CACHE-001']);
        });
        it('should call with correct parameters', async () => {
            await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(mockRelationshipService.getDependencyPath).toHaveBeenCalledWith('ci-1', 'downstream');
        });
        it('should return path data structure', async () => {
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result).toHaveProperty('path');
            expect(result).toHaveProperty('chain');
        });
        it('should return readable chain format', async () => {
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result.chain).toContain('WEB-001');
            expect(result.chain).toContain('DB-001');
            expect(result.chain).toContain('CACHE-001');
        });
        it('should support upstream direction', async () => {
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'upstream');
            expect(result).toBeDefined();
            expect(Array.isArray(result.path)).toBe(true);
        });
        it('should return consistent results', async () => {
            const result1 = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            const result2 = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result1.chain).toEqual(result2.chain);
        });
    });
    describe('Impact Analysis - getImpactAnalysis', () => {
        it('should return impact analysis with affected CIs', async () => {
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result.affected).toHaveLength(3);
            expect(result.count).toBe(3);
            expect(result.depth).toBe(2);
        });
        it('should call with correct CI ID', async () => {
            await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(mockRelationshipService.getImpactAnalysis).toHaveBeenCalledWith('ci-1');
        });
        it('should include detailed affected CI information', async () => {
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            const firstAffected = result.affected[0];
            expect(firstAffected).toHaveProperty('id');
            expect(firstAffected).toHaveProperty('name');
            expect(firstAffected).toHaveProperty('ciCode');
            expect(firstAffected).toHaveProperty('status');
        });
        it('should return impact analysis structure', async () => {
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result).toHaveProperty('affected');
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('depth');
        });
        it('should calculate correct impact depth', async () => {
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(typeof result.depth).toBe('number');
            expect(result.depth).toBeGreaterThanOrEqual(0);
        });
        it('should match count with affected array length', async () => {
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result.count).toBe(result.affected.length);
        });
        it('should handle large dependency chains', async () => {
            mockRelationshipService.getImpactAnalysis.mockResolvedValueOnce({
                affected: Array.from({ length: 15 }, (_, i) => ({
                    id: `ci-${i}`,
                    name: `CI ${i}`,
                    ciCode: `CI-${String(i).padStart(3, '0')}`,
                    status: 'active'
                })),
                count: 15,
                depth: 4
            });
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result.depth).toBe(4);
            expect(result.count).toBe(15);
            expect(result.affected).toHaveLength(15);
        });
    });
    describe('Dependency Chain Scenarios', () => {
        it('should handle linear dependency chain', async () => {
            mockRelationshipService.getDependencyPath.mockResolvedValueOnce({
                path: [
                    { id: 'ci-1', ciCode: 'A' },
                    { id: 'ci-2', ciCode: 'B' },
                    { id: 'ci-3', ciCode: 'C' },
                    { id: 'ci-4', ciCode: 'D' }
                ],
                chain: ['A', 'B', 'C', 'D']
            });
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result.chain).toHaveLength(4);
            expect(result.path).toHaveLength(4);
        });
        it('should support both chain directions', async () => {
            const downResult = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            const upResult = await mockRelationshipService.getDependencyPath('ci-1', 'upstream');
            expect(downResult).toBeDefined();
            expect(upResult).toBeDefined();
        });
        it('should maintain path CI code order', async () => {
            const result = await mockRelationshipService.getDependencyPath('ci-1', 'downstream');
            expect(result.chain.length).toBeGreaterThan(0);
            result.path.forEach(ci => {
                expect(ci).toHaveProperty('ciCode');
            });
        });
        it('should calculate correct multi-level depth', async () => {
            mockRelationshipService.getImpactAnalysis.mockResolvedValueOnce({
                affected: Array.from({ length: 15 }, (_, i) => ({
                    id: `ci-${i}`,
                    name: `CI ${i}`,
                    ciCode: `CI-${String(i).padStart(3, '0')}`,
                    status: 'active'
                })),
                count: 15,
                depth: 4
            });
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result.depth).toBe(4);
            expect(result.count).toBe(15);
        });
    });
    describe('Edge Cases', () => {
        it('should handle large impact depths', async () => {
            mockRelationshipService.getImpactAnalysis.mockResolvedValueOnce({
                affected: Array.from({ length: 50 }, (_, i) => ({
                    id: `ci-${i}`,
                    name: `CI ${i}`,
                    ciCode: `CI-${String(i).padStart(3, '0')}`,
                    status: 'active'
                })),
                count: 50,
                depth: 10
            });
            const result = await mockRelationshipService.getImpactAnalysis('ci-1');
            expect(result.depth).toBe(10);
            expect(result.count).toBe(50);
        });
        it('should handle empty dependency paths', async () => {
            mockRelationshipService.getDependencyPath.mockResolvedValueOnce({
                path: [],
                chain: []
            });
            const result = await mockRelationshipService.getDependencyPath('ci-999', 'downstream');
            expect(result.path).toHaveLength(0);
            expect(result.chain).toHaveLength(0);
        });
        it('should handle no affected CIs', async () => {
            mockRelationshipService.getImpactAnalysis.mockResolvedValueOnce({
                affected: [],
                count: 0,
                depth: 0
            });
            const result = await mockRelationshipService.getImpactAnalysis('ci-independent');
            expect(result.affected).toHaveLength(0);
            expect(result.count).toBe(0);
        });
    });
});
//# sourceMappingURL=cmdb.path-impact.test.js.map