import type { PgClient } from '@infra/postgres'
import type { TopologyEdgeDraft, TopologyNodeDraft, TopologyPortDraft, TopologyStore } from '@mcp/net-tools'

export type TopologyNodeRecord = {
    id: string
    kind: TopologyNodeDraft['kind']
    hostname?: string | null
    mgmtIp?: string | null
    vendor?: string | null
    model?: string | null
    site?: string | null
    zone?: string | null
    firstSeenAt: string
    lastSeenAt: string
}

export type TopologyEdgeRecord = {
    id: string
    aNodeId: string
    aPort: string
    bNodeId: string
    bPort?: string | null
    confidence: number
    evidence: any[]
    lastSeenAt: string
}

export type TopologyGraph = {
    nodes: TopologyNodeRecord[]
    edges: Array<{
        id: string
        a: { nodeId: string; port: string }
        b: { nodeId: string; port?: string | null }
        confidence: number
        evidenceCount: number
        lastSeenAt: string
    }>
}

export class TopologyRepository implements TopologyStore {
    constructor(private pg: PgClient) { }

    async upsertNodes(nodes: TopologyNodeDraft[]): Promise<TopologyNodeDraft[]> {
        const results: TopologyNodeDraft[] = []
        for (const node of nodes) {
            if (node.id) {
                const updated = await this.pg.query(
                    `UPDATE topology_nodes
                     SET kind = $2,
                         hostname = $3,
                         mgmt_ip = $4,
                         vendor = $5,
                         model = $6,
                         site = $7,
                         zone = $8,
                         last_seen_at = NOW()
                     WHERE id = $1
                     RETURNING id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at`,
                    [
                        node.id,
                        node.kind,
                        node.hostname ?? null,
                        node.mgmtIp ?? null,
                        node.vendor ?? null,
                        node.model ?? null,
                        node.site ?? null,
                        node.zone ?? null
                    ]
                )
                if (updated.rows[0]) results.push({ ...this.mapNode(updated.rows[0]), key: node.key })
                continue
            }

            if (node.mgmtIp) {
                const result = await this.pg.query(
                    `INSERT INTO topology_nodes (kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), NOW())
                     ON CONFLICT (mgmt_ip) DO UPDATE SET
                        kind = EXCLUDED.kind,
                        hostname = COALESCE(EXCLUDED.hostname, topology_nodes.hostname),
                        vendor = COALESCE(EXCLUDED.vendor, topology_nodes.vendor),
                        model = COALESCE(EXCLUDED.model, topology_nodes.model),
                        site = COALESCE(EXCLUDED.site, topology_nodes.site),
                        zone = COALESCE(EXCLUDED.zone, topology_nodes.zone),
                        last_seen_at = NOW()
                     RETURNING id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at`,
                    [
                        node.kind,
                        node.hostname ?? null,
                        node.mgmtIp ?? null,
                        node.vendor ?? null,
                        node.model ?? null,
                        node.site ?? null,
                        node.zone ?? null
                    ]
                )
                if (result.rows[0]) results.push({ ...this.mapNode(result.rows[0]), key: node.key })
                continue
            }

            if (node.hostname) {
                const existing = await this.pg.query(
                    `SELECT id FROM topology_nodes WHERE hostname = $1 LIMIT 1`,
                    [node.hostname]
                )
                if (existing.rows[0]) {
                    const updated = await this.pg.query(
                        `UPDATE topology_nodes
                         SET kind = $2,
                             vendor = $3,
                             model = $4,
                             site = $5,
                             zone = $6,
                             last_seen_at = NOW()
                         WHERE id = $1
                         RETURNING id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at`,
                        [
                            existing.rows[0].id,
                            node.kind,
                            node.vendor ?? null,
                            node.model ?? null,
                            node.site ?? null,
                            node.zone ?? null
                        ]
                    )
                    if (updated.rows[0]) results.push({ ...this.mapNode(updated.rows[0]), key: node.key })
                    continue
                }
            }

            const inserted = await this.pg.query(
                `INSERT INTO topology_nodes (kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), NOW())
                 RETURNING id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at`,
                [
                    node.kind,
                    node.hostname ?? null,
                    node.mgmtIp ?? null,
                    node.vendor ?? null,
                    node.model ?? null,
                    node.site ?? null,
                    node.zone ?? null
                ]
            )
            if (inserted.rows[0]) results.push({ ...this.mapNode(inserted.rows[0]), key: node.key })
        }

        return results
    }

