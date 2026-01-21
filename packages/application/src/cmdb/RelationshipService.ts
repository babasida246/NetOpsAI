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
