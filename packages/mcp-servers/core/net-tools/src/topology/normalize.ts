import type { SnmpRow } from '../utils/snmp-parse.js'
import { parseIfMib, parseBridgeMib, parseLldpMib, parseArpTable } from '../utils/snmp-parse.js'
import { normalizeMac } from '../utils/parser.js'

export type CliDataset = {
    deviceId: string
    datasetType: 'BRIDGE_HOST' | 'IP_NEIGHBOR' | 'LLDP_NEIGHBORS' | 'IP_ARP' | 'INTERFACE_DETAIL'
    items: Array<Record<string, string>>
}

export type SnmpDataset = {
    target: string
    oidGroup: 'IF_MIB' | 'BRIDGE_MIB' | 'LLDP_MIB' | 'IP_MIB_ARP'
    rows: SnmpRow[]
}

export type MacLearnEntry = {
    deviceId: string
    localPort: string
    mac: string
    vlan?: string | null
    lastSeenAt: string
}

export type NeighborEntry = {
    deviceId: string
    localPort: string
    remoteId?: string
    remoteMac?: string | null
    remotePort?: string | null
    remoteName?: string | null
    source: 'LLDP' | 'MNDP'
}

export type ArpEntry = {
    deviceId: string
    ip: string
    mac?: string | null
    iface: string
}

export type InterfaceEntry = {
    deviceId: string
    ifName: string
    mac?: string | null
    ifIndex?: number | null
    speed?: number | null
}

export type NormalizedTables = {
    macLearnTable: MacLearnEntry[]
    neighborsTable: NeighborEntry[]
    arpTable: ArpEntry[]
    interfacesTable: InterfaceEntry[]
}

export function normalizeCliDatasets(cliDatasets: CliDataset[], nowIso: string): NormalizedTables {
    const macLearnTable: MacLearnEntry[] = []
    const neighborsTable: NeighborEntry[] = []
    const arpTable: ArpEntry[] = []
    const interfacesTable: InterfaceEntry[] = []

    for (const dataset of cliDatasets) {
        if (dataset.datasetType === 'BRIDGE_HOST') {
            for (const item of dataset.items) {
                const mac = normalizeMac(item['mac-address'])
                const localPort = item['on-interface'] || item['interface']
                if (!mac || !localPort) continue
                macLearnTable.push({
                    deviceId: dataset.deviceId,
                    localPort,
                    mac,
                    vlan: item['vlan-id'] || null,
                    lastSeenAt: nowIso
                })
            }
        }

        if (dataset.datasetType === 'IP_NEIGHBOR') {
            for (const item of dataset.items) {
                const localPort = item['interface']
                if (!localPort) continue
                neighborsTable.push({
                    deviceId: dataset.deviceId,
                    localPort,
                    remoteId: item['address'],
                    remoteMac: normalizeMac(item['mac-address']),
                    remoteName: item['identity'],
                    remotePort: item['interface'],
                    source: 'MNDP'
                })
            }
        }

        if (dataset.datasetType === 'LLDP_NEIGHBORS') {
            for (const item of dataset.items) {
                const localPort = item['interface'] || item['local-interface']
                if (!localPort) continue
                neighborsTable.push({
                    deviceId: dataset.deviceId,
                    localPort,
                    remoteId: item['remote-chassis-id'],
                    remoteMac: normalizeMac(item['remote-chassis-id'] || item['remote-chassis-mac'] || item['remote-mac']),
                    remoteName: item['remote-system-name'],
                    remotePort: item['remote-port-id'],
                    source: 'LLDP'
                })
            }
        }

        if (dataset.datasetType === 'IP_ARP') {
            for (const item of dataset.items) {
                const ip = item['address']
                const iface = item['interface']
                if (!ip || !iface) continue
                arpTable.push({
                    deviceId: dataset.deviceId,
                    ip,
                    mac: normalizeMac(item['mac-address']),
                    iface
                })
            }
        }

        if (dataset.datasetType === 'INTERFACE_DETAIL') {
            for (const item of dataset.items) {
                const ifName = item['name']
                if (!ifName) continue
                interfacesTable.push({
                    deviceId: dataset.deviceId,
                    ifName,
                    mac: normalizeMac(item['mac-address']),
                    speed: item['speed'] ? Number(item['speed']) : undefined
                })
            }
        }
    }

    return { macLearnTable, neighborsTable, arpTable, interfacesTable }
}

export function normalizeSnmpDatasets(snmpDatasets: SnmpDataset[], deviceId: string, nowIso: string): NormalizedTables {
    const macLearnTable: MacLearnEntry[] = []
    const neighborsTable: NeighborEntry[] = []
    const arpTable: ArpEntry[] = []
    const interfacesTable: InterfaceEntry[] = []

    const ifMib = snmpDatasets.find(d => d.oidGroup === 'IF_MIB')
    const bridgeMib = snmpDatasets.find(d => d.oidGroup === 'BRIDGE_MIB')
    const lldpMib = snmpDatasets.find(d => d.oidGroup === 'LLDP_MIB')
    const arpMib = snmpDatasets.find(d => d.oidGroup === 'IP_MIB_ARP')

    if (ifMib) {
        const ifTable = parseIfMib(ifMib.rows)
        for (const [ifIndex, ifName] of ifTable.ifNameByIndex.entries()) {
            interfacesTable.push({
                deviceId,
                ifName,
                ifIndex,
                mac: ifTable.ifMacByIndex.get(ifIndex) ?? null,
                speed: ifTable.ifSpeedByIndex.get(ifIndex) ?? null
            })
        }
    }

    if (bridgeMib && ifMib) {
        const ifTable = parseIfMib(ifMib.rows)
        const bridge = parseBridgeMib(bridgeMib.rows)
        for (const [mac, ifIndex] of bridge.macToIfIndex.entries()) {
            const ifName = ifTable.ifNameByIndex.get(ifIndex)
            if (!ifName) continue
            macLearnTable.push({
                deviceId,
                localPort: ifName,
                mac,
                lastSeenAt: nowIso
            })
        }
    }

    if (lldpMib && ifMib) {
        const ifTable = parseIfMib(ifMib.rows)
        const lldp = parseLldpMib(lldpMib.rows)
        for (const entry of lldp.neighbors) {
            const ifName = ifTable.ifNameByIndex.get(entry.localPortIndex)
            if (!ifName) continue
            neighborsTable.push({
                deviceId,
                localPort: ifName,
                remoteId: entry.remoteChassis,
                remoteName: entry.remoteSysName,
                remotePort: entry.remotePort,
                source: 'LLDP'
            })
        }
    }

    if (arpMib && ifMib) {
        const ifTable = parseIfMib(ifMib.rows)
        const arp = parseArpTable(arpMib.rows)
        for (const entry of arp.arp) {
            const ifName = ifTable.ifNameByIndex.get(entry.ifIndex)
            if (!ifName) continue
            arpTable.push({
                deviceId,
                ip: entry.ip,
                mac: entry.mac,
                iface: ifName
            })
        }
    }

    return { macLearnTable, neighborsTable, arpTable, interfacesTable }
}
