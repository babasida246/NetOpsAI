import type { CiRecord, ICiRepo, IRelTypeRepo, IRelRepo } from '@contracts/shared'

export interface CiCountByType {
    typeId: string
    typeName: string
    count: number
}

export interface CiCountByStatus {
    status: string
    count: number
}

export interface CiCountByEnvironment {
    environment: string
    count: number
}

export interface CiAgeDistribution {
    rangeLabel: string
    minDays: number
    maxDays: number
    count: number
}

export interface ComplianceIssue {
    ciId: string
    ciCode: string
    ciName: string
    ciTypeId: string
    missingAttributes: string[]
}

export interface CiInventoryReport {
    generatedAt: Date
    totalCiCount: number
    countByType: CiCountByType[]
    countByStatus: CiCountByStatus[]
    countByEnvironment: CiCountByEnvironment[]
    orphanedCiCount: number
    orphanedCis: CiRecord[]
    ageDistribution: CiAgeDistribution[]
    complianceIssues: ComplianceIssue[]
}

export class CiInventoryReportService {
    constructor(
        private ciRepo: ICiRepo,
        private relRepo: IRelRepo,
        private relTypeRepo: IRelTypeRepo
    ) { }

    async generateCiInventoryReport(): Promise<CiInventoryReport> {
        const allCisPage = await this.ciRepo.list({ limit: 10000 })
        const allCis = allCisPage.items
        const allRelationships = await this.relRepo.list()

        // Get all CI types for name lookup
        const ciTypeNames = new Map<string, string>()

        // Count by type
        const countByType = this.groupBy(allCis, 'typeId').map(([typeId, cis]) => ({
            typeId,
            typeName: ciTypeNames.get(typeId) || `Type-${typeId}`,
            count: cis.length
        }))

        // Count by status
        const countByStatus = this.groupBy(allCis, 'status').map(([status, cis]) => ({
            status,
            count: cis.length
        }))

        // Count by environment
        const environmentCounts = new Map<string, number>()
        allCis.forEach((ci: CiRecord) => {
            const env = ci.environment || 'unknown'
            environmentCounts.set(env, (environmentCounts.get(env) || 0) + 1)
        })
        const countByEnvironment = Array.from(environmentCounts.entries()).map(([env, count]) => ({
            environment: env,
            count
        }))

        // Find orphaned CIs (no relationships)
        const relatedCiIds = new Set<string>()
        allRelationships.forEach(rel => {
            relatedCiIds.add(rel.fromCiId)
            relatedCiIds.add(rel.toCiId)
        })
        const orphanedCis = allCis.filter((ci: CiRecord) => !relatedCiIds.has(ci.id))

        // Age distribution
        const now = new Date()
        const ageDistribution = this.calculateAgeDistribution(allCis, now)

        // Compliance issues (missing required attributes)
        const complianceIssues = this.findComplianceIssues(allCis)

        return {
            generatedAt: now,
            totalCiCount: allCis.length,
            countByType,
            countByStatus,
            countByEnvironment,
            orphanedCiCount: orphanedCis.length,
            orphanedCis,
            ageDistribution,
            complianceIssues
        }
    }

    private groupBy<T>(items: T[], key: keyof T): Array<[string, T[]]> {
        const grouped = new Map<string, T[]>()
        items.forEach(item => {
            const k = String(item[key])
            if (!grouped.has(k)) {
                grouped.set(k, [])
            }
            grouped.get(k)!.push(item)
        })
        return Array.from(grouped.entries())
    }

    private calculateAgeDistribution(cis: CiRecord[], now: Date): CiAgeDistribution[] {
        const ranges = [
            { label: 'Last 7 days', minDays: 0, maxDays: 7 },
            { label: '8-30 days', minDays: 8, maxDays: 30 },
            { label: '1-3 months', minDays: 31, maxDays: 90 },
            { label: '3-6 months', minDays: 91, maxDays: 180 },
            { label: '6-12 months', minDays: 181, maxDays: 365 },
            { label: 'Over 1 year', minDays: 366, maxDays: Infinity }
        ]

        return ranges.map(range => {
            const count = cis.filter(ci => {
                const ageDays = Math.floor((now.getTime() - new Date(ci.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                return ageDays >= range.minDays && ageDays <= range.maxDays
            }).length
            return {
                rangeLabel: range.label,
                minDays: range.minDays,
                maxDays: range.maxDays,
                count
            }
        })
    }

    private findComplianceIssues(cis: CiRecord[]): ComplianceIssue[] {
        const issues: ComplianceIssue[] = []
        const requiredAttributes = ['status', 'environment'] // Define required attributes

        cis.forEach(ci => {
            const missing: string[] = []
            requiredAttributes.forEach(attr => {
                if (attr === 'environment' && !ci.environment) {
                    missing.push(attr)
                } else if (attr === 'status' && !ci.status) {
                    missing.push(attr)
                }
            })
            if (missing.length > 0) {
                issues.push({
                    ciId: ci.id,
                    ciCode: ci.ciCode,
                    ciName: ci.name,
                    ciTypeId: ci.typeId,
                    missingAttributes: missing
                })
            }
        })
        return issues
    }
}
