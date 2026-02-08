import type { DeviceInfo, TopologyEdgeDraft, TopologyGraphDraft, TopologyNodeDraft, TopologyPortDraft } from '../types.js'
import type { Evidence, EvidenceSource } from '../utils/types.js'
import type { NormalizedTables } from './normalize.js'
import { edgeKey } from '../utils/graph.js'
import { mapPortToKind } from '../utils/mappers.js'
import { nowIso } from '../utils/time.js'

const CONFIDENCE = {
    LLDP: 98,
    MNDP: 90,
    BRIDGE_HOST: 80,
    BRIDGE_FDB: 75,
    ARP: 60,
    NMAP: 55
}

type NodeIndex = {
    byIp: Map<string, string>
    byMac: Map<string, string>
    byName: Map<string, string>
}

function createNodeIndex(): NodeIndex {
    return { byIp: new Map(), byMac: new Map(), byName: new Map() }
}

function resolveNodeKey(node: TopologyNodeDraft, index: NodeIndex, nodes: Map<string, TopologyNodeDraft>): string {
    if (node.mgmtIp && index.byIp.has(node.mgmtIp)) return index.byIp.get(node.mgmtIp) as string
    if (node.hostname && index.byName.has(node.hostname)) return index.byName.get(node.hostname) as string
    if (node.macs) {
        for (const mac of node.macs) {
            if (index.byMac.has(mac)) return index.byMac.get(mac) as string
        }
    }

    const key = node.mgmtIp || node.hostname || `node_${nodes.size + 1}`
    nodes.set(key, { ...node, key })
    if (node.mgmtIp) index.byIp.set(node.mgmtIp, key)
    if (node.hostname) index.byName.set(node.hostname, key)
    if (node.macs) {
        for (const mac of node.macs) index.byMac.set(mac, key)
    }
    return key
}

