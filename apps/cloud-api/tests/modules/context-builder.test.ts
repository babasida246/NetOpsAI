/**
 * Context Builder Tests
 * Tests for NetOpsContextPack building, scope resolution, and digests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockPool } from '../utils.js'
import {
    resolveScope,
    computeConfigDigest,
    computeDeltaDigest,
    generateCacheKey,
    getCachedContextPack,
    setCachedContextPack,
    invalidateContextPackCache,
    type ConfigDigest
} from '../../src/modules/netops/orchestrator/context-builder.js'
import type { OrchestrationScope } from '../../src/modules/netops/orchestrator/types.js'

describe('Context Builder', () => {
    let mockPool: ReturnType<typeof createMockPool>

    beforeEach(() => {
        mockPool = createMockPool()
        invalidateContextPackCache()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Scope Resolver', () => {
        it('should use explicit scope when provided', async () => {
            const scope = await resolveScope(mockPool, {
                intent: 'Update interface descriptions',
                explicitScope: {
                    deviceIds: ['dev-1', 'dev-2'],
                    sites: ['HQ'],
                    vendors: ['cisco']
                }
            })

            expect(scope.deviceIds).toEqual(['dev-1', 'dev-2'])
            expect(scope.sites).toEqual(['HQ'])
            expect(scope.vendors).toEqual(['cisco'])
        })

        it('should extract scope from intent params', async () => {
            const scope = await resolveScope(mockPool, {
                intent: 'Configure VLAN',
                intentParams: {
                    deviceId: 'dev-single',
                    site: 'Branch-A'
                }
            })

            expect(scope.deviceIds).toContain('dev-single')
            expect(scope.sites).toContain('Branch-A')
        })

        it('should merge explicit scope and intent params', async () => {
            const scope = await resolveScope(mockPool, {
                intent: 'Configure routing',
                intentParams: {
                    deviceIds: ['dev-3']
                },
                explicitScope: {
                    deviceIds: ['dev-1', 'dev-2'],
                    vendors: ['cisco']
                }
            })

            expect(scope.deviceIds).toContain('dev-1')
            expect(scope.deviceIds).toContain('dev-2')
            expect(scope.deviceIds).toContain('dev-3')
            expect(scope.vendors).toEqual(['cisco'])
        })

        it('should query devices when filters but no explicit device IDs', async () => {
             (mockPool.query as any).mockResolvedValueOnce({
                rows: [{ id: 'dev-x' }, { id: 'dev-y' }]
            })

            const scope = await resolveScope(mockPool, {
                intent: 'Update all Cisco devices',
                explicitScope: {
                    vendors: ['cisco']
                }
            })

            expect(mockPool.query).toHaveBeenCalled()
            expect(scope.deviceIds).toContain('dev-x')
            expect(scope.deviceIds).toContain('dev-y')
        })
    })

    describe('Config Digest', () => {
        it('should return null for device without config', async () => {
             (mockPool.query as any).mockResolvedValueOnce({ rows: [] })

            const digest = await computeConfigDigest(mockPool, 'dev-no-config')

            expect(digest).toBeNull()
        })

        it('should compute digest for device with normalized config', async () => {
             (mockPool.query as any).mockResolvedValueOnce({
                rows: [{
                    hostname: 'switch-01',
                    vendor: 'cisco',
                    normalized_config: {
                        schemaVersion: 'v1',
                        device: { hostname: 'switch-01', vendor: 'cisco' },
                        interfaces: [{ name: 'Gi0/1' }, { name: 'Gi0/2' }],
                        vlans: [{ id: 10 }, { id: 20 }],
                        routing: { static: [], ospf: [], bgp: [] },
                        security: { acls: [{ name: 'ACL1' }], users: ['admin'], aaa: null },
                        mgmt: { ssh: true, snmp: null, ntp: null, logging: null }
                    }
                }]
            })

            const digest = await computeConfigDigest(mockPool, 'dev-001')

            expect(digest).not.toBeNull()
            expect(digest!.hostname).toBe('switch-01')
            expect(digest!.vendor).toBe('cisco')
            expect(digest!.interfaceCount).toBe(2)
            expect(digest!.vlanCount).toBe(2)
            expect(digest!.aclCount).toBe(1)
            expect(digest!.sections).toContain('interfaces')
            expect(digest!.sections).toContain('vlans')
            expect(digest!.sections).toContain('acls')
            expect(digest!.sections).toContain('users')
            expect(digest!.sections).toContain('ssh')
            expect(digest!.hash).toMatch(/^[a-f0-9]{16}$/)
        })

        it('should handle device with no normalized config', async () => {
             (mockPool.query as any).mockResolvedValueOnce({
                rows: [{
                    hostname: 'router-01',
                    vendor: 'mikrotik',
                    normalized_config: null
                }]
            })

            const digest = await computeConfigDigest(mockPool, 'dev-002')

            expect(digest).not.toBeNull()
            expect(digest!.hash).toBe('no-config')
            expect(digest!.sections).toEqual([])
        })
    })

    describe('Delta Digest', () => {
        const baseBefore: ConfigDigest = {
            deviceId: 'dev-001',
            hostname: 'switch-01',
            vendor: 'cisco',
            sections: ['interfaces', 'vlans'],
            interfaceCount: 10,
            vlanCount: 5,
            aclCount: 0,
            routeCount: 0,
            hash: 'abc123'
        }

        it('should detect no change with same hash', () => {
            const after = { ...baseBefore }
            expect(computeDeltaDigest(baseBefore, after)).toBe('no-change')
        })

        it('should detect new config', () => {
            expect(computeDeltaDigest(null, baseBefore)).toBe('new-config')
        })

        it('should detect removed config', () => {
            expect(computeDeltaDigest(baseBefore, null)).toBe('removed-config')
        })

        it('should detect no change for both null', () => {
            expect(computeDeltaDigest(null, null)).toBe('no-change')
        })

        it('should show interface count changes', () => {
            const after = { ...baseBefore, interfaceCount: 12, hash: 'def456' }
            const delta = computeDeltaDigest(baseBefore, after)
            expect(delta).toContain('interfaces:10→12')
        })

        it('should show added sections', () => {
            const after = { ...baseBefore, sections: ['interfaces', 'vlans', 'acls'], hash: 'ghi789' }
            const delta = computeDeltaDigest(baseBefore, after)
            expect(delta).toContain('+sections:[acls]')
        })

        it('should show removed sections', () => {
            const after = { ...baseBefore, sections: ['interfaces'], hash: 'jkl012' }
            const delta = computeDeltaDigest(baseBefore, after)
            expect(delta).toContain('-sections:[vlans]')
        })

        it('should show modified when only hash changes', () => {
            const after = { ...baseBefore, hash: 'different-hash' }
            expect(computeDeltaDigest(baseBefore, after)).toBe('modified')
        })
    })

    describe('Cache', () => {
        it('should generate consistent cache keys', () => {
            const scope1: OrchestrationScope = {
                deviceIds: ['dev-2', 'dev-1'],
                sites: ['B', 'A'],
                roles: [],
                vendors: [],
                tags: []
            }
            const scope2: OrchestrationScope = {
                deviceIds: ['dev-1', 'dev-2'],
                sites: ['A', 'B'],
                roles: [],
                vendors: [],
                tags: []
            }

            // Keys should be same despite different order
            expect(generateCacheKey(scope1)).toBe(generateCacheKey(scope2))
        })

        it('should generate different cache keys for different scopes', () => {
            const scope1: OrchestrationScope = {
                deviceIds: ['dev-1'],
                sites: [],
                roles: [],
                vendors: [],
                tags: []
            }
            const scope2: OrchestrationScope = {
                deviceIds: ['dev-2'],
                sites: [],
                roles: [],
                vendors: [],
                tags: []
            }

            expect(generateCacheKey(scope1)).not.toBe(generateCacheKey(scope2))
        })

        it('should cache and retrieve context packs', () => {
            const mockPack = {
                version: 'v1' as const,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 300000),
                hash: 'test-hash',
                promptHistory: [],
                changeHistory: [],
                networkSnapshot: {
                    totalDevices: 10,
                    devicesByVendor: {},
                    devicesBySite: {},
                    devicesByRole: {},
                    devicesByStatus: {},
                    recentConfigChanges: 0,
                    activeChanges: 0,
                    pendingApprovals: 0
                },
                devicesContext: [],
                policyContext: [],
                sourceRefs: [],
                tokenEstimates: {
                    total: 1000,
                    promptHistory: 100,
                    changeHistory: 100,
                    networkSnapshot: 100,
                    devicesContext: 500,
                    policyContext: 100,
                    sourceRefs: 100
                }
            }

            setCachedContextPack('test-key', mockPack)
            const retrieved = getCachedContextPack('test-key')

            expect(retrieved).not.toBeNull()
            expect(retrieved!.hash).toBe('test-hash')
        })

        it('should return null for non-existent cache key', () => {
            expect(getCachedContextPack('non-existent')).toBeNull()
        })

        it('should invalidate all cache', () => {
            const mockPack = {
                version: 'v1' as const,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 300000),
                hash: 'test',
                promptHistory: [],
                changeHistory: [],
                networkSnapshot: {} as any,
                devicesContext: [],
                policyContext: [],
                sourceRefs: [],
                tokenEstimates: {} as any
            }

            setCachedContextPack('key1', mockPack)
            setCachedContextPack('key2', mockPack)

            invalidateContextPackCache()

            expect(getCachedContextPack('key1')).toBeNull()
            expect(getCachedContextPack('key2')).toBeNull()
        })
    })
})
