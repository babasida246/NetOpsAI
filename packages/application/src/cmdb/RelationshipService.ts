import { AppError, type RelationshipDirection } from '@domain/core'
import type {
    CiRecord,
    ICiRepo,
    IOpsEventRepo,
    IRelRepo,
    IRelTypeRepo,
    RelationshipRecord,
    RelationshipTypeRecord
} from '@contracts/shared'
import type { CmdbContext } from './SchemaService.js'

export interface CiGraph {
    nodes: CiRecord[]
    edges: RelationshipRecord[]
}

export interface GraphProvider {
    getGraph(ciId: string, depth: number, direction: RelationshipDirection): Promise<CiGraph>
}

export class RelationshipService implements GraphProvider {
    constructor(
        private relTypes: IRelTypeRepo,
        private rels: IRelRepo,
        private cis: ICiRepo,
        private opsEvents?: IOpsEventRepo
    ) { }

    async listRelationshipTypes(): Promise<RelationshipTypeRecord[]> {
        return await this.relTypes.list()
    }

    async createRelationshipType(
        input: { code: string; name: string; reverseName?: string | null; allowedFromTypeId?: string | null; allowedToTypeId?: string | null },
        ctx: CmdbContext
    ): Promise<RelationshipTypeRecord> {
        const created = await this.relTypes.create(input)
        await this.appendEvent('REL_TYPE_CREATED', created.id, { code: created.code }, ctx)
        return created
    }

    async updateRelationshipType(
        id: string,
        patch: Partial<{
            code: string
            name: string
            reverseName: string | null
            allowedFromTypeId: string | null
            allowedToTypeId: string | null
        }>,
        ctx: CmdbContext
    ): Promise<RelationshipTypeRecord> {
        const existing = await this.relTypes.getById(id)
        if (!existing) throw AppError.notFound('Relationship type not found')
        const updated = await this.relTypes.update(id, patch)
        if (!updated) throw AppError.notFound('Relationship type not found')
        await this.appendEvent('REL_TYPE_UPDATED', updated.id, { code: updated.code }, ctx)
        return updated
    }

    async deleteRelationshipType(id: string, ctx: CmdbContext): Promise<void> {
        const existing = await this.relTypes.getById(id)
        if (!existing) throw AppError.notFound('Relationship type not found')
        const deleted = await this.relTypes.delete(id)
        if (!deleted) throw AppError.notFound('Relationship type not found')
        await this.appendEvent('REL_TYPE_DELETED', existing.id, { code: existing.code }, ctx)
    }

    async createRelationship(
        input: { relTypeId: string; fromCiId: string; toCiId: string; sinceDate?: string | null; note?: string | null },
        ctx: CmdbContext
    ): Promise<RelationshipRecord> {
        if (input.fromCiId === input.toCiId) {
            throw AppError.badRequest('Self-loop relationships are not allowed')
        }
        const relType = await this.getRelType(input.relTypeId)
        const from = await this.getCi(input.fromCiId, 'Source CI not found')
        const to = await this.getCi(input.toCiId, 'Target CI not found')
        this.assertTypeAllowed(relType, from, to)
        const created = await this.rels.create(input)
        await this.appendEvent('REL_CREATED', created.id, { relTypeId: created.relTypeId }, ctx)
        return created
    }

    async retireRelationship(id: string, ctx: CmdbContext): Promise<RelationshipRecord> {
        const updated = await this.rels.retire(id)
        if (!updated) throw AppError.notFound('Relationship not found')
        await this.appendEvent('REL_RETIRED', updated.id, {}, ctx)
        return updated
    }