export function buildTopologyGraph(
    tablesByDevice: Map<string, NormalizedTables>,
    devices: Map<string, DeviceInfo>,
    nmapHosts: Array<{ ip: string; openTcpPorts: number[]; hostname?: string }>
): TopologyGraphDraft {
    const nodes = new Map<string, TopologyNodeDraft>()
    const ports = new Map<string, TopologyPortDraft>()
    const edges = new Map<string, TopologyEdgeDraft>()
    const index = createNodeIndex()
    const now = nowIso()

    for (const device of devices.values()) {
        const node: TopologyNodeDraft = {
            kind: device.role === 'core' ? 'router' : 'switch',
            hostname: device.hostname ?? null,
            mgmtIp: device.mgmtIp ?? null,
            vendor: device.vendor ?? null,
            model: device.model ?? null,
            site: device.site ?? null,
            zone: device.zone ?? null,
            firstSeenAt: now,
            lastSeenAt: now
        }
        resolveNodeKey(node, index, nodes)
    }

    for (const [deviceId, tables] of tablesByDevice.entries()) {
        const device = devices.get(deviceId)
        if (!device) continue
        const nodeKey = resolveNodeKey({
            kind: device.role === 'core' ? 'router' : 'switch',
            hostname: device.hostname ?? null,
            mgmtIp: device.mgmtIp ?? null,
            vendor: device.vendor ?? null,
            model: device.model ?? null,
            site: device.site ?? null,
            zone: device.zone ?? null
        }, index, nodes)

        for (const iface of tables.interfacesTable) {
            const portKey = `${nodeKey}:${iface.ifName}`
            if (!ports.has(portKey)) {
                ports.set(portKey, {
                    nodeKey,
                    ifName: iface.ifName,
                    ifIndex: iface.ifIndex ?? null,
                    mac: iface.mac ?? null,
                    speed: iface.speed ?? null
                })
            }
        }

        for (const neighbor of tables.neighborsTable) {
            const remoteNode: TopologyNodeDraft = {
                kind: 'switch',
                hostname: neighbor.remoteName ?? null,
                mgmtIp: neighbor.remoteId ?? null,
                firstSeenAt: now,
                lastSeenAt: now,
                macs: neighbor.remoteMac ? [neighbor.remoteMac] : undefined
            }
            const remoteKey = resolveNodeKey(remoteNode, index, nodes)
            const key = edgeKey(nodeKey, neighbor.localPort, remoteKey, neighbor.remotePort)
            const neighborSource: EvidenceSource = neighbor.source === 'LLDP' ? 'LLDP' : 'MNDP'
            const evidence: Evidence[] = [{
                source: neighborSource,
                detail: {
                    localPort: neighbor.localPort,
                    remotePort: neighbor.remotePort,
                    remoteName: neighbor.remoteName,
                    remoteId: neighbor.remoteId
                },
                capturedAt: now
            }]
            edges.set(key, {
                aNodeKey: nodeKey,
                aPort: neighbor.localPort,
                bNodeKey: remoteKey,
                bPort: neighbor.remotePort ?? null,
                evidence,
                confidence: neighbor.source === 'LLDP' ? CONFIDENCE.LLDP : CONFIDENCE.MNDP,
                lastSeenAt: now
            })
        }

        const knownMacs = new Map<string, string>()
        for (const iface of tables.interfacesTable) {
            if (iface.mac) knownMacs.set(iface.mac, nodeKey)
        }

        for (const macLearn of tables.macLearnTable) {
            const remoteNodeId = knownMacs.get(macLearn.mac)
            if (remoteNodeId) {
                const key = edgeKey(nodeKey, macLearn.localPort, remoteNodeId, null)
                const evidence: Evidence[] = [{
                    source: 'BRIDGE_HOST',
                    detail: { mac: macLearn.mac, localPort: macLearn.localPort, vlan: macLearn.vlan },
                    capturedAt: now
                }]
                edges.set(key, {
                    aNodeKey: nodeKey,
                    aPort: macLearn.localPort,
                    bNodeKey: remoteNodeId,
                    bPort: null,
                    evidence,
                    confidence: CONFIDENCE.BRIDGE_HOST,
                    lastSeenAt: now
                })
            } else {
                const endpointNode: TopologyNodeDraft = {
                    kind: 'unknown',
                    hostname: null,
                    mgmtIp: null,
                    firstSeenAt: now,
                    lastSeenAt: now,
                    macs: [macLearn.mac]
                }
                const endpointKey = resolveNodeKey(endpointNode, index, nodes)
                const key = edgeKey(nodeKey, macLearn.localPort, endpointKey, null)
                edges.set(key, {
                    aNodeKey: nodeKey,
                    aPort: macLearn.localPort,
                    bNodeKey: endpointKey,
                    bPort: null,
                    evidence: [{
                        source: 'BRIDGE_HOST',
                        detail: { mac: macLearn.mac, localPort: macLearn.localPort },
                        capturedAt: now
                    }],
                    confidence: CONFIDENCE.BRIDGE_HOST,
                    lastSeenAt: now
                })
            }
        }

        for (const arp of tables.arpTable) {
            if (!arp.mac) continue
            const endpointNode: TopologyNodeDraft = {
                kind: 'unknown',
                hostname: null,
                mgmtIp: arp.ip,
                firstSeenAt: now,
                lastSeenAt: now,
                macs: [arp.mac]
            }
            const endpointKey = resolveNodeKey(endpointNode, index, nodes)
            const key = edgeKey(nodeKey, arp.iface, endpointKey, null)
            const evidence: Evidence[] = [{
                source: 'ARP',
                detail: { ip: arp.ip, mac: arp.mac, iface: arp.iface },
                capturedAt: now
            }]
            if (!edges.has(key)) {
                edges.set(key, {
                    aNodeKey: nodeKey,
                    aPort: arp.iface,
                    bNodeKey: endpointKey,
                    bPort: null,
                    evidence,
                    confidence: CONFIDENCE.ARP,
                    lastSeenAt: now
                })
            }
        }
    }

    for (const host of nmapHosts) {
        const kind = mapPortToKind(host.openTcpPorts)
        const node: TopologyNodeDraft = {
            kind,
            hostname: host.hostname ?? null,
            mgmtIp: host.ip,
            firstSeenAt: now,
            lastSeenAt: now
        }
        resolveNodeKey(node, index, nodes)
    }

    return {
        nodes: Array.from(nodes.values()),
        ports: Array.from(ports.values()),
        edges: Array.from(edges.values())
    }
}
