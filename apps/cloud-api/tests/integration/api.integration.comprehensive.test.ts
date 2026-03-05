import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { build } from '../../src/app.js'
import type { PgClient } from '@infra/postgres'

/**
 * Integration Tests for MCP Server API
 * 
 * These tests run against a real application instance with database
 * to test full request/response cycles and data persistence.
 */
describe('MCP Server API Integration Tests', () => {
    let app: FastifyInstance
    let pgClient: PgClient

    beforeAll(async () => {
        // Build the full fastify app with all plugins and routes
        app = await build({
            logger: false,
            trustProxy: true
        })

        // Get database client for setup/teardown
        pgClient = app.diContainer.resolve('pgClient')

        // Setup test data
        await setupTestData()
    })

    afterAll(async () => {
        await cleanupTestData()
        await app.close()
    })

    beforeEach(async () => {
        // Reset test data state before each test
        await resetTestState()
    })

    async function setupTestData() {
        // Create test categories, models, locations, etc.
        await pgClient.query(`
            INSERT INTO categories (id, name, description) 
            VALUES ('test-cat-1', 'Test Category', 'Integration test category')
            ON CONFLICT (id) DO NOTHING
        `)

        await pgClient.query(`
            INSERT INTO models (id, name, category_id, vendor_id) 
            VALUES ('test-model-1', 'Test Model', 'test-cat-1', NULL)
            ON CONFLICT (id) DO NOTHING
        `)

        await pgClient.query(`
            INSERT INTO locations (id, name, type, parent_id) 
            VALUES ('test-loc-1', 'Test Location', 'office', NULL)
            ON CONFLICT (id) DO NOTHING
        `)
    }

    async function cleanupTestData() {
        // Clean up test data
        const tables = ['assets', 'asset_assignments', 'models', 'categories', 'locations']
        for (const table of tables) {
            await pgClient.query(`DELETE FROM ${table} WHERE id LIKE 'test-%'`)
        }
    }

    async function resetTestState() {
        // Reset dynamic test data but keep master data
        await pgClient.query(`DELETE FROM assets WHERE asset_code LIKE 'INT-TEST-%'`)
        await pgClient.query(`DELETE FROM asset_assignments WHERE asset_id IN (
            SELECT id FROM assets WHERE asset_code LIKE 'INT-TEST-%'
        )`)
    }

    describe('Asset Lifecycle Integration', () => {
        it('should handle complete asset lifecycle flow', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // 1. Create asset
            const createResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'INT-TEST-001',
                    modelId: 'test-model-1',
                    serialNo: 'SN123456789',
                    locationId: 'test-loc-1',
                    status: 'in_stock',
                    notes: 'Integration test asset'
                }
            })

            expect(createResponse.statusCode).toBe(201)
            const createdAsset = createResponse.json().data
            expect(createdAsset.assetCode).toBe('INT-TEST-001')

            // 2. Get asset details
            const detailResponse = await app.inject({
                method: 'GET',
                url: `/v1/assets/${createdAsset.id}`,
                headers: adminHeaders
            })

            expect(detailResponse.statusCode).toBe(200)
            const assetDetail = detailResponse.json().data
            expect(assetDetail.asset.assetCode).toBe('INT-TEST-001')

            // 3. Update asset
            const updateResponse = await app.inject({
                method: 'PUT',
                url: `/v1/assets/${createdAsset.id}`,
                headers: adminHeaders,
                payload: {
                    assetCode: 'INT-TEST-001',
                    modelId: 'test-model-1',
                    serialNo: 'SN123456789-UPDATED',
                    notes: 'Updated integration test asset'
                }
            })

            expect(updateResponse.statusCode).toBe(200)
            const updatedAsset = updateResponse.json().data
            expect(updatedAsset.serialNo).toBe('SN123456789-UPDATED')

            // 4. Assign asset
            const assignResponse = await app.inject({
                method: 'POST',
                url: `/v1/assets/${createdAsset.id}/assign`,
                headers: adminHeaders,
                payload: {
                    assigneeType: 'person',
                    assigneeId: 'test-user-1',
                    assigneeName: 'Test User 1',
                    note: 'Integration test assignment'
                }
            })

            expect(assignResponse.statusCode).toBe(200)
            const assignment = assignResponse.json().data
            expect(assignment.asset.status).toBe('in_use')

            // 5. Check timeline
            const timelineResponse = await app.inject({
                method: 'GET',
                url: `/v1/assets/${createdAsset.id}/timeline`,
                headers: adminHeaders
            })

            expect(timelineResponse.statusCode).toBe(200)
            const timeline = timelineResponse.json().data
            expect(timeline.length).toBeGreaterThan(0)

            // 6. Return asset
            const returnResponse = await app.inject({
                method: 'POST',
                url: `/v1/assets/${createdAsset.id}/return`,
                headers: adminHeaders,
                payload: {
                    note: 'Integration test return'
                }
            })

            expect(returnResponse.statusCode).toBe(200)
            const returnedAsset = returnResponse.json().data
            expect(returnedAsset.asset.status).toBe('in_stock')
        })

        it('should handle bulk asset operations', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Create multiple assets
            const assetCodes = ['BULK-001', 'BULK-002', 'BULK-003']
            const createdAssets = []

            for (const code of assetCodes) {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/assets',
                    headers: adminHeaders,
                    payload: {
                        assetCode: code,
                        modelId: 'test-model-1',
                        status: 'in_stock'
                    }
                })
                expect(response.statusCode).toBe(201)
                createdAssets.push(response.json().data)
            }

            // Search for created assets
            const searchResponse = await app.inject({
                method: 'GET',
                url: '/v1/assets?query=BULK',
                headers: adminHeaders
            })

            expect(searchResponse.statusCode).toBe(200)
            const searchResults = searchResponse.json().data
            expect(searchResults.length).toBe(3)

            // Export as CSV
            const csvResponse = await app.inject({
                method: 'GET',
                url: '/v1/assets?query=BULK&export=csv',
                headers: adminHeaders
            })

            expect(csvResponse.statusCode).toBe(200)
            expect(csvResponse.headers['content-type']).toBe('text/csv; charset=utf-8')

            const csvContent = csvResponse.body
            assetCodes.forEach(code => {
                expect(csvContent).toContain(code)
            })
        })
    })

    describe('CMDB Integration', () => {
        it('should handle asset relationships and topology', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Create parent and child assets
            const serverResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'SERVER-001',
                    modelId: 'test-model-1',
                    status: 'in_use'
                }
            })

            const vmResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'VM-001',
                    modelId: 'test-model-1',
                    status: 'in_use'
                }
            })

            const server = serverResponse.json().data
            const vm = vmResponse.json().data

            // Create relationship
            const relationshipResponse = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationships',
                headers: adminHeaders,
                payload: {
                    sourceId: vm.id,
                    targetId: server.id,
                    type: 'runs_on',
                    properties: { environment: 'production' }
                }
            })

            expect(relationshipResponse.statusCode).toBe(201)

            // Query topology
            const topologyResponse = await app.inject({
                method: 'GET',
                url: `/v1/topology/assets/${server.id}?depth=2`,
                headers: adminHeaders
            })

            expect(topologyResponse.statusCode).toBe(200)
            const topology = topologyResponse.json().data
            expect(topology.nodes).toHaveLength(2)
            expect(topology.edges).toHaveLength(1)
        })
    })

    describe('Workflow Integration', () => {
        it('should handle maintenance workflow', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Create asset
            const assetResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'MAINT-001',
                    modelId: 'test-model-1',
                    status: 'in_use'
                }
            })

            const asset = assetResponse.json().data

            // Open maintenance request
            const maintenanceResponse = await app.inject({
                method: 'POST',
                url: '/v1/maintenance',
                headers: adminHeaders,
                payload: {
                    assetId: asset.id,
                    title: 'Routine Maintenance',
                    description: 'Monthly hardware check',
                    severity: 'medium',
                    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
            })

            expect(maintenanceResponse.statusCode).toBe(201)
            const maintenance = maintenanceResponse.json().data

            // Update maintenance status
            const updateResponse = await app.inject({
                method: 'PATCH',
                url: `/v1/maintenance/${maintenance.id}`,
                headers: adminHeaders,
                payload: {
                    status: 'in_progress',
                    notes: 'Started maintenance work'
                }
            })

            expect(updateResponse.statusCode).toBe(200)

            // Complete maintenance
            const completeResponse = await app.inject({
                method: 'PATCH',
                url: `/v1/maintenance/${maintenance.id}`,
                headers: adminHeaders,
                payload: {
                    status: 'completed',
                    notes: 'Maintenance completed successfully',
                    completedAt: new Date().toISOString()
                }
            })

            expect(completeResponse.statusCode).toBe(200)
        })
    })

    describe('Performance and Load Testing', () => {
        it('should handle concurrent asset creation', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            const concurrentRequests = 10
            const promises = []

            for (let i = 0; i < concurrentRequests; i++) {
                promises.push(
                    app.inject({
                        method: 'POST',
                        url: '/v1/assets',
                        headers: adminHeaders,
                        payload: {
                            assetCode: `CONCURRENT-${i.toString().padStart(3, '0')}`,
                            modelId: 'test-model-1',
                            status: 'in_stock'
                        }
                    })
                )
            }

            const results = await Promise.all(promises)

            // All requests should succeed
            results.forEach(response => {
                expect(response.statusCode).toBe(201)
            })

            // Verify all assets were created
            const searchResponse = await app.inject({
                method: 'GET',
                url: '/v1/assets?query=CONCURRENT&limit=20',
                headers: adminHeaders
            })

            expect(searchResponse.statusCode).toBe(200)
            const searchResults = searchResponse.json()
            expect(searchResults.data.length).toBe(concurrentRequests)
        })

        it('should handle large dataset pagination', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Search with different page sizes
            const pageSizes = [5, 10, 20, 50, 100]

            for (const pageSize of pageSizes) {
                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/assets?limit=${pageSize}&page=1`,
                    headers: adminHeaders
                })

                expect(response.statusCode).toBe(200)
                const result = response.json()
                expect(result.data.length).toBeLessThanOrEqual(pageSize)
                expect(result.meta.limit).toBe(pageSize)
            }
        })
    })

    describe('Data Consistency and Validation', () => {
        it('should maintain referential integrity', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Try to create asset with non-existent model
            const invalidResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'INVALID-001',
                    modelId: '00000000-0000-0000-0000-000000000000'  // Non-existent model
                }
            })

            expect(invalidResponse.statusCode).toBe(400)
        })

        it('should enforce unique constraints', async () => {
            const adminHeaders = {
                'x-user-id': 'test-admin',
                'x-user-role': 'it_asset_manager'
            }

            // Create first asset
            const firstResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'UNIQUE-001',
                    modelId: 'test-model-1'
                }
            })

            expect(firstResponse.statusCode).toBe(201)

            // Try to create asset with same asset code
            const duplicateResponse = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: adminHeaders,
                payload: {
                    assetCode: 'UNIQUE-001',  // Duplicate asset code
                    modelId: 'test-model-1'
                }
            })

            expect(duplicateResponse.statusCode).toBe(409)  // Conflict
        })
    })
})