import { describe, it, expect } from 'vitest'
import { normalizeSnmpDatasets } from '../src/topology/normalize.js'
import { loadFixtureJson } from '../src/utils/fixtures.js'

const now = '2026-02-08T00:00:00.000Z'

describe('SNMP parser', () => {
    it('parses IF/BRIDGE/LLDP/ARP rows', async () => {
        const ifRows = await loadFixtureJson<{ oid: string; value: string }[]>('snmp_if_mib.json')
        const bridgeRows = await loadFixtureJson<{ oid: string; value: string }[]>('snmp_bridge_mib.json')
        const lldpRows = await loadFixtureJson<{ oid: string; value: string }[]>('snmp_lldp_mib.json')
        const arpRows = await loadFixtureJson<{ oid: string; value: string }[]>('snmp_ip_mib_arp.json')

        const normalized = normalizeSnmpDatasets([
            { target: '10.0.0.1', oidGroup: 'IF_MIB', rows: ifRows },
            { target: '10.0.0.1', oidGroup: 'BRIDGE_MIB', rows: bridgeRows },
            { target: '10.0.0.1', oidGroup: 'LLDP_MIB', rows: lldpRows },
            { target: '10.0.0.1', oidGroup: 'IP_MIB_ARP', rows: arpRows }
        ], 'dev-1', now)

        expect(normalized.interfacesTable.length).toBeGreaterThan(0)
        expect(normalized.macLearnTable.length).toBeGreaterThan(0)
        expect(normalized.neighborsTable.length).toBeGreaterThan(0)
        expect(normalized.arpTable.length).toBeGreaterThan(0)
    })
})
