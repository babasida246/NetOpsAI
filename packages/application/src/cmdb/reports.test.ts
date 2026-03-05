import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CiInventoryReportService } from './CiInventoryReportService.js'
import type { CiRecord } from '@contracts/shared'

describe('CMDB Reports - CI Inventory Report', () => {
    let mockCiRepo: any
    let mockRelRepo: any
    let mockRelTypeRepo: any
    let service: CiInventoryReportService

    const mockCis: CiRecord[] = [
        {
            id: 'ci-1',
            ciCode: 'APP-001',
            name: 'Web Application',
            typeId: 'type-1',
            status: 'active',
            environment: 'prod',
            assetId: null,
            locationId: null,
            ownerTeam: null,
            notes: null,
            createdAt: new Date('2025-12-01'),
            updatedAt: new Date('2026-01-20')
        },
        {
            id: 'ci-2',
            ciCode: 'DB-001',
            name: 'Database Server',
            typeId: 'type-2',
            status: 'active',
            environment: 'prod',
            assetId: null,
            locationId: null,
            ownerTeam: null,
            notes: null,
            createdAt: new Date('2025-11-01'),
            updatedAt: new Date('2026-01-20')
        },
        {
            id: 'ci-3',
            ciCode: 'CACHE-001',
            name: 'Cache Server',
            typeId: 'type-1',
            status: 'maintenance',
            environment: 'uat',
            assetId: null,
            locationId: null,
            ownerTeam: null,
            notes: null,
            createdAt: new Date('2026-01-10'),
            updatedAt: new Date('2026-01-20')
        }
    ]

    beforeEach(() => {
        mockCiRepo = {
            list: vi.fn().mockResolvedValue({
                items: mockCis,
                total: mockCis.length,
                page: 1,
                limit: 100
            })
        }
        mockRelRepo = {
            list: vi.fn().mockResolvedValue([
                {
                    id: 'rel-1',
                    fromCiId: 'ci-1',
                    toCiId: 'ci-2',
                    relTypeId: 'depends_on',
                    status: 'active',
                    sinceDate: null,
                    note: null,
                    createdAt: new Date()
                },
                {
                    id: 'rel-2',
                    fromCiId: 'ci-2',
                    toCiId: 'ci-3',
                    relTypeId: 'hosts',
                    status: 'active',
                    sinceDate: null,
                    note: null,
                    createdAt: new Date()
                }
            ])
        }
        mockRelTypeRepo = {}

        service = new CiInventoryReportService(mockCiRepo, mockRelRepo, mockRelTypeRepo)
    })

    describe('generateCiInventoryReport', () => {
        it('should generate complete CI inventory report', async () => {
            const report = await service.generateCiInventoryReport()

            expect(report).toBeDefined()
            expect(report.totalCiCount).toBe(3)
            expect(report.generatedAt).toBeDefined()
            expect(report.countByType).toHaveLength(2)
            expect(report.countByStatus).toHaveLength(2)
        })

        it('should count CIs by type correctly', async () => {
            const report = await service.generateCiInventoryReport()

            const type1 = report.countByType.find(t => t.typeId === 'type-1')
            const type2 = report.countByType.find(t => t.typeId === 'type-2')

            expect(type1?.count).toBe(2)
            expect(type2?.count).toBe(1)
        })

        it('should count CIs by status correctly', async () => {
            const report = await service.generateCiInventoryReport()

            const active = report.countByStatus.find(s => s.status === 'active')
            const maintenance = report.countByStatus.find(s => s.status === 'maintenance')

            expect(active?.count).toBe(2)
            expect(maintenance?.count).toBe(1)
        })

        it('should count CIs by environment', async () => {
            const report = await service.generateCiInventoryReport()

            const prod = report.countByEnvironment.find(e => e.environment === 'prod')
            const uat = report.countByEnvironment.find(e => e.environment === 'uat')

            expect(prod?.count).toBe(2)
            expect(uat?.count).toBe(1)
        })

        it('should identify orphaned CIs', async () => {
            const orphanCi: CiRecord = {
                id: 'ci-4',
                ciCode: 'ORPHAN-001',
                name: 'Orphaned CI',
                typeId: 'type-1',
                status: 'retired',
                environment: 'dev',
                assetId: null,
                locationId: null,
                ownerTeam: null,
                notes: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            mockCiRepo.list.mockResolvedValueOnce({
                items: [...mockCis, orphanCi],
                total: mockCis.length + 1,
                page: 1,
                limit: 100
            })

            service = new CiInventoryReportService(mockCiRepo, mockRelRepo, mockRelTypeRepo)
            const report = await service.generateCiInventoryReport()

            expect(report.orphanedCiCount).toBeGreaterThan(0)
            expect(report.orphanedCis.length).toBeGreaterThan(0)
        })

        it('should calculate age distribution', async () => {
            const report = await service.generateCiInventoryReport()

            expect(report.ageDistribution).toBeDefined()
            expect(report.ageDistribution.length).toBeGreaterThan(0)
            expect(report.ageDistribution[0]).toHaveProperty('rangeLabel')
            expect(report.ageDistribution[0]).toHaveProperty('minDays')
            expect(report.ageDistribution[0]).toHaveProperty('maxDays')
            expect(report.ageDistribution[0]).toHaveProperty('count')
        })

        it('should identify compliance issues', async () => {
            mockCiRepo.list.mockResolvedValueOnce({
                items: [{
                    id: 'ci-5',
                    ciCode: 'BAD-001',
                    name: 'Non-compliant CI',
                    typeId: 'type-1',
                    status: 'active',
                    environment: '' as any, // Missing environment
                    assetId: null,
                    locationId: null,
                    ownerTeam: null,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }],
                total: 1,
                page: 1,
                limit: 100
            })

            service = new CiInventoryReportService(mockCiRepo, mockRelRepo, mockRelTypeRepo)
            const report = await service.generateCiInventoryReport()

            expect(report.complianceIssues).toBeDefined()
            expect(report.complianceIssues.length).toBeGreaterThan(0)
        })
    })
})
