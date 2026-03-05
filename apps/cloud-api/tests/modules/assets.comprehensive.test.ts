import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { assetsRoutes } from '../../src/routes/v1/assets/assets.routes.js'
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js'
import type { AssetRecord } from '@contracts/shared'
import type { AssetService } from '@application/core'

/**
 * Comprehensive Edge Cases and Integration Tests for Assets API
 * Testing scenarios not covered in existing basic tests
 */
describe('assets routes - comprehensive edge cases', () => {
    let app: ReturnType<typeof Fastify>
    let assetService: AssetService
    const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' }
    const viewerHeaders = { 'x-user-id': 'user-2', 'x-user-role': 'viewer' }

    beforeEach(async () => {
        app = Fastify()
        app.addHook('onRequest', requestIdHook)
        app.setErrorHandler(errorHandler)

        assetService = {
            searchAssets: vi.fn(),
            exportAssetsCsvData: vi.fn(),
            createAsset: vi.fn(),
            getAssetDetail: vi.fn(),
            updateAsset: vi.fn(),
            assignAsset: vi.fn(),
            returnAsset: vi.fn(),
            moveAsset: vi.fn(),
            changeStatus: vi.fn(),
            listTimeline: vi.fn()
        } as unknown as AssetService

        await app.register(assetsRoutes, { prefix: '/v1', assetService })
    })

    afterEach(async () => {
        await app.close()
    })

    describe('asset search edge cases', () => {
        it('should handle empty search results', async () => {
            vi.mocked(assetService.searchAssets).mockResolvedValue({
                items: [],
                total: 0,
                page: 1,
                limit: 20
            })

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.data).toEqual([])
            expect(body.meta.total).toBe(0)
        })

        it('should handle multiple filter combinations', async () => {
            vi.mocked(assetService.searchAssets).mockResolvedValue({
                items: [],
                total: 0,
                page: 2,
                limit: 50
            })

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets?status=in_use&categoryId=123e4567-e89b-12d3-a456-426614174000&page=2&limit=50&sort=asset_code_asc',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(200)
            expect(assetService.searchAssets).toHaveBeenCalledWith({
                status: 'in_use',
                categoryId: '123e4567-e89b-12d3-a456-426614174000',
                page: 2,
                limit: 50,
                sort: 'asset_code_asc'
            })
        })

        it('should handle warranty expiring filter', async () => {
            vi.mocked(assetService.searchAssets).mockResolvedValue({
                items: [],
                total: 0,
                page: 1,
                limit: 20
            })

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets?warrantyExpiringDays=30',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(200)
            expect(assetService.searchAssets).toHaveBeenCalledWith({
                warrantyExpiringDays: 30
            })
        })

        it('should handle CSV export with filters', async () => {
            const mockAssets = [{
                assetCode: 'TEST-001',
                status: 'in_use',
                modelName: 'Test Model',
                vendorName: 'Test Vendor',
                locationName: 'Office A',
                serialNo: 'SN123456',
                mgmtIp: '192.168.1.100',
                warrantyEnd: new Date('2025-12-31')
            }]

            vi.mocked(assetService.exportAssetsCsvData).mockResolvedValue(mockAssets)

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets?export=csv&status=in_use',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(200)
            expect(response.headers['content-type']).toBe('text/csv')

            const csvContent = response.body
            expect(csvContent).toContain('asset_code,status,model,vendor,location,serial_no,mgmt_ip,warranty_end')
            expect(csvContent).toContain('TEST-001,in_use,Test Model,Test Vendor,Office A,SN123456,192.168.1.100,2025-12-31')
        })
    })

    describe('asset creation edge cases', () => {
        it('should reject asset creation with invalid UUID for modelId', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: managerHeaders,
                payload: {
                    assetCode: 'TEST-001',
                    modelId: 'invalid-uuid'
                }
            })

            expect(response.statusCode).toBe(422)
        })

        it('should handle asset creation with complete specification', async () => {
            const mockAsset: AssetRecord = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                assetCode: 'COMPLETE-001',
                status: 'in_stock',
                modelId: '123e4567-e89b-12d3-a456-426614174099',
                serialNo: 'SN123456',
                macAddress: '00:11:22:33:44:55',
                mgmtIp: '192.168.1.100',
                hostname: 'test-host',
                vlanId: 100,
                switchName: 'SW-001',
                switchPort: 'Gi1/0/1',
                locationId: '123e4567-e89b-12d3-a456-426614174088',
                purchaseDate: new Date('2024-01-15'),
                warrantyEnd: new Date('2027-01-15'),
                vendorId: '123e4567-e89b-12d3-a456-426614174077',
                notes: 'Test asset with complete specs',
                createdAt: new Date(),
                updatedAt: new Date()
            }

            vi.mocked(assetService.createAsset).mockResolvedValue(mockAsset)

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: managerHeaders,
                payload: {
                    assetCode: 'COMPLETE-001',
                    modelId: '123e4567-e89b-12d3-a456-426614174099',
                    serialNo: 'SN123456',
                    macAddress: '00:11:22:33:44:55',
                    mgmtIp: '192.168.1.100',
                    hostname: 'test-host',
                    vlanId: 100,
                    switchName: 'SW-001',
                    switchPort: 'Gi1/0/1',
                    locationId: '123e4567-e89b-12d3-a456-426614174088',
                    status: 'in_stock',
                    purchaseDate: '2024-01-15',
                    warrantyEnd: '2027-01-15',
                    vendorId: '123e4567-e89b-12d3-a456-426614174077',
                    notes: 'Test asset with complete specs',
                    spec: {
                        cpu: 'Intel i7',
                        ram: '16GB',
                        storage: '512GB SSD'
                    }
                }
            })

            expect(response.statusCode).toBe(201)
            expect(assetService.createAsset).toHaveBeenCalledWith(
                expect.objectContaining({
                    assetCode: 'COMPLETE-001',
                    modelId: '123e4567-e89b-12d3-a456-426614174099',
                    spec: {
                        cpu: 'Intel i7',
                        ram: '16GB',
                        storage: '512GB SSD'
                    }
                }),
                expect.objectContaining({ userId: 'user-1' })
            )
        })

        it('should handle asset creation with minimal required fields', async () => {
            const mockAsset: AssetRecord = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                assetCode: 'MIN-001',
                status: 'in_stock',
                modelId: '123e4567-e89b-12d3-a456-426614174099',
                serialNo: null,
                macAddress: null,
                mgmtIp: null,
                hostname: null,
                vlanId: null,
                switchName: null,
                switchPort: null,
                locationId: null,
                purchaseDate: null,
                warrantyEnd: null,
                vendorId: null,
                notes: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            vi.mocked(assetService.createAsset).mockResolvedValue(mockAsset)

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: managerHeaders,
                payload: {
                    assetCode: 'MIN-001',
                    modelId: '123e4567-e89b-12d3-a456-426614174099'
                }
            })

            expect(response.statusCode).toBe(201)
        })
    })

    describe('asset status transitions', () => {
        const mockAsset: AssetRecord = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            assetCode: 'STATUS-001',
            status: 'in_use',
            modelId: '123e4567-e89b-12d3-a456-426614174099',
            serialNo: null,
            macAddress: null,
            mgmtIp: null,
            hostname: null,
            vlanId: null,
            switchName: null,
            switchPort: null,
            locationId: null,
            purchaseDate: null,
            warrantyEnd: null,
            vendorId: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        it('should handle status change from in_use to in_repair', async () => {
            vi.mocked(assetService.changeStatus).mockResolvedValue({
                ...mockAsset,
                status: 'in_repair'
            })

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/status',
                headers: managerHeaders,
                payload: {
                    status: 'in_repair',
                    note: 'Device sent for maintenance'
                }
            })

            expect(response.statusCode).toBe(200)
            expect(assetService.changeStatus).toHaveBeenCalledWith(
                '123e4567-e89b-12d3-a456-426614174000',
                'in_repair',
                expect.objectContaining({
                    correlationId: expect.any(String),
                    userId: 'user-1'
                })
            )
        })

        it('should handle multiple status transitions', async () => {
            const statuses = ['in_stock', 'in_use', 'in_repair', 'retired']

            for (const status of statuses) {
                vi.mocked(assetService.changeStatus).mockResolvedValue({
                    ...mockAsset,
                    status: status as any
                })

                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/status',
                    headers: managerHeaders,
                    payload: { status }
                })

                expect(response.statusCode).toBe(200) // Status change succeeds
            }
        })
    })

    describe('asset assignment workflows', () => {
        const mockAsset: AssetRecord = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            assetCode: 'ASSIGN-001',
            status: 'in_stock',
            modelId: '123e4567-e89b-12d3-a456-426614174099',
            serialNo: null,
            macAddress: null,
            mgmtIp: null,
            hostname: null,
            vlanId: null,
            switchName: null,
            switchPort: null,
            locationId: null,
            purchaseDate: null,
            warrantyEnd: null,
            vendorId: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        it('should handle asset assignment to person', async () => {
            vi.mocked(assetService.assignAsset).mockResolvedValue({
                asset: { ...mockAsset, status: 'in_use' },
                assignment: {
                    id: 'assign-1',
                    assetId: mockAsset.id,
                    assigneeType: 'person',
                    assigneeId: 'user-123',
                    assigneeName: 'John Doe',
                    assignedAt: new Date(),
                    returnedAt: null,
                    note: 'Laptop for development work'
                }
            })

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/assign',
                headers: managerHeaders,
                payload: {
                    assigneeType: 'person',
                    assigneeId: 'user-123',
                    assigneeName: 'John Doe',
                    note: 'Laptop for development work'
                }
            })

            expect(response.statusCode).toBe(200)
        })

        it('should handle asset assignment to location', async () => {
            vi.mocked(assetService.assignAsset).mockResolvedValue({
                asset: { ...mockAsset, status: 'in_use' },
                assignment: {
                    id: 'assign-2',
                    assetId: mockAsset.id,
                    assigneeType: 'location',
                    assigneeId: 'loc-123',
                    assigneeName: 'Conference Room A',
                    assignedAt: new Date(),
                    returnedAt: null,
                    note: null
                }
            })

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/assign',
                headers: managerHeaders,
                payload: {
                    assigneeType: 'location',
                    assigneeId: 'loc-123',
                    assigneeName: 'Conference Room A'
                }
            })

            expect(response.statusCode).toBe(422) // Invalid assignee type
        })

        it('should handle asset return', async () => {
            vi.mocked(assetService.returnAsset).mockResolvedValue({
                asset: { ...mockAsset, status: 'in_stock' },
                assignment: {
                    id: 'assign-1',
                    assetId: mockAsset.id,
                    assigneeType: 'person',
                    assigneeId: 'user-123',
                    assigneeName: 'John Doe',
                    assignedAt: new Date('2024-01-01'),
                    returnedAt: new Date(),
                    note: 'Returned in good condition'
                }
            })

            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/return',
                headers: managerHeaders,
                payload: {
                    note: 'Returned in good condition'
                }
            })

            expect(response.statusCode).toBe(200)
        })
    })

    describe('error handling and validation', () => {
        it('should handle service errors gracefully', async () => {
            vi.mocked(assetService.searchAssets).mockRejectedValue(new Error('Database connection failed'))

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(500)
        })

        it('should validate asset code format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: managerHeaders,
                payload: {
                    assetCode: '',  // Empty asset code
                    modelId: '123e4567-e89b-12d3-a456-426614174099'
                }
            })

            expect(response.statusCode).toBe(422)
        })

        it('should handle unauthorized access', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: viewerHeaders,  // Viewer trying to create asset
                payload: {
                    assetCode: 'TEST-001',
                    modelId: '123e4567-e89b-12d3-a456-426614174099'
                }
            })

            expect(response.statusCode).toBe(403)
        })

        it('should validate date formats', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/assets',
                headers: managerHeaders,
                payload: {
                    assetCode: 'TEST-001',
                    modelId: '123e4567-e89b-12d3-a456-426614174099',
                    purchaseDate: 'invalid-date'
                }
            })

            expect(response.statusCode).toBe(422)
        })
    })

    describe('timeline and audit trail', () => {
        it('should retrieve asset timeline with pagination', async () => {
            vi.mocked(assetService.listTimeline).mockResolvedValue({
                items: [
                    {
                        id: 'timeline-1',
                        assetId: '123e4567-e89b-12d3-a456-426614174000',
                        action: 'created',
                        userId: 'user-1',
                        userName: 'Admin User',
                        timestamp: new Date(),
                        details: { assetCode: 'TIMELINE-001' }
                    }
                ],
                page: 1,
                limit: 20
            })

            const response = await app.inject({
                method: 'GET',
                url: '/v1/assets/123e4567-e89b-12d3-a456-426614174000/timeline?page=1&limit=20',
                headers: viewerHeaders
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.data).toHaveLength(1)
            expect(body.data[0].action).toBe('created')
        })
    })
})