    async upsertPorts(ports: TopologyPortDraft[]): Promise<TopologyPortDraft[]> {
        const results: TopologyPortDraft[] = []
        for (const port of ports) {
            if (!port.nodeId) continue
            const result = await this.pg.query(
                `INSERT INTO topology_ports (node_id, if_name, if_index, mac, speed, extra)
                 VALUES ($1,$2,$3,$4,$5,$6)
                 ON CONFLICT (node_id, if_name) DO UPDATE SET
                    if_index = EXCLUDED.if_index,
                    mac = EXCLUDED.mac,
                    speed = EXCLUDED.speed,
                    extra = EXCLUDED.extra,
                    updated_at = NOW()
                 RETURNING id, node_id, if_name, if_index, mac, speed, extra`,
                [
                    port.nodeId,
                    port.ifName,
                    port.ifIndex ?? null,
                    port.mac ?? null,
                    port.speed ?? null,
                    port.extra ?? null
                ]
            )
            if (result.rows[0]) {
                results.push({
                    id: result.rows[0].id,
                    nodeId: result.rows[0].node_id,
                    ifName: result.rows[0].if_name,
                    ifIndex: result.rows[0].if_index,
                    mac: result.rows[0].mac,
                    speed: result.rows[0].speed,
                    extra: result.rows[0].extra
                })
            }
        }
        return results
    }

    async upsertEdges(edges: TopologyEdgeDraft[]): Promise<TopologyEdgeDraft[]> {
        const results: TopologyEdgeDraft[] = []
        for (const edge of edges) {
            if (!edge.aNodeId || !edge.bNodeId) continue
            const result = await this.pg.query(
                `INSERT INTO topology_edges (a_node_id, a_port, b_node_id, b_port, evidence, confidence, last_seen_at)
                 VALUES ($1,$2,$3,$4,$5,$6, NOW())
                 ON CONFLICT (a_node_id, a_port, b_node_id, b_port) DO UPDATE SET
                    evidence = topology_edges.evidence || EXCLUDED.evidence,
                    confidence = GREATEST(topology_edges.confidence, EXCLUDED.confidence),
                    last_seen_at = NOW(),
                    updated_at = NOW()
                 RETURNING id, a_node_id, a_port, b_node_id, b_port, evidence, confidence, last_seen_at`,
                [
                    edge.aNodeId,
                    edge.aPort,
                    edge.bNodeId,
                    edge.bPort ?? null,
                    JSON.stringify(edge.evidence ?? []),
                    edge.confidence
                ]
            )
            if (result.rows[0]) {
                results.push({
                    id: result.rows[0].id,
                    aNodeId: result.rows[0].a_node_id,
                    aPort: result.rows[0].a_port,
                    bNodeId: result.rows[0].b_node_id,
                    bPort: result.rows[0].b_port,
                    confidence: result.rows[0].confidence,
                    evidence: result.rows[0].evidence,
                    lastSeenAt: result.rows[0].last_seen_at
                })
            }
        }
        return results
    }

