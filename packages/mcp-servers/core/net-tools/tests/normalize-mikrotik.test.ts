import { describe, it, expect } from 'vitest'
import { normalizeCliDatasets } from '../src/topology/normalize.js'
import { loadFixtureText } from '../src/utils/fixtures.js'
import { parseRouterOsDetailOutput } from '../src/utils/routeros.js'

const now = '2026-02-08T00:00:00.000Z'

describe('MikroTik parser', () => {
    it('parses bridge host and neighbor outputs', async () => {
        const bridgeRaw = await loadFixtureText('mikrotik_bridge_host.txt')
        const neighborRaw = await loadFixtureText('mikrotik_ip_neighbor.txt')
        const lldpRaw = await loadFixtureText('mikrotik_lldp_neighbors.txt')
        const arpRaw = await loadFixtureText('mikrotik_ip_arp.txt')
        const ifaceRaw = await loadFixtureText('mikrotik_interface_detail.txt')

        const datasets = [
            { deviceId: 'dev-1', datasetType: 'BRIDGE_HOST' as const, items: parseRouterOsDetailOutput(bridgeRaw) },
            { deviceId: 'dev-1', datasetType: 'IP_NEIGHBOR' as const, items: parseRouterOsDetailOutput(neighborRaw) },
            { deviceId: 'dev-1', datasetType: 'LLDP_NEIGHBORS' as const, items: parseRouterOsDetailOutput(lldpRaw) },
            { deviceId: 'dev-1', datasetType: 'IP_ARP' as const, items: parseRouterOsDetailOutput(arpRaw) },
            { deviceId: 'dev-1', datasetType: 'INTERFACE_DETAIL' as const, items: parseRouterOsDetailOutput(ifaceRaw) }
        ]

        const normalized = normalizeCliDatasets(datasets, now)

        expect(normalized.macLearnTable.length).toBeGreaterThan(0)
        expect(normalized.neighborsTable.length).toBeGreaterThan(0)
        expect(normalized.arpTable.length).toBeGreaterThan(0)
        expect(normalized.interfacesTable.length).toBeGreaterThan(0)
    })
})
