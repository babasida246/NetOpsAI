import { normalizeMac } from './parser.js'

export type SnmpRow = { oid: string; value: string }

export type SnmpIfTable = {
    ifNameByIndex: Map<number, string>
    ifMacByIndex: Map<number, string>
    ifSpeedByIndex: Map<number, number>
}

export type SnmpBridgeTable = {
    macToIfIndex: Map<string, number>
}

export type SnmpLldpTable = {
    neighbors: Array<{ localPortIndex: number; remoteChassis?: string; remotePort?: string; remoteSysName?: string }>
}

export type SnmpArpTable = {
    arp: Array<{ ifIndex: number; ip: string; mac?: string | null }>
}

function parseIndex(oid: string): number | null {
    const parts = oid.split('.')
    const last = parts[parts.length - 1]
    const value = Number(last)
    return Number.isFinite(value) ? value : null
}

function parseMacFromOid(oid: string): string | null {
    const parts = oid.split('.')
    const macParts = parts.slice(-6)
    if (macParts.length !== 6) return null
    return macParts.map((part) => Number(part).toString(16).padStart(2, '0')).join(':')
}

function parseIpFromOid(oid: string): string | null {
    const parts = oid.split('.')
    const ipParts = parts.slice(-4)
    if (ipParts.length !== 4) return null
    if (ipParts.some((part) => Number(part) > 255)) return null
    return ipParts.join('.')
}

export function parseIfMib(rows: SnmpRow[]): SnmpIfTable {
    const ifNameByIndex = new Map<number, string>()
    const ifMacByIndex = new Map<number, string>()
    const ifSpeedByIndex = new Map<number, number>()

    for (const row of rows) {
        if (row.oid.startsWith('1.3.6.1.2.1.2.2.1.2.')) {
            const idx = parseIndex(row.oid)
            if (idx !== null) ifNameByIndex.set(idx, row.value)
        } else if (row.oid.startsWith('1.3.6.1.2.1.2.2.1.6.')) {
            const idx = parseIndex(row.oid)
            const mac = normalizeMac(row.value)
            if (idx !== null && mac) ifMacByIndex.set(idx, mac)
        } else if (row.oid.startsWith('1.3.6.1.2.1.2.2.1.5.')) {
            const idx = parseIndex(row.oid)
            const speed = Number(row.value)
            if (idx !== null && Number.isFinite(speed)) ifSpeedByIndex.set(idx, speed)
        }
    }

    return { ifNameByIndex, ifMacByIndex, ifSpeedByIndex }
}

export function parseBridgeMib(rows: SnmpRow[]): SnmpBridgeTable {
    const macToBridgePort = new Map<string, number>()
    const bridgePortToIfIndex = new Map<number, number>()

    for (const row of rows) {
        if (row.oid.startsWith('1.3.6.1.2.1.17.4.3.1.2.')) {
            const mac = parseMacFromOid(row.oid)
            const bridgePort = Number(row.value)
            if (mac && Number.isFinite(bridgePort)) macToBridgePort.set(mac, bridgePort)
        } else if (row.oid.startsWith('1.3.6.1.2.1.17.1.4.1.2.')) {
            const bridgePort = parseIndex(row.oid)
            const ifIndex = Number(row.value)
            if (bridgePort !== null && Number.isFinite(ifIndex)) {
                bridgePortToIfIndex.set(bridgePort, ifIndex)
            }
        }
    }

    const macToIfIndex = new Map<string, number>()
    for (const [mac, bridgePort] of macToBridgePort.entries()) {
        const ifIndex = bridgePortToIfIndex.get(bridgePort)
        if (ifIndex !== undefined) macToIfIndex.set(mac, ifIndex)
    }

    return { macToIfIndex }
}

export function parseLldpMib(rows: SnmpRow[]): SnmpLldpTable {
    const neighbors = new Map<string, { localPortIndex: number; remoteChassis?: string; remotePort?: string; remoteSysName?: string }>()

    for (const row of rows) {
        if (row.oid.startsWith('1.0.8802.1.1.2.1.4.1.1.5.')) {
            const localPortIndex = parseIndex(row.oid)
            if (localPortIndex === null) continue
            const key = `${localPortIndex}`
            const entry = neighbors.get(key) || { localPortIndex }
            entry.remoteChassis = row.value
            neighbors.set(key, entry)
        } else if (row.oid.startsWith('1.0.8802.1.1.2.1.4.1.1.7.')) {
            const localPortIndex = parseIndex(row.oid)
            if (localPortIndex === null) continue
            const key = `${localPortIndex}`
            const entry = neighbors.get(key) || { localPortIndex }
            entry.remotePort = row.value
            neighbors.set(key, entry)
        } else if (row.oid.startsWith('1.0.8802.1.1.2.1.4.1.1.9.')) {
            const localPortIndex = parseIndex(row.oid)
            if (localPortIndex === null) continue
            const key = `${localPortIndex}`
            const entry = neighbors.get(key) || { localPortIndex }
            entry.remoteSysName = row.value
            neighbors.set(key, entry)
        }
    }

    return { neighbors: Array.from(neighbors.values()) }
}

export function parseArpTable(rows: SnmpRow[]): SnmpArpTable {
    const arp: Array<{ ifIndex: number; ip: string; mac?: string | null }> = []

    for (const row of rows) {
        if (!row.oid.startsWith('1.3.6.1.2.1.4.22.1.2.')) continue
        const parts = row.oid.split('.')
        const ifIndex = Number(parts[parts.length - 5])
        const ip = parseIpFromOid(row.oid)
        if (!Number.isFinite(ifIndex) || !ip) continue
        arp.push({ ifIndex, ip, mac: normalizeMac(row.value) })
    }

    return { arp }
}