    async getGraph(filters: { site?: string; zone?: string; since?: string }): Promise<TopologyGraph> {
        const conditions: string[] = ['1=1']
        const params: any[] = []
        let idx = 1

        if (filters.site) {
            conditions.push(`site = $${idx++}`)
            params.push(filters.site)
        }
        if (filters.zone) {
            conditions.push(`zone = $${idx++}`)
            params.push(filters.zone)
        }
        if (filters.since) {
            conditions.push(`last_seen_at >= $${idx++}`)
            params.push(filters.since)
        }

        const nodesResult = await this.pg.query(
            `SELECT id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at
             FROM topology_nodes
             WHERE ${conditions.join(' AND ')}`,
            params
        )

        const nodes = nodesResult.rows.map((row: Record<string, any>) => this.mapNode(row))
        const nodeIds = nodes.map((node: TopologyNodeRecord) => node.id)

        if (nodeIds.length === 0) {
            return { nodes: [], edges: [] }
        }

        const edgeResult = await this.pg.query(
            `SELECT id, a_node_id, a_port, b_node_id, b_port, confidence, evidence, last_seen_at,
                    jsonb_array_length(evidence) as evidence_count
             FROM topology_edges
             WHERE a_node_id = ANY($1) AND b_node_id = ANY($1)`,
            [nodeIds]
        )

        const edges = edgeResult.rows.map((row: Record<string, any>) => ({
            id: row.id,
            a: { nodeId: row.a_node_id, port: row.a_port },
            b: { nodeId: row.b_node_id, port: row.b_port },
            confidence: row.confidence,
            evidenceCount: Number(row.evidence_count ?? 0),
            lastSeenAt: row.last_seen_at
        }))

        return { nodes, edges }
    }

    async getNodeDetail(id: string): Promise<{ node: TopologyNodeRecord; ports: TopologyPortDraft[]; edges: TopologyEdgeRecord[] } | null> {
        const nodeResult = await this.pg.query(
            `SELECT id, kind, hostname, mgmt_ip, vendor, model, site, zone, first_seen_at, last_seen_at
             FROM topology_nodes WHERE id = $1`,
            [id]
        )
        if (!nodeResult.rows[0]) return null
        const node = this.mapNode(nodeResult.rows[0])

        const portsResult = await this.pg.query(
            `SELECT id, node_id, if_name, if_index, mac, speed, extra
             FROM topology_ports WHERE node_id = $1`,
            [id]
        )

        const edgesResult = await this.pg.query(
            `SELECT id, a_node_id, a_port, b_node_id, b_port, confidence, evidence, last_seen_at
             FROM topology_edges WHERE a_node_id = $1 OR b_node_id = $1`,
            [id]
        )

        return {
            node,
            ports: portsResult.rows.map((row: Record<string, any>) => ({
                id: row.id,
                nodeId: row.node_id,
                ifName: row.if_name,
                ifIndex: row.if_index,
                mac: row.mac,
                speed: row.speed,
                extra: row.extra
            })),
            edges: edgesResult.rows.map((row: Record<string, any>) => ({
                id: row.id,
                aNodeId: row.a_node_id,
                aPort: row.a_port,
                bNodeId: row.b_node_id,
                bPort: row.b_port,
                confidence: row.confidence,
                evidence: row.evidence,
                lastSeenAt: row.last_seen_at
            }))
        }
    }

    async getEdgeDetail(id: string): Promise<TopologyEdgeRecord | null> {
        const result = await this.pg.query(
            `SELECT id, a_node_id, a_port, b_node_id, b_port, confidence, evidence, last_seen_at
             FROM topology_edges WHERE id = $1`,
            [id]
        )
        if (!result.rows[0]) return null
        return {
            id: result.rows[0].id,
            aNodeId: result.rows[0].a_node_id,
            aPort: result.rows[0].a_port,
            bNodeId: result.rows[0].b_node_id,
            bPort: result.rows[0].b_port,
            confidence: result.rows[0].confidence,
            evidence: result.rows[0].evidence,
            lastSeenAt: result.rows[0].last_seen_at
        }
    }

    private mapNode(row: any): TopologyNodeRecord {
        const kind = (row.kind ?? 'unknown') as TopologyNodeDraft['kind']
        return {
            id: row.id,
            kind,
            hostname: row.hostname,
            mgmtIp: row.mgmt_ip,
            vendor: row.vendor,
            model: row.model,
            site: row.site,
            zone: row.zone,
            firstSeenAt: row.first_seen_at?.toISOString ? row.first_seen_at.toISOString() : row.first_seen_at,
            lastSeenAt: row.last_seen_at?.toISOString ? row.last_seen_at.toISOString() : row.last_seen_at
        }
    }
}