    async getGraph(ciId: string, depth = 1, direction: RelationshipDirection = 'both'): Promise<CiGraph> {
        const start = await this.cis.getById(ciId)
        if (!start) throw AppError.notFound('CI not found')
        const nodes = new Map<string, CiRecord>([[start.id, start]])
        const edges = new Map<string, RelationshipRecord>()
        const visited = new Set<string>([start.id])
        let frontier = [start.id]

        for (let level = 0; level < depth; level += 1) {
            const next: string[] = []
            for (const currentId of frontier) {
                const relationships = await this.rels.listByCi(currentId)
                for (const rel of relationships) {
                    const neighbor = this.resolveNeighbor(rel, currentId, direction)
                    if (!neighbor) continue
                    edges.set(rel.id, rel)
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor)
                        const node = await this.cis.getById(neighbor)
                        if (node) nodes.set(node.id, node)
                        next.push(neighbor)
                    }
                }
            }
            frontier = next
            if (frontier.length === 0) break
        }

        return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) }
    }

    async getFullGraph(depth = 2, direction: RelationshipDirection = 'both'): Promise<CiGraph> {
        // Get all active CIs
        const allCisPage = await this.cis.list({ status: 'active', limit: 1000 })
        const allCis = allCisPage.items

        // Get all relationships between them
        const allRels = await this.rels.list()

        // Filter relationships based on direction if needed
        const edges = direction === 'both' ? allRels : allRels.filter(rel => {
            // For directed graphs, could filter by relationship type direction
            // For now, include all
            return true
        })

        // Create node map from CIs that have relationships
        const ciIds = new Set<string>()
        edges.forEach(rel => {
            ciIds.add(rel.fromCiId)
            ciIds.add(rel.toCiId)
        })

        const nodes = allCis.filter((ci: CiRecord) => ciIds.has(ci.id))

        return { nodes, edges }
    }

    async getDependencyPath(ciId: string, direction: 'upstream' | 'downstream' = 'downstream'): Promise<{ path: CiRecord[]; chain: string[] }> {
        const start = await this.cis.getById(ciId)
        if (!start) throw AppError.notFound('CI not found')

        const path: CiRecord[] = [start]
        const chain: string[] = [start.ciCode]
        const visited = new Set<string>([start.id])
        let frontier = [start.id]
        let depth = 0
        const maxDepth = 5

        while (frontier.length > 0 && depth < maxDepth) {
            const next: string[] = []
            for (const currentId of frontier) {
                const relationships = await this.rels.listByCi(currentId)
                for (const rel of relationships) {
                    const neighbor = this.resolveNeighbor(rel, currentId, direction === 'downstream' ? 'downstream' : 'upstream')
                    if (!neighbor || visited.has(neighbor)) continue

                    visited.add(neighbor)
                    const node = await this.cis.getById(neighbor)
                    if (node) {
                        path.push(node)
                        chain.push(node.ciCode)
                        next.push(neighbor)
                        break // Follow first path only for chain visualization
                    }
                }
            }
            frontier = next
            depth++
        }

        return { path, chain }
    }

    async getImpactAnalysis(ciId: string): Promise<{ affected: CiRecord[]; count: number; depth: number }> {
        const start = await this.cis.getById(ciId)
        if (!start) throw AppError.notFound('CI not found')

        const affected = new Set<string>()
        const visited = new Set<string>([start.id])
        let frontier = [start.id]
        let depth = 0

        // BFS for all downstream dependents
        while (frontier.length > 0) {
            const next: string[] = []
            for (const currentId of frontier) {
                const relationships = await this.rels.listByCi(currentId)
                for (const rel of relationships) {
                    // Get the node that depends on current node
                    const dependent = rel.toCiId === currentId ? rel.fromCiId : rel.toCiId
                    if (!visited.has(dependent)) {
                        visited.add(dependent)
                        affected.add(dependent)
                        next.push(dependent)
                    }
                }
            }
            frontier = next
            depth++
        }

        // Fetch affected CI details
        const affectedCis: CiRecord[] = []
        for (const ciId of affected) {
            const ci = await this.cis.getById(ciId)
            if (ci) affectedCis.push(ci)
        }

        return { affected: affectedCis, count: affected.size, depth }
    }

    private resolveNeighbor(
        rel: RelationshipRecord,
        currentId: string,
        direction: RelationshipDirection
    ): string | null {
        if (direction === 'downstream') {
            return rel.fromCiId === currentId ? rel.toCiId : null
        }
        if (direction === 'upstream') {
            return rel.toCiId === currentId ? rel.fromCiId : null
        }
        return rel.fromCiId === currentId ? rel.toCiId : rel.fromCiId
    }

    private async getRelType(id: string): Promise<RelationshipTypeRecord> {
        const relType = await this.relTypes.getById(id)
        if (!relType) throw AppError.notFound('Relationship type not found')
        return relType
    }

    private async getCi(id: string, message: string): Promise<CiRecord> {
        const ci = await this.cis.getById(id)
        if (!ci) throw AppError.notFound(message)
        return ci
    }

    private assertTypeAllowed(relType: RelationshipTypeRecord, from: CiRecord, to: CiRecord): void {
        if (relType.allowedFromTypeId && relType.allowedFromTypeId !== from.typeId) {
            throw AppError.badRequest('Source CI type not allowed')
        }
        if (relType.allowedToTypeId && relType.allowedToTypeId !== to.typeId) {
            throw AppError.badRequest('Target CI type not allowed')
        }
    }

    private async appendEvent(
        eventType: string,
        entityId: string,
        payload: Record<string, unknown>,
        ctx: CmdbContext
    ): Promise<void> {
        if (!this.opsEvents) return
        await this.opsEvents.append({
            entityType: 'cmdb_rel',
            entityId,
            eventType,
            payload,
            actorUserId: ctx.userId,
            correlationId: ctx.correlationId
        })
    }
}